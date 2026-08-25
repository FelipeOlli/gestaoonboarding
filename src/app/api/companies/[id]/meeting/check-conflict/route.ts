import { NextResponse } from "next/server";

import { checkFranchiseMeetingConflict } from "@/lib/meeting-conflicts";
import { getCompany } from "@/lib/services/companies";
import {
  getEffectiveEntryCompaniesForFranchise,
  getFranchiseMeeting,
} from "@/lib/services/meetings";

export async function POST(
  request: Request,
  { params }: { params: Promise<{ id: string }> },
) {
  const { id } = await params;
  const company = await getCompany(id);

  if (!company) {
    return NextResponse.json({ error: "Empresa não encontrada" }, { status: 404 });
  }

  const companies = await getEffectiveEntryCompaniesForFranchise(company.franchiseId);
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

  const meeting = await getFranchiseMeeting(company.franchiseId);

  const result = await checkFranchiseMeetingConflict({
    franchiseId: company.franchiseId,
    companies,
    scheduledAt: body.scheduledAt,
    durationMin: body.durationMin,
    excludeMeetingId: meeting?.id,
    excludeCalendarEventId: meeting?.calendarEventId,
  });

  return NextResponse.json(result);
}
