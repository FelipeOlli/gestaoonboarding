import { NextResponse } from "next/server";

import { createFranchise, listFranchises } from "@/lib/services/franchises";

export async function GET() {
  const franchises = await listFranchises();
  return NextResponse.json(franchises);
}

export async function POST(request: Request) {
  try {
    const body = await request.json();
    const franchise = await createFranchise(body);
    return NextResponse.json(franchise, { status: 201 });
  } catch (error) {
    const message = error instanceof Error ? error.message : "Erro ao criar franquia";
    return NextResponse.json({ error: message }, { status: 400 });
  }
}
