import { createClient } from "@libsql/client";
import path from "node:path";

async function main() {
  const url = `file:${path.resolve(process.cwd(), "data/local.db")}`;
  const client = createClient({ url });
  const info = await client.execute("PRAGMA table_info(company_sectors)");
  const cols = new Set(info.rows.map((r) => String(r.name)));

  if (!cols.has("faturamento_status")) {
    await client.execute("ALTER TABLE company_sectors ADD COLUMN faturamento_status TEXT");
    console.log("Added faturamento_status");
  }

  if (cols.has("faturado")) {
    await client.execute(
      "UPDATE company_sectors SET faturamento_status = 'recebido' WHERE faturado = 1",
    );
    await client.execute(
      "UPDATE company_sectors SET faturamento_status = 'sem_recebimento' WHERE faturado = 0 AND (faturamento_status IS NULL OR faturamento_status = '')",
    );
    await client.execute("ALTER TABLE company_sectors DROP COLUMN faturado");
    console.log("Migrated and dropped faturado");
  }

  const after = await client.execute("PRAGMA table_info(company_sectors)");
  console.log("Columns:", after.rows.map((r) => r.name).join(", "));
}

main().catch((error) => {
  console.error(error);
  process.exit(1);
});
