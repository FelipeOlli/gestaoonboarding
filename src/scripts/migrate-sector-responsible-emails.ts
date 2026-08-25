import { createClient } from "@libsql/client";
import path from "node:path";

async function main() {
  const url = `file:${path.resolve(process.cwd(), "data/local.db")}`;
  const client = createClient({ url });
  const info = await client.execute("PRAGMA table_info(sectors)");
  const cols = new Set(info.rows.map((r) => String(r.name)));

  if (!cols.has("responsible_email")) {
    await client.execute("ALTER TABLE sectors ADD COLUMN responsible_email TEXT");
    console.log("Added responsible_email");
  } else {
    console.log("responsible_email already exists");
  }

  const defaults: Array<{ slug: string; email: string }> = [
    { slug: "fiscal", email: "fiscal@homologacao.local" },
    { slug: "dp", email: "dp@homologacao.local" },
    { slug: "contabil", email: "contabil@homologacao.local" },
  ];

  for (const item of defaults) {
    await client.execute({
      sql: `UPDATE sectors SET responsible_email = ? WHERE slug = ? AND (responsible_email IS NULL OR responsible_email = '')`,
      args: [item.email, item.slug],
    });
  }

  console.log("Default sector emails applied where empty.");
}

main().catch((error) => {
  console.error(error);
  process.exit(1);
});
