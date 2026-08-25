import { createClient } from "@libsql/client";
import path from "node:path";

async function main() {
  const url = `file:${path.resolve(process.cwd(), "data/local.db")}`;
  const client = createClient({ url });

  const result = await client.execute(`
    DELETE FROM company_sectors
    WHERE company_id NOT IN (SELECT id FROM companies)
  `);

  console.log(`Removed ${result.rowsAffected} orphan company_sectors row(s).`);
}

main().catch((error) => {
  console.error(error);
  process.exit(1);
});
