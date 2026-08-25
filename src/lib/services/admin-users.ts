import { randomUUID } from "node:crypto";

import { eq } from "drizzle-orm";

import { hashPassword, verifyPassword } from "@/lib/auth/password";
import { getDb } from "@/lib/db";
import { adminUsers, type AdminUser } from "@/lib/db/schema";

export const DEFAULT_ADMIN_USERNAME = "admin";
export const DEFAULT_ADMIN_PASSWORD = "admim";

export type AuthenticatedAdminUser = Pick<AdminUser, "id" | "username" | "role">;

export async function hasAdminUsers(): Promise<boolean> {
  const db = getDb();
  const user = await db.query.adminUsers.findFirst({
    where: eq(adminUsers.active, true),
  });
  return Boolean(user);
}

export async function authenticateAdminUser(
  username: string,
  password: string,
): Promise<AuthenticatedAdminUser | null> {
  const db = getDb();
  const normalizedUsername = username.trim().toLowerCase();

  const user = await db.query.adminUsers.findFirst({
    where: eq(adminUsers.username, normalizedUsername),
  });

  if (!user || !user.active || user.role !== "admin") return null;
  if (!verifyPassword(password, user.passwordHash)) return null;

  return {
    id: user.id,
    username: user.username,
    role: user.role,
  };
}

export async function ensureDefaultAdminUser(): Promise<void> {
  const db = getDb();
  const existing = await db.query.adminUsers.findFirst({
    where: eq(adminUsers.username, DEFAULT_ADMIN_USERNAME),
  });

  if (existing) return;

  await db.insert(adminUsers).values({
    id: randomUUID(),
    username: DEFAULT_ADMIN_USERNAME,
    passwordHash: hashPassword(DEFAULT_ADMIN_PASSWORD),
    role: "admin",
    active: true,
  });
}

export async function countAdminUsers(): Promise<number> {
  const db = getDb();
  const users = await db.query.adminUsers.findMany({
    where: eq(adminUsers.active, true),
  });
  return users.length;
}
