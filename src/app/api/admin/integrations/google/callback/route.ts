import { cookies } from "next/headers";
import { NextResponse } from "next/server";

import {
  exchangeGoogleAuthCode,
  fetchGoogleUserInfo,
  getGoogleRedirectUri,
  GOOGLE_OAUTH_STATE_COOKIE,
} from "@/lib/google/oauth";
import { verifyGoogleOAuthState } from "@/lib/google/oauth-state";
import { getSetting, setSetting } from "@/lib/services/settings";

export async function GET(request: Request) {
  const url = new URL(request.url);
  const code = url.searchParams.get("code");
  const state = url.searchParams.get("state");
  const oauthError = url.searchParams.get("error");
  const redirectBase = new URL("/admin/integracoes", request.url);

  if (oauthError) {
    redirectBase.searchParams.set("google_error", oauthError);
    return NextResponse.redirect(redirectBase);
  }

  const cookieStore = await cookies();
  const cookieState = cookieStore.get(GOOGLE_OAUTH_STATE_COOKIE)?.value;

  if (!code || !verifyGoogleOAuthState(state) || state !== cookieState) {
    redirectBase.searchParams.set("google_error", "invalid_state");
    return clearStateCookie(NextResponse.redirect(redirectBase));
  }

  const clientId = (await getSetting("google_oauth_client_id"))?.trim();
  const clientSecret = (await getSetting("google_oauth_client_secret"))?.trim();

  if (!clientId || !clientSecret) {
    redirectBase.searchParams.set("google_error", "missing_credentials");
    return clearStateCookie(NextResponse.redirect(redirectBase));
  }

  try {
    const redirectUri = getGoogleRedirectUri(request);
    const tokens = await exchangeGoogleAuthCode({
      code,
      clientId,
      clientSecret,
      redirectUri,
    });

    if (!tokens.refresh_token) {
      redirectBase.searchParams.set("google_error", "missing_refresh_token");
      return clearStateCookie(NextResponse.redirect(redirectBase));
    }

    const userInfo = await fetchGoogleUserInfo(tokens.access_token);
    const connectedEmail = userInfo?.email?.trim() || null;

    await setSetting("google_oauth_refresh_token", tokens.refresh_token);
    await setSetting("google_connected_email", connectedEmail);
    await setSetting("google_oauth_connected_at", new Date().toISOString());

    const currentCalendarId = (await getSetting("google_calendar_id"))?.trim();
    if (!currentCalendarId) {
      await setSetting("google_calendar_id", "primary");
    }

    redirectBase.searchParams.set("google", "connected");
    return clearStateCookie(NextResponse.redirect(redirectBase));
  } catch (error) {
    redirectBase.searchParams.set(
      "google_error",
      error instanceof Error ? error.message : "oauth_failed",
    );
    return clearStateCookie(NextResponse.redirect(redirectBase));
  }
}

function clearStateCookie(response: NextResponse) {
  response.cookies.set(GOOGLE_OAUTH_STATE_COOKIE, "", {
    httpOnly: true,
    sameSite: "lax",
    secure: process.env.NODE_ENV === "production",
    path: "/",
    maxAge: 0,
  });
  return response;
}
