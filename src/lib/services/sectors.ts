import { eq } from "drizzle-orm";

import { getDb } from "@/lib/db";
import { sectors, type Sector } from "@/lib/db/schema";
import {
  parseResponsibleEmails,
  sanitizeResponsibleEmails,
  serializeResponsibleEmails,
} from "@/lib/sector-emails";

export type SectorWithEmails = Sector & {
  responsibleEmailsList: string[];
};

function mapSector(sector: Sector): SectorWithEmails {
  return {
    ...sector,
    responsibleEmailsList: parseResponsibleEmails(sector.responsibleEmails),
  };
}

export async function listSectors(): Promise<SectorWithEmails[]> {
  const db = getDb();
  const rows = await db.query.sectors.findMany({
    orderBy: (table, { asc }) => [asc(table.name)],
  });

  return rows.map(mapSector);
}

export async function updateSectorResponsibleEmails(
  sectorId: string,
  responsibleEmails: string[],
): Promise<SectorWithEmails | null> {
  const db = getDb();
  const sanitized = sanitizeResponsibleEmails(responsibleEmails);
  const serialized = serializeResponsibleEmails(sanitized);

  await db
    .update(sectors)
    .set({ responsibleEmails: serialized })
    .where(eq(sectors.id, sectorId));

  const updated = await db.query.sectors.findFirst({
    where: eq(sectors.id, sectorId),
  });

  return updated ? mapSector(updated) : null;
}
