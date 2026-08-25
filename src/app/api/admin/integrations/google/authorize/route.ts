import { NextResponse } from "next/server";

import { GOOGLE_OAUTH_STATE_COOKIE } from "@/lib/google/oauth";
import { createGoogleOAuthState } from "@/lib/google/oauth-state";
import { buildGoogleAuthUrl, getGoogleRedirectUri } from "@/lib/google/oauth";
import { getSetting } from "@/lib/services/settings";

export async function GET(request: Request) {
  const clientId = (await getSetting("google_oauth_client_id"))?.trim();
  const clientSecret = (await getSetting("google_oauth_client_secret"))?.trim();

  if (!clientId || !clientSecret) {
    const redirectUrl = new URL("/admin/integracoes", request.url);
    redirectUrl.searchParams.set("google_error", "missing_credentials");
    return NextResponse.redirect(redirectUrl);
  }

  const state = createGoogleOAuthState();
  const redirectUri = getGoogleRedirectUri(request);
  const authUrl = buildGoogleAuthUrl({ clientId, redirectUri, state });

  const response = NextResponse.redirect(authUrl);
  response.cookies.set(GOOGLE_OAUTH_STATE_COOKIE, state, {
    httpOnly: true,
    sameSite: "lax",
    secure: process.env.NODE_ENV === "production",
    path: "/",
    maxAge: 600,
  });

  return response;
}
