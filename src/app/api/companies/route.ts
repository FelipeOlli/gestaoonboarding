import { NextResponse } from "next/server";
import {
  createCompany,
  getCompanyByCnpj,
  listCompanies,
} from "@/lib/services/companies";

export async function GET(request: Request) {
  const { searchParams } = new URL(request.url);
  const sector = searchParams.get("sector") ?? undefined;
  const franchiseId = searchParams.get("franchiseId") ?? undefined;

  const companies = await listCompanies({ sectorSlug: sector, franchiseId });
  return NextResponse.json(companies);
}

export async function POST(request: Request) {
  try {
    const body = await request.json();
    const existing = await getCompanyByCnpj(body.cnpj);
    if (existing) {
      return NextResponse.json({ error: "Empresa já cadastrada" }, { status: 409 });
    }

    const company = await createCompany(body);
    return NextResponse.json(company, { status: 201 });
  } catch (error) {
    const message = error instanceof Error ? error.message : "Erro ao criar empresa";
    return NextResponse.json({ error: message }, { status: 400 });
  }
}
