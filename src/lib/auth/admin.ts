import { createHmac, randomBytes } from "crypto";

import {
  ADMIN_SESSION_MAX_AGE_SECONDS,
  getAdminSessionCookieName,
  type AdminSessionPayload,
} from "@/lib/auth/admin-session";
import type { AuthenticatedAdminUser } from "@/lib/services/admin-users";

function requireSessionSecret(): string {
  const secret = process.env.ADMIN_SESSION_SECRET?.trim();
  if (!secret) {
    throw new Error("ADMIN_SESSION_SECRET não configurado.");
  }
  return secret;
}

export { ADMIN_SESSION_MAX_AGE_SECONDS, getAdminSessionCookieName };

export function createAdminSessionToken(user: AuthenticatedAdminUser): string {
  const payload: AdminSessionPayload = {
    exp: Date.now() + ADMIN_SESSION_MAX_AGE_SECONDS * 1000,
    userId: user.id,
    username: user.username,
    role: user.role,
    nonce: randomBytes(8).toString("hex"),
  };
  const payloadB64 = Buffer.from(JSON.stringify(payload)).toString("base64url");
  const secret = requireSessionSecret();
  const signature = createHmac("sha256", secret).update(payloadB64).digest("hex");
  return `${payloadB64}.${signature}`;
}
