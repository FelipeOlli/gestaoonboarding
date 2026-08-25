import { listFranchises } from "@/lib/services/franchises";
import { eq } from "drizzle-orm";
import { NextResponse } from "next/server";
import { getDb } from "@/lib/db";
import { sectors } from "@/lib/db/schema";

export async function GET() {
  const db = getDb();
  const [franchiseList, sectorList] = await Promise.all([
    listFranchises(),
    db.query.sectors.findMany({ where: eq(sectors.active, true) }),
  ]);
  return NextResponse.json({ franchises: franchiseList, sectors: sectorList });
}
