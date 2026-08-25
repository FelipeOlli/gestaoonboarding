import { createHmac, randomBytes, timingSafeEqual } from "node:crypto";

const STATE_TTL_MS = 10 * 60 * 1000;

function getStateSecret(): string {
  const secret = process.env.ADMIN_SESSION_SECRET?.trim();
  if (!secret) {
    throw new Error("ADMIN_SESSION_SECRET não configurado.");
  }
  return secret;
}

export function createGoogleOAuthState(): string {
  const payload = JSON.stringify({
    exp: Date.now() + STATE_TTL_MS,
    nonce: randomBytes(12).toString("hex"),
  });
  const payloadB64 = Buffer.from(payload).toString("base64url");
  const signature = createHmac("sha256", getStateSecret()).update(payloadB64).digest("hex");
  return `${payloadB64}.${signature}`;
}

export function verifyGoogleOAuthState(state: string | null | undefined): boolean {
  if (!state) return false;

  try {
    const [payloadB64, signature] = state.split(".");
    if (!payloadB64 || !signature) return false;

    const expected = createHmac("sha256", getStateSecret()).update(payloadB64).digest("hex");
    const sigBuffer = Buffer.from(signature, "hex");
    const expectedBuffer = Buffer.from(expected, "hex");
    if (sigBuffer.length !== expectedBuffer.length) return false;
    if (!timingSafeEqual(sigBuffer, expectedBuffer)) return false;

    const payload = JSON.parse(Buffer.from(payloadB64, "base64url").toString()) as {
      exp?: number;
    };

    return typeof payload.exp === "number" && Date.now() < payload.exp;
  } catch {
    return false;
  }
}
