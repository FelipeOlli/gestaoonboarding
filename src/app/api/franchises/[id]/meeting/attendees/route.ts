import { NextResponse } from "next/server";

import { collectMeetingAttendeesForCompanies } from "@/lib/meeting-attendees";
import {
  getEffectiveEntryCompaniesForFranchise,
  getFranchiseMeeting,
} from "@/lib/services/meetings";

export async function GET(
  request: Request,
  { params }: { params: Promise<{ id: string }> },
) {
  const { id } = await params;
  const companies = await getEffectiveEntryCompaniesForFranchise(id);

  if (companies.length === 0) {
    return NextResponse.json({ attendees: [] });
  }

  const url = new URL(request.url);
  const meeting = await getFranchiseMeeting(id);
  const franqueadoEmail =
    url.searchParams.get("franqueadoEmail") ?? meeting?.franqueadoEmail ?? null;

  const attendees = await collectMeetingAttendeesForCompanies(companies, franqueadoEmail);

  return NextResponse.json({ attendees });
}
