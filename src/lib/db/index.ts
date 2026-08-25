import { createClient, type Client } from "@libsql/client";
import path from "node:path";
import { drizzle, type LibSQLDatabase } from "drizzle-orm/libsql";

import * as schema from "@/lib/db/schema";

type Db = LibSQLDatabase<typeof schema>;

let client: Client | null = null;
let db: Db | null = null;

function resolveDatabaseUrl(): string {
  const configured = process.env.TURSO_DATABASE_URL?.trim() || "file:./data/local.db";

  if (!configured.startsWith("file:")) {
    return configured;
  }

  const filePath = configured.slice("file:".length);
  if (path.isAbsolute(filePath)) {
    return configured;
  }

  return `file:${path.resolve(process.cwd(), filePath)}`;
}

export function getDb(): Db {
  if (db) return db;

  const url = resolveDatabaseUrl();
  const authToken = process.env.TURSO_AUTH_TOKEN;

  client = createClient({
    url,
    authToken: authToken || undefined,
  });

  db = drizzle(client, { schema });
  return db;
}

export { schema };
