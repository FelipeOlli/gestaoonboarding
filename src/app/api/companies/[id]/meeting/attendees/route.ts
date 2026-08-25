import { NextResponse } from "next/server";

import { collectMeetingAttendeesForCompanies } from "@/lib/meeting-attendees";
import { getCompany } from "@/lib/services/companies";
import {
  getEffectiveEntryCompaniesForFranchise,
  getFranchiseMeeting,
} from "@/lib/services/meetings";

export async function GET(
  request: Request,
  { params }: { params: Promise<{ id: string }> },
) {
  const { id } = await params;
  const company = await getCompany(id);

  if (!company) {
    return NextResponse.json({ error: "Empresa não encontrada" }, { status: 404 });
  }

  const companies = await getEffectiveEntryCompaniesForFranchise(company.franchiseId);
  const meeting = await getFranchiseMeeting(company.franchiseId);

  const url = new URL(request.url);
  const franqueadoEmail =
    url.searchParams.get("franqueadoEmail") ?? meeting?.franqueadoEmail ?? null;

  const attendees = await collectMeetingAttendeesForCompanies(companies, franqueadoEmail);

  return NextResponse.json({ attendees });
}
