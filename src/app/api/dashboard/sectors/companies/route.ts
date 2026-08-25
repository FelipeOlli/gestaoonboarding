import { NextResponse } from "next/server";

import { listCompaniesBySectorName } from "@/lib/services/companies";

export async function GET(request: Request) {
  const url = new URL(request.url);
  const setor = url.searchParams.get("setor")?.trim();

  if (!setor) {
    return NextResponse.json({ error: "Informe o parâmetro setor." }, { status: 400 });
  }

  const companies = await listCompaniesBySectorName(setor);
  return NextResponse.json({ setor, companies });
}
