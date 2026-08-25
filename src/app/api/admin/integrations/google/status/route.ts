import { NextResponse } from "next/server";

import { getSetting, setSetting } from "@/lib/services/settings";

export async function GET() {
  const refreshToken = (await getSetting("google_oauth_refresh_token"))?.trim();
  const email = (await getSetting("google_connected_email"))?.trim();
  const connectedAt = (await getSetting("google_oauth_connected_at"))?.trim();
  const calendarId = (await getSetting("google_calendar_id"))?.trim();
  const clientId = (await getSetting("google_oauth_client_id"))?.trim();
  const clientSecret = (await getSetting("google_oauth_client_secret"))?.trim();

  return NextResponse.json({
    connected: Boolean(refreshToken),
    email: email || null,
    connectedAt: connectedAt || null,
    calendarId: calendarId || null,
    credentialsConfigured: Boolean(clientId && clientSecret),
    redirectUriHint: "/api/admin/integrations/google/callback",
  });
}

export async function DELETE() {
  await setSetting("google_oauth_refresh_token", null);
  await setSetting("google_connected_email", null);
  await setSetting("google_oauth_connected_at", null);

  return NextResponse.json({ ok: true });
}
