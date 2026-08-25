import { randomUUID } from "node:crypto";

import { eq } from "drizzle-orm";

import { getDb } from "@/lib/db";
import { companies, meetingCompanies, meetings, type Meeting } from "@/lib/db/schema";
import { collectMeetingAttendeesForCompanies } from "@/lib/meeting-attendees";
import { checkFranchiseMeetingConflict, MeetingConflictError } from "@/lib/meeting-conflicts";
import { MeetingSyncError } from "@/lib/meeting-sync";
import { syncMeeting } from "@/lib/n8n/sync-meeting";
import {
  listCompanies,
  type CompanyWithRelations,
} from "@/lib/services/companies";
import { updateFranchiseEmail } from "@/lib/services/franchises";

export type MeetingCompanySummary = {
  id: string;
  razaoSocial: string;
  cnpj: string;
};

export type FranchiseMeeting = Meeting & {
  companies: MeetingCompanySummary[];
};

export type UpdateFranchiseMeetingInput = {
  scheduledAt?: string | null;
  durationMin?: number;
  notes?: string | null;
  franqueadoEmail?: string | null;
  syncWithCalendar?: boolean;
  saveFranchiseEmail?: boolean;
  acknowledgeConflict?: boolean;
};

export async function listFranchiseMeetingsMap(): Promise<Map<string, FranchiseMeeting>> {
  const db = getDb();
  const rows = await db.query.meetings.findMany({
    with: {
      meetingCompanies: {
        with: {
          company: true,
        },
      },
    },
  });

  const map = new Map<string, FranchiseMeeting>();
  for (const row of rows) {
    map.set(row.franchiseId, mapMeetingRow(row));
  }

  return map;
}

function mapMeetingRow(row: {
  id: string;
  franchiseId: string;
  scheduledAt: string | null;
  durationMin: number;
  franqueadoEmail: string | null;
  notes: string | null;
  calendarEventId: string | null;
  syncStatus: string;
  meetingCompanies: Array<{
    company: { id: string; razaoSocial: string; cnpj: string };
  }>;
}): FranchiseMeeting {
  return {
    id: row.id,
    franchiseId: row.franchiseId,
    scheduledAt: row.scheduledAt,
    durationMin: row.durationMin,
    franqueadoEmail: row.franqueadoEmail,
    notes: row.notes,
    calendarEventId: row.calendarEventId,
    syncStatus: row.syncStatus,
    companies: row.meetingCompanies.map((item) => ({
      id: item.company.id,
      razaoSocial: item.company.razaoSocial,
      cnpj: item.company.cnpj,
    })),
  };
}

export async function getFranchiseMeeting(franchiseId: string): Promise<FranchiseMeeting | null> {
  const db = getDb();
  const row = await db.query.meetings.findFirst({
    where: eq(meetings.franchiseId, franchiseId),
    with: {
      meetingCompanies: {
        with: {
          company: true,
        },
      },
    },
  });

  return row ? mapMeetingRow(row) : null;
}

export async function getEffectiveEntryCompaniesForFranchise(
  franchiseId: string,
): Promise<CompanyWithRelations[]> {
  const franchiseCompanies = await listCompanies({
    franchiseId,
    effectiveEntryOnly: true,
  });

  return franchiseCompanies.sort((a, b) => a.razaoSocial.localeCompare(b.razaoSocial, "pt-BR"));
}

async function syncMeetingCompanies(
  meetingId: string,
  franchiseCompanies: CompanyWithRelations[],
): Promise<void> {
  const db = getDb();
  const companyIds = new Set(franchiseCompanies.map((company) => company.id));

  const existingLinks = await db.query.meetingCompanies.findMany({
    where: eq(meetingCompanies.meetingId, meetingId),
  });

  for (const link of existingLinks) {
    if (!companyIds.has(link.companyId)) {
      await db.delete(meetingCompanies).where(eq(meetingCompanies.id, link.id));
    }
  }

  for (const company of franchiseCompanies) {
    const existing = existingLinks.find((link) => link.companyId === company.id);
    if (existing) continue;

    await db.insert(meetingCompanies).values({
      id: randomUUID(),
      meetingId,
      companyId: company.id,
    });
  }
}

