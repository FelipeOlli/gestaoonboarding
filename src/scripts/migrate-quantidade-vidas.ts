import { createClient } from "@libsql/client";
import path from "node:path";

async function main() {
  const url = `file:${path.resolve(process.cwd(), "data/local.db")}`;
  const client = createClient({ url });
  const info = await client.execute("PRAGMA table_info(company_sectors)");
  const cols = new Set(info.rows.map((r) => String(r.name)));

  if (!cols.has("quantidade_vidas")) {
    await client.execute("ALTER TABLE company_sectors ADD COLUMN quantidade_vidas INTEGER");
    console.log("Added quantidade_vidas");
  } else {
    console.log("quantidade_vidas already exists");
  }

  const after = await client.execute("PRAGMA table_info(company_sectors)");
  console.log("Columns:", after.rows.map((r) => r.name).join(", "));
}

main().catch((error) => {
  console.error(error);
  process.exit(1);
});
