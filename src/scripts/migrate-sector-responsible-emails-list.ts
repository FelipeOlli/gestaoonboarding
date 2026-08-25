import { createClient } from "@libsql/client";
import path from "node:path";

async function main() {
  const url = `file:${path.resolve(process.cwd(), "data/local.db")}`;
  const client = createClient({ url });
  const info = await client.execute("PRAGMA table_info(sectors)");
  const cols = new Set(info.rows.map((r) => String(r.name)));

  if (!cols.has("responsible_emails")) {
    await client.execute("ALTER TABLE sectors ADD COLUMN responsible_emails TEXT");
    console.log("Added responsible_emails");
  }

  if (cols.has("responsible_email")) {
    const rows = await client.execute(
      "SELECT id, responsible_email, responsible_emails FROM sectors WHERE responsible_email IS NOT NULL AND responsible_email <> ''",
    );

    for (const row of rows.rows) {
      const id = String(row.id);
      const legacyEmail = String(row.responsible_email);
      const current = row.responsible_emails ? String(row.responsible_emails) : "";

      if (!current.trim()) {
        await client.execute({
          sql: "UPDATE sectors SET responsible_emails = ? WHERE id = ?",
          args: [JSON.stringify([legacyEmail]), id],
        });
      }
    }

    await client.execute("ALTER TABLE sectors DROP COLUMN responsible_email");
    console.log("Migrated responsible_email -> responsible_emails and dropped legacy column");
  }

  const defaults: Array<{ slug: string; emails: string[] }> = [
    { slug: "fiscal", emails: ["fiscal@homologacao.local"] },
    { slug: "dp", emails: ["dp@homologacao.local"] },
    { slug: "contabil", emails: ["contabil@homologacao.local"] },
  ];

  for (const item of defaults) {
    await client.execute({
      sql: `UPDATE sectors
            SET responsible_emails = ?
            WHERE slug = ?
              AND (responsible_emails IS NULL OR responsible_emails = '' OR responsible_emails = '[]')`,
      args: [JSON.stringify(item.emails), item.slug],
    });
  }

  console.log("Sector email list migration completed.");
}

main().catch((error) => {
  console.error(error);
  process.exit(1);
});