export async function updateFranchiseMeeting(
  franchiseId: string,
  input: UpdateFranchiseMeetingInput,
): Promise<FranchiseMeeting | null> {
  const db = getDb();
  const franchiseCompanies = await getEffectiveEntryCompaniesForFranchise(franchiseId);

  if (franchiseCompanies.length === 0) {
    throw new Error("Nenhuma empresa com entrada efetiva encontrada para esta franquia.");
  }

  const franchise = franchiseCompanies[0]?.franchise;
  if (!franchise) {
    throw new Error("Franquia não encontrada.");
  }

  const existing = await getFranchiseMeeting(franchiseId);
  const meetingId = existing?.id ?? randomUUID();

  const scheduledAt =
    input.scheduledAt === undefined ? (existing?.scheduledAt ?? null) : input.scheduledAt;

  const durationMin = input.durationMin ?? existing?.durationMin ?? 60;
  const notes = input.notes === undefined ? (existing?.notes ?? null) : input.notes;
  const franqueadoEmail =
    input.franqueadoEmail === undefined
      ? (existing?.franqueadoEmail ?? null)
      : input.franqueadoEmail?.trim() || null;

  if (!scheduledAt && !franqueadoEmail) {
    if (existing) {
      await db.delete(meetings).where(eq(meetings.id, existing.id));
    }
    return null;
  }

  if (scheduledAt) {
    const conflict = await checkFranchiseMeetingConflict({
      franchiseId,
      companies: franchiseCompanies,
      scheduledAt,
      durationMin,
      excludeMeetingId: existing?.id,
      excludeCalendarEventId: existing?.calendarEventId,
    });

    if (conflict.conflict && !input.acknowledgeConflict) {
      throw new MeetingConflictError(
        conflict.reason ??
          "Já existe outro agendamento neste horário para o mesmo responsável do setor.",
        conflict,
      );
    }
  }

  const syncStatus =
    input.syncWithCalendar && scheduledAt ? "pending" : (existing?.syncStatus ?? "none");

  if (existing) {
    await db
      .update(meetings)
      .set({
        scheduledAt,
        durationMin,
        notes,
        franqueadoEmail,
        syncStatus,
      })
      .where(eq(meetings.id, existing.id));
  } else {
    await db.insert(meetings).values({
      id: meetingId,
      franchiseId,
      scheduledAt,
      durationMin,
      notes,
      franqueadoEmail,
      syncStatus,
    });
  }

  await syncMeetingCompanies(meetingId, franchiseCompanies);

  if (franqueadoEmail && input.saveFranchiseEmail) {
    await updateFranchiseEmail(franchiseId, franqueadoEmail);
  }

  const updated = await getFranchiseMeeting(franchiseId);
  if (!updated?.scheduledAt || !input.syncWithCalendar) {
    return updated;
  }

  const attendees = await collectMeetingAttendeesForCompanies(
    franchiseCompanies,
    franqueadoEmail,
  );

  const result = await syncMeeting({
    meetingId: updated.id,
    franchise: franchise.name,
    companies: franchiseCompanies.map((company) => ({
      name: company.razaoSocial,
      cnpj: company.cnpj,
    })),
    scheduledAt: updated.scheduledAt,
    durationMinutes: updated.durationMin,
    notes: updated.notes,
    attendees,
    calendarEventId: updated.calendarEventId,
  });

  await db
    .update(meetings)
    .set({
      syncStatus: result.syncStatus,
      calendarEventId: result.calendarEventId ?? updated.calendarEventId,
    })
    .where(eq(meetings.id, updated.id));

  const syncedMeeting = await getFranchiseMeeting(franchiseId);

  if (!result.ok) {
    throw new MeetingSyncError(
      result.error ?? "Não foi possível sincronizar a reunião com o Google Agenda.",
      syncedMeeting ?? updated,
    );
  }

  return syncedMeeting;
}

export async function ensureFranchiseMeetingCompanies(franchiseId: string): Promise<void> {
  const meeting = await getFranchiseMeeting(franchiseId);
  if (!meeting) return;

  const franchiseCompanies = await getEffectiveEntryCompaniesForFranchise(franchiseId);
  await syncMeetingCompanies(meeting.id, franchiseCompanies);
}
