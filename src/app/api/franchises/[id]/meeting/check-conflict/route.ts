import { NextResponse } from "next/server";

import { checkFranchiseMeetingConflict } from "@/lib/meeting-conflicts";
import {
  getEffectiveEntryCompaniesForFranchise,
  getFranchiseMeeting,
} from "@/lib/services/meetings";

export async function POST(
  request: Request,
  { params }: { params: Promise<{ id: string }> },
) {
  const { id } = await params;
  const companies = await getEffectiveEntryCompaniesForFranchise(id);

  if (companies.length === 0) {
    return NextResponse.json(
      { error: "Nenhuma empresa com entrada efetiva encontrada para esta franquia." },
      { status: 400 },
    );
  }

  const body = (await request.json().catch(() => null)) as {
    scheduledAt?: string;
    durationMin?: number;
  } | null;

  if (!body?.scheduledAt) {
    return NextResponse.json({ error: "Informe scheduledAt." }, { status: 400 });
  }

  const meeting = await getFranchiseMeeting(id);

  const result = await checkFranchiseMeetingConflict({
    franchiseId: id,
    companies,
    scheduledAt: body.scheduledAt,
    durationMin: body.durationMin,
    excludeMeetingId: meeting?.id,
    excludeCalendarEventId: meeting?.calendarEventId,
  });

  return NextResponse.json(result);
}
