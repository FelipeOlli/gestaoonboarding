import { createClient } from "@libsql/client";
import path from "node:path";

async function main() {
  const url = `file:${path.resolve(process.cwd(), "data/local.db")}`;
  const client = createClient({ url });
  const info = await client.execute("PRAGMA table_info(companies)");
  const cols = new Set(info.rows.map((r) => String(r.name)));

  if (!cols.has("contrato_status")) {
    await client.execute("ALTER TABLE companies ADD COLUMN contrato_status TEXT");
    console.log("Added contrato_status");
  }

  if (!cols.has("pr_franqueado_status")) {
    await client.execute("ALTER TABLE companies ADD COLUMN pr_franqueado_status TEXT");
    console.log("Added pr_franqueado_status");
  }

  if (cols.has("contrato_assinado")) {
    await client.execute(
      "UPDATE companies SET contrato_status = 'assinado' WHERE contrato_assinado = 1",
    );
    await client.execute("ALTER TABLE companies DROP COLUMN contrato_assinado");
    console.log("Migrated and dropped contrato_assinado");
  }

  if (cols.has("pr_preenchido_franqueado")) {
    await client.execute(
      "UPDATE companies SET pr_franqueado_status = 'assinado' WHERE pr_preenchido_franqueado = 1",
    );
    await client.execute("ALTER TABLE companies DROP COLUMN pr_preenchido_franqueado");
    console.log("Migrated and dropped pr_preenchido_franqueado");
  }

  const after = await client.execute("PRAGMA table_info(companies)");
  console.log("Columns:", after.rows.map((r) => r.name).join(", "));
}

main().catch((error) => {
  console.error(error);
  process.exit(1);
});
