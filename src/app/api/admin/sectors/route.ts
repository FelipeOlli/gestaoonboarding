import { NextResponse } from "next/server";

import { listSectors, updateSectorResponsibleEmails } from "@/lib/services/sectors";

export async function GET() {
  const sectors = await listSectors();
  return NextResponse.json({ sectors });
}

export async function PATCH(request: Request) {
  const body = (await request.json().catch(() => null)) as
    | { sectorId?: string; responsibleEmails?: string[] }
    | null;

  if (!body?.sectorId) {
    return NextResponse.json({ error: "sectorId é obrigatório." }, { status: 400 });
  }

  if (!Array.isArray(body.responsibleEmails)) {
    return NextResponse.json({ error: "responsibleEmails deve ser uma lista." }, { status: 400 });
  }

  const updated = await updateSectorResponsibleEmails(body.sectorId, body.responsibleEmails);
  if (!updated) {
    return NextResponse.json({ error: "Setor não encontrado." }, { status: 404 });
  }

  return NextResponse.json(updated);
}
