import { randomUUID } from "node:crypto";

import { createClient } from "@libsql/client";
import path from "node:path";

type LegacyMeetingRow = {
  id: string;
  company_id: string;
  scheduled_at: string | null;
  duration_min: number;
  franqueado_email: string | null;
  notes: string | null;
  calendar_event_id: string | null;
  sync_status: string;
  franchise_id: string;
};

function pickPreferredMeeting(rows: LegacyMeetingRow[]): LegacyMeetingRow {
  const withCalendar = rows.find((row) => row.calendar_event_id);
  if (withCalendar) return withCalendar;

  const withSchedule = rows
    .filter((row) => row.scheduled_at)
    .sort((a, b) => new Date(b.scheduled_at!).getTime() - new Date(a.scheduled_at!).getTime());

  if (withSchedule[0]) return withSchedule[0];

  return rows[0];
}

async function main() {
  const url = `file:${path.resolve(process.cwd(), "data/local.db")}`;
  const client = createClient({ url });

  const info = await client.execute("PRAGMA table_info(meetings)");
  const columns = new Set(info.rows.map((row) => String(row.name)));

  if (columns.has("franchise_id")) {
    const junctionInfo = await client.execute("PRAGMA table_info(meeting_companies)");
    if (junctionInfo.rows.length > 0) {
      console.log("Meetings already migrated to franchise model.");
      return;
    }
  }

  if (!columns.has("company_id")) {
    console.log("No legacy meetings table found. Creating meeting_companies if needed.");
    await client.execute(`
      CREATE TABLE IF NOT EXISTS meeting_companies (
        id TEXT PRIMARY KEY,
        meeting_id TEXT NOT NULL REFERENCES meetings(id) ON DELETE CASCADE,
        company_id TEXT NOT NULL UNIQUE REFERENCES companies(id) ON DELETE CASCADE
      )
    `);
    console.log("meeting_companies table ready.");
    return;
  }

  const legacyRows = await client.execute(`
    SELECT
      m.id,
      m.company_id,
      m.scheduled_at,
      m.duration_min,
      m.franqueado_email,
      m.notes,
      m.calendar_event_id,
      m.sync_status,
      c.franchise_id
    FROM meetings m
    INNER JOIN companies c ON c.id = m.company_id
  `);

  const legacyMeetings = legacyRows.rows.map((row) => ({
    id: String(row.id),
    company_id: String(row.company_id),
    scheduled_at: row.scheduled_at ? String(row.scheduled_at) : null,
    duration_min: Number(row.duration_min ?? 60),
    franqueado_email: row.franqueado_email ? String(row.franqueado_email) : null,
    notes: row.notes ? String(row.notes) : null,
    calendar_event_id: row.calendar_event_id ? String(row.calendar_event_id) : null,
    sync_status: String(row.sync_status ?? "none"),
    franchise_id: String(row.franchise_id),
  })) satisfies LegacyMeetingRow[];

  await client.execute("ALTER TABLE meetings RENAME TO meetings_legacy");

  await client.execute(`
    CREATE TABLE meetings (
      id TEXT PRIMARY KEY,
      franchise_id TEXT NOT NULL UNIQUE REFERENCES franchises(id) ON DELETE CASCADE,
      scheduled_at TEXT,
      duration_min INTEGER NOT NULL DEFAULT 60,
      franqueado_email TEXT,
      notes TEXT,
      calendar_event_id TEXT,
      sync_status TEXT NOT NULL DEFAULT 'none'
    )
  `);

  await client.execute(`
    CREATE TABLE meeting_companies (
      id TEXT PRIMARY KEY,
      meeting_id TEXT NOT NULL REFERENCES meetings(id) ON DELETE CASCADE,
      company_id TEXT NOT NULL UNIQUE REFERENCES companies(id) ON DELETE CASCADE
    )
  `);

  const byFranchise = new Map<string, LegacyMeetingRow[]>();
  for (const row of legacyMeetings) {
    const group = byFranchise.get(row.franchise_id) ?? [];
    group.push(row);
    byFranchise.set(row.franchise_id, group);
  }

  for (const [franchiseId, rows] of byFranchise) {
    const preferred = pickPreferredMeeting(rows);
    const meetingId = preferred.id;

    await client.execute({
      sql: `INSERT INTO meetings (
        id, franchise_id, scheduled_at, duration_min, franqueado_email, notes, calendar_event_id, sync_status
      ) VALUES (?, ?, ?, ?, ?, ?, ?, ?)`,
      args: [
        meetingId,
        franchiseId,
        preferred.scheduled_at,
        preferred.duration_min,
        preferred.franqueado_email,
        preferred.notes,
        preferred.calendar_event_id,
        preferred.sync_status,
      ],
    });

    for (const row of rows) {
      await client.execute({
        sql: "INSERT INTO meeting_companies (id, meeting_id, company_id) VALUES (?, ?, ?)",
        args: [randomUUID(), meetingId, row.company_id],
      });
    }
  }

  await client.execute("DROP TABLE meetings_legacy");
  console.log(`Migrated ${byFranchise.size} franchise meeting(s) from legacy company model.`);
}

main().catch((error) => {
  console.error(error);
  process.exit(1);
});
