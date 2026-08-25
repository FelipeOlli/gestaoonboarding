import { eq } from "drizzle-orm";

import { getDb } from "@/lib/db";
import { meetings } from "@/lib/db/schema";
import { MeetingSyncError } from "@/lib/meeting-sync";
import { cancelMeeting } from "@/lib/n8n/sync-meeting";
import type { FranchiseMeeting } from "@/lib/services/meetings";

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

export async function cancelFranchiseMeeting(franchiseId: string): Promise<void> {
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

  if (!row) {
    return;
  }

  const existing = mapMeetingRow(row);

  if (existing.calendarEventId) {
    const result = await cancelMeeting({ calendarEventId: existing.calendarEventId });
    if (!result.ok) {
      throw new MeetingSyncError(
        result.error ?? "Não foi possível cancelar o evento no Google Agenda.",
        existing,
      );
    }
  }

  await db.delete(meetings).where(eq(meetings.id, existing.id));
}
