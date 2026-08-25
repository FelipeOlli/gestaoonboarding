import { createClient } from "@libsql/client";
import path from "node:path";

async function main() {
  const url = `file:${path.resolve(process.cwd(), "data/local.db")}`;
  const client = createClient({ url });
  const info = await client.execute(
    "SELECT name FROM sqlite_master WHERE type='table' AND name='admin_users'",
  );

  if (info.rows.length === 0) {
    await client.execute(`
      CREATE TABLE admin_users (
        id TEXT PRIMARY KEY NOT NULL,
        username TEXT NOT NULL UNIQUE,
        password_hash TEXT NOT NULL,
        role TEXT NOT NULL DEFAULT 'admin',
        active INTEGER NOT NULL DEFAULT 1,
        created_at TEXT NOT NULL DEFAULT (datetime('now')),
        updated_at TEXT NOT NULL DEFAULT (datetime('now'))
      )
    `);
    console.log("Created admin_users table");
  } else {
    console.log("admin_users table already exists");
  }
}

main().catch((error) => {
  console.error(error);
  process.exit(1);
});
