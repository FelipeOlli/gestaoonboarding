import { NextResponse } from "next/server";
import {
  contractCompanySector,
  uncontractCompanySector,
  updateCompanySector,
} from "@/lib/services/companies";

export async function POST(
  request: Request,
  { params }: { params: Promise<{ id: string }> },
) {
  const { id } = await params;
  const body = await request.json();
  const { sectorId } = body;

  if (!sectorId) {
    return NextResponse.json({ error: "sectorId é obrigatório" }, { status: 400 });
  }

  const created = await contractCompanySector(id, sectorId);
  if (!created) {
    return NextResponse.json({ error: "Setor não encontrado" }, { status: 404 });
  }

  return NextResponse.json(created);
}

export async function DELETE(
  request: Request,
  { params }: { params: Promise<{ id: string }> },
) {
  const { id } = await params;
  const body = await request.json();
  const { sectorId } = body;

  if (!sectorId) {
    return NextResponse.json({ error: "sectorId é obrigatório" }, { status: 400 });
  }

  const removed = await uncontractCompanySector(id, sectorId);
  if (!removed) {
    return NextResponse.json({ error: "Setor não contratado" }, { status: 404 });
  }

  return NextResponse.json({ ok: true });
}

export async function PATCH(
  request: Request,
  { params }: { params: Promise<{ id: string }> },
) {
  const { id } = await params;
  const body = await request.json();
  const { sectorId, ...patch } = body;

  if (!sectorId) {
    return NextResponse.json({ error: "sectorId é obrigatório" }, { status: 400 });
  }

  const updated = await updateCompanySector(id, sectorId, patch);
  if (!updated) {
    return NextResponse.json({ error: "Setor não encontrado" }, { status: 404 });
  }

  return NextResponse.json(updated);
}
