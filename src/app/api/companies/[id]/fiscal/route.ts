import { NextResponse } from "next/server";
import { getCompany, updateCompany } from "@/lib/services/companies";

export async function GET(
  _request: Request,
  { params }: { params: Promise<{ id: string }> },
) {
  const { id } = await params;
  const company = await getCompany(id);
  if (!company) return NextResponse.json({ error: "Empresa não encontrada" }, { status: 404 });
  return NextResponse.json(company.fiscalOnboarding);
}

export async function PATCH(
  request: Request,
  { params }: { params: Promise<{ id: string }> },
) {
  const { id } = await params;
  const body = await request.json();
  const company = await updateCompany(id, { fiscal: body });
  if (!company) return NextResponse.json({ error: "Empresa não encontrada" }, { status: 404 });
  return NextResponse.json(company.fiscalOnboarding);
}
