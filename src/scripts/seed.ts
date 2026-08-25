import { randomUUID } from "node:crypto";

import { eq } from "drizzle-orm";

import { getDb } from "@/lib/db";
import { franchises, sectors } from "@/lib/db/schema";
import { SECTOR_SLUGS } from "@/lib/constants";
import { ensureDefaultAdminUser } from "@/lib/services/admin-users";
import { serializeResponsibleEmails } from "@/lib/sector-emails";

const SEED_FRANCHISES = [
  { name: "Franquia SP Centro" },
  { name: "Franquia RJ Norte" },
  { name: "Franquia MG Sul" },
];

const SEED_SECTORS: Array<{
  name: string;
  slug: (typeof SECTOR_SLUGS)[number];
  description: string;
  responsibleEmails: string[];
}> = [
  {
    name: "Fiscal",
    slug: "fiscal",
    description: "Setor fiscal e tributário",
    responsibleEmails: ["fiscal@homologacao.local"],
  },
  {
    name: "DP",
    slug: "dp",
    description: "Departamento pessoal",
    responsibleEmails: ["dp@homologacao.local"],
  },
  {
    name: "Contábil",
    slug: "contabil",
    description: "Setor contábil",
    responsibleEmails: ["contabil@homologacao.local"],
  },
];

async function seedFranchises() {
  const db = getDb();

  for (const item of SEED_FRANCHISES) {
    const existing = await db.query.franchises.findFirst({
      where: eq(franchises.name, item.name),
    });

    if (existing) continue;

    await db.insert(franchises).values({
      id: randomUUID(),
      name: item.name,
      active: true,
    });
  }
}

async function seedSectors() {
  const db = getDb();

  for (const item of SEED_SECTORS) {
    const existing = await db.query.sectors.findFirst({
      where: eq(sectors.slug, item.slug),
    });

    const serializedEmails = serializeResponsibleEmails(item.responsibleEmails);

    if (existing) {
      if (!existing.responsibleEmails) {
        await db
          .update(sectors)
          .set({ responsibleEmails: serializedEmails })
          .where(eq(sectors.id, existing.id));
      }
      continue;
    }

    await db.insert(sectors).values({
      id: randomUUID(),
      name: item.name,
      slug: item.slug,
      description: item.description,
      responsibleEmails: serializedEmails,
      active: true,
    });
  }
}

async function main() {
  await seedFranchises();
  await seedSectors();
  await ensureDefaultAdminUser();

  console.log("Seed concluído: franquias, setores e usuário admin.");
}

main().catch((error) => {
  console.error("Erro ao executar seed:", error);
  process.exit(1);
});
