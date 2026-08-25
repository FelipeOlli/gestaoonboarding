import { NextResponse, type NextRequest } from "next/server";

import { verifyAdminSessionToken } from "@/lib/auth/admin-session";

const PUBLIC_PATHS = ["/admin/login", "/api/admin/auth/login", "/api/admin/auth/logout"];

export async function middleware(request: NextRequest) {
  const { pathname } = request.nextUrl;

  if (PUBLIC_PATHS.includes(pathname)) {
    return NextResponse.next();
  }

  const session = request.cookies.get("admin_session")?.value;
  const authorized = Boolean(await verifyAdminSessionToken(session));

  if (!authorized) {
    if (pathname.startsWith("/api/admin")) {
      return NextResponse.json({ error: "Não autorizado." }, { status: 401 });
    }

    const loginUrl = new URL("/admin/login", request.url);
    loginUrl.searchParams.set("next", pathname);
    return NextResponse.redirect(loginUrl);
  }

  return NextResponse.next();
}

export const config = {
  matcher: ["/admin/:path*", "/api/admin/:path*"],
};
