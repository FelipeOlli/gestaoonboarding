import { NextResponse } from "next/server";

import {
  ADMIN_SESSION_MAX_AGE_SECONDS,
  createAdminSessionToken,
  getAdminSessionCookieName,
} from "@/lib/auth/admin";
import {
  authenticateAdminUser,
  ensureDefaultAdminUser,
} from "@/lib/services/admin-users";

export async function POST(request: Request) {
  const body = (await request.json().catch(() => null)) as
    | { username?: string; password?: string }
    | null;

  const username = body?.username?.trim();
  const password = body?.password ?? "";

  if (!username || !password) {
    return NextResponse.json({ error: "Informe usuário e senha." }, { status: 400 });
  }

  await ensureDefaultAdminUser();

  const user = await authenticateAdminUser(username, password);
  if (!user) {
    return NextResponse.json({ error: "Usuário ou senha inválidos." }, { status: 401 });
  }

  const response = NextResponse.json({
    ok: true,
    user: {
      username: user.username,
      role: user.role,
    },
  });

  response.cookies.set(getAdminSessionCookieName(), createAdminSessionToken(user), {
    httpOnly: true,
    sameSite: "lax",
    secure: process.env.NODE_ENV === "production",
    path: "/",
    maxAge: ADMIN_SESSION_MAX_AGE_SECONDS,
  });

  return response;
}
