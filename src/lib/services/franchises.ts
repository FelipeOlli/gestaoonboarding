import { randomUUID } from "node:crypto";

import { desc, eq } from "drizzle-orm";

import { getDb } from "@/lib/db";
import { franchises, meetings } from "@/lib/db/schema";

export type CreateFranchiseInput = {
  name: string;
  email?: string | null;
};

export async function listFranchises() {
  const db = getDb();
  return db.query.franchises.findMany({
    where: eq(franchises.active, true),
    orderBy: (table, { asc }) => [asc(table.name)],
  });
}

export async function createFranchise(input: CreateFranchiseInput) {
  const db = getDb();
  const name = input.name.trim();

  if (!name) {
    throw new Error("Informe o nome da franquia.");
  }

  const existing = await db.query.franchises.findFirst({
    where: eq(franchises.name, name),
  });

  if (existing) {
    return existing;
  }

  const id = randomUUID();
  await db.insert(franchises).values({
    id,
    name,
    email: input.email?.trim() || null,
    active: true,
  });

  const created = await db.query.franchises.findFirst({
    where: eq(franchises.id, id),
  });

  if (!created) {
    throw new Error("Franquia criada, mas não foi possível recarregar os dados.");
  }

  return created;
}

export async function updateFranchiseEmail(franchiseId: string, email: string | null) {
  const db = getDb();
  const normalized = email?.trim() || null;

  await db
    .update(franchises)
    .set({ email: normalized })
    .where(eq(franchises.id, franchiseId));
}

export async function resolveFranchiseEmail(franchiseId: string): Promise<string | null> {
  const db = getDb();

  const franchise = await db.query.franchises.findFirst({
    where: eq(franchises.id, franchiseId),
  });

  if (franchise?.email) {
    return franchise.email;
  }

  const latestMeeting = await db.query.meetings.findFirst({
    where: eq(meetings.franchiseId, franchiseId),
    orderBy: [desc(meetings.scheduledAt)],
  });

  return latestMeeting?.franqueadoEmail ?? null;
}
