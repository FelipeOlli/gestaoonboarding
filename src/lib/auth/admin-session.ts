const SESSION_TTL_MS = 7 * 24 * 60 * 60 * 1000;

export type AdminSessionPayload = {
  exp: number;
  userId: string;
  username: string;
  role: string;
  nonce: string;
};

function getSessionSecret(): string | null {
  return process.env.ADMIN_SESSION_SECRET?.trim() || null;
}

async function hmacSha256Hex(secret: string, message: string) {
  const encoder = new TextEncoder();
  const key = await crypto.subtle.importKey(
    "raw",
    encoder.encode(secret),
    { name: "HMAC", hash: "SHA-256" },
    false,
    ["sign"],
  );
  const signature = await crypto.subtle.sign("HMAC", key, encoder.encode(message));
  return bytesToHex(new Uint8Array(signature));
}

function bytesToHex(bytes: Uint8Array) {
  return Array.from(bytes)
    .map((byte) => byte.toString(16).padStart(2, "0"))
    .join("");
}

function base64UrlToString(value: string) {
  const normalized = value.replace(/-/g, "+").replace(/_/g, "/");
  const padded = normalized + "=".repeat((4 - (normalized.length % 4)) % 4);
  return atob(padded);
}

export function getAdminSessionCookieName() {
  return "admin_session";
}

export async function verifyAdminSessionToken(
  token: string | undefined | null,
): Promise<AdminSessionPayload | null> {
  if (!token) return null;

  const secret = getSessionSecret();
  if (!secret) return null;

  try {
    const [payloadB64, signature] = token.split(".");
    if (!payloadB64 || !signature) return null;

    const expected = await hmacSha256Hex(secret, payloadB64);
    if (expected.length !== signature.length) return null;

    let mismatch = 0;
    for (let index = 0; index < expected.length; index += 1) {
      mismatch |= expected.charCodeAt(index) ^ signature.charCodeAt(index);
    }
    if (mismatch !== 0) return null;

    const payload = JSON.parse(base64UrlToString(payloadB64)) as AdminSessionPayload;

    if (typeof payload.exp !== "number" || Date.now() >= payload.exp) return null;
    if (!payload.userId || !payload.username || payload.role !== "admin") return null;

    return payload;
  } catch {
    return null;
  }
}

export const ADMIN_SESSION_MAX_AGE_SECONDS = Math.floor(SESSION_TTL_MS / 1000);
