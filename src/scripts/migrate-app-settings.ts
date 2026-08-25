import { createClient } from "@libsql/client";
import path from "node:path";

async function main() {
  const url = `file:${path.resolve(process.cwd(), "data/local.db")}`;
  const client = createClient({ url });
  const info = await client.execute(
    "SELECT name FROM sqlite_master WHERE type='table' AND name='app_settings'",
  );

  if (info.rows.length === 0) {
    await client.execute(`
      CREATE TABLE app_settings (
        key TEXT PRIMARY KEY NOT NULL,
        value TEXT,
        updated_at TEXT NOT NULL DEFAULT (datetime('now'))
      )
    `);
    console.log("Created app_settings table");
  } else {
    console.log("app_settings table already exists");
  }
}

main().catch((error) => {
  console.error(error);
  process.exit(1);
});
