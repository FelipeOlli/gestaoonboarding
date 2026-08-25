import { NextResponse } from "next/server";

import { resolveFranchiseEmail } from "@/lib/services/franchises";

export async function GET(
  _request: Request,
  { params }: { params: Promise<{ id: string }> },
) {
  const { id } = await params;
  const email = await resolveFranchiseEmail(id);
  return NextResponse.json({ email });
}
