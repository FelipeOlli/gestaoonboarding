import { getSettingOrEnv } from "@/lib/services/settings";

import type { GoogleTokenResponse } from "./oauth";

export type CalendarEvent = {
  id: string;
  summary?: string;
  start: string;
  end: string;
  attendeeEmails: string[];
};

type GoogleCalendarEventsResponse = {
  items?: Array<{
    id?: string;
    summary?: string;
    start?: { dateTime?: string; date?: string };
    end?: { dateTime?: string; date?: string };
    attendees?: Array<{ email?: string }>;
    organizer?: { email?: string };
  }>;
};

export async function getGoogleAccessToken(): Promise<string | null> {
  const clientId = await getSettingOrEnv("google_oauth_client_id");
  const clientSecret = await getSettingOrEnv("google_oauth_client_secret");
  const refreshToken = await getSettingOrEnv("google_oauth_refresh_token");

  if (!clientId || !clientSecret || !refreshToken) {
    return null;
  }

  const response = await fetch("https://oauth2.googleapis.com/token", {
    method: "POST",
    headers: { "Content-Type": "application/x-www-form-urlencoded" },
    body: new URLSearchParams({
      client_id: clientId,
      client_secret: clientSecret,
      refresh_token: refreshToken,
      grant_type: "refresh_token",
    }),
  });

  if (!response.ok) {
    console.error("[google/calendar] Falha ao obter access token:", response.status);
    return null;
  }

  const payload = (await response.json().catch(() => null)) as GoogleTokenResponse | null;
  return payload?.access_token ?? null;
}

export async function isGoogleCalendarConfigured(): Promise<boolean> {
  const clientId = await getSettingOrEnv("google_oauth_client_id");
  const clientSecret = await getSettingOrEnv("google_oauth_client_secret");
  const refreshToken = await getSettingOrEnv("google_oauth_refresh_token");
  return Boolean(clientId && clientSecret && refreshToken);
}

function parseEventDateTime(value?: { dateTime?: string; date?: string }): string | null {
  if (value?.dateTime) return value.dateTime;
  if (value?.date) return `${value.date}T00:00:00.000Z`;
  return null;
}

export async function listCalendarEvents(input: {
  timeMin: string;
  timeMax: string;
}): Promise<{ events: CalendarEvent[]; error?: string }> {
  const accessToken = await getGoogleAccessToken();
  if (!accessToken) {
    return { events: [], error: "Google Calendar não configurado." };
  }

  const calendarId = (await getSettingOrEnv("google_calendar_id"))?.trim() || "primary";

  const params = new URLSearchParams({
    timeMin: input.timeMin,
    timeMax: input.timeMax,
    singleEvents: "true",
    orderBy: "startTime",
    maxResults: "250",
  });

  const url = `https://www.googleapis.com/calendar/v3/calendars/${encodeURIComponent(calendarId)}/events?${params}`;

  try {
    const response = await fetch(url, {
      headers: { Authorization: `Bearer ${accessToken}` },
    });

    if (!response.ok) {
      const message = await response.text().catch(() => "");
      console.error("[google/calendar] events.list falhou:", response.status, message);
      return {
        events: [],
        error: message || `Falha ao consultar Google Agenda (HTTP ${response.status}).`,
      };
    }

    const payload = (await response.json()) as GoogleCalendarEventsResponse;
    const events: CalendarEvent[] = [];

    for (const item of payload.items ?? []) {
      const start = parseEventDateTime(item.start);
      const end = parseEventDateTime(item.end);
      if (!item.id || !start || !end) continue;

      const attendeeEmails = new Set<string>();
      for (const attendee of item.attendees ?? []) {
        if (attendee.email) attendeeEmails.add(attendee.email.trim().toLowerCase());
      }
      if (item.organizer?.email) {
        attendeeEmails.add(item.organizer.email.trim().toLowerCase());
      }

      events.push({
        id: item.id,
        summary: item.summary,
        start,
        end,
        attendeeEmails: [...attendeeEmails],
      });
    }

    return { events };
  } catch (error) {
    const message = error instanceof Error ? error.message : "Erro desconhecido";
    console.error("[google/calendar] events.list erro:", message);
    return { events: [], error: message };
  }
}

const SAO_PAULO_TZ = "America/Sao_Paulo";

type DateTimeParts = {
  year: string;
  month: string;
  day: string;
  hour: string;
  minute: string;
  second: string;
};

function getDateTimePartsInTimeZone(date: Date, timeZone: string): DateTimeParts {
  const parts = new Intl.DateTimeFormat("en-US", {
    timeZone,
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
    hour: "2-digit",
    minute: "2-digit",
    second: "2-digit",
    hour12: false,
  }).formatToParts(date);

  const get = (type: Intl.DateTimeFormatPartTypes) =>
    parts.find((part) => part.type === type)?.value ?? "00";

  return {
    year: get("year"),
    month: get("month"),
    day: get("day"),
    hour: get("hour") === "24" ? "00" : get("hour"),
    minute: get("minute"),
    second: get("second"),
  };
}

function formatGoogleDateTime(parts: DateTimeParts): string {
  return `${parts.year}-${parts.month}-${parts.day}T${parts.hour}:${parts.minute}:${parts.second}`;
}

export type UpsertCalendarEventInput = {
  summary: string;
  description?: string | null;
  scheduledAt: string;
  durationMinutes: number;
  attendees: string[];
  eventId?: string | null;
};

export type UpsertCalendarEventResult = {
  ok: boolean;
  eventId?: string | null;
  error?: string;
};

async function requestCalendarEvent(
  method: "POST" | "PATCH",
  accessToken: string,
  calendarId: string,
  eventId: string | null,
  body: Record<string, unknown>,
): Promise<{ eventId: string | null; error?: string; notFound?: boolean }> {
  const baseUrl = `https://www.googleapis.com/calendar/v3/calendars/${encodeURIComponent(calendarId)}/events`;
  const url =
    method === "POST"
      ? `${baseUrl}?sendUpdates=all`
      : `${baseUrl}/${encodeURIComponent(eventId ?? "")}?sendUpdates=all`;

  const response = await fetch(url, {
    method,
    headers: {
      Authorization: `Bearer ${accessToken}`,
      "Content-Type": "application/json",
    },
    body: JSON.stringify(body),
  });

  if (!response.ok) {
    const message = await response.text().catch(() => "");
    return {
      eventId: null,
      error: message || `Falha ao sincronizar evento (HTTP ${response.status}).`,
      notFound: response.status === 404,
    };
  }

  const payload = (await response.json().catch(() => null)) as { id?: string } | null;
  return { eventId: payload?.id ?? null };
}

export async function upsertCalendarEvent(
  input: UpsertCalendarEventInput,
): Promise<UpsertCalendarEventResult> {
  const accessToken = await getGoogleAccessToken();
  if (!accessToken) {
    return { ok: false, error: "Google Calendar não configurado." };
  }

  const calendarId = (await getSettingOrEnv("google_calendar_id"))?.trim() || "primary";
  const startDate = new Date(input.scheduledAt);
  if (Number.isNaN(startDate.getTime())) {
    return { ok: false, error: "Data/horário da reunião inválido." };
  }

  const endDate = new Date(startDate.getTime() + input.durationMinutes * 60_000);
  const startParts = getDateTimePartsInTimeZone(startDate, SAO_PAULO_TZ);
  const endParts = getDateTimePartsInTimeZone(endDate, SAO_PAULO_TZ);

  const uniqueAttendees = [
    ...new Set(input.attendees.map((email) => email.trim().toLowerCase()).filter(Boolean)),
  ];

  const eventBody = {
    summary: input.summary,
    description: input.description ?? undefined,
    start: {
      dateTime: formatGoogleDateTime(startParts),
      timeZone: SAO_PAULO_TZ,
    },
    end: {
      dateTime: formatGoogleDateTime(endParts),
      timeZone: SAO_PAULO_TZ,
    },
    attendees: uniqueAttendees.map((email) => ({ email })),
  };

  try {
    if (input.eventId) {
      const updated = await requestCalendarEvent(
        "PATCH",
        accessToken,
        calendarId,
        input.eventId,
        eventBody,
      );

      if (updated.eventId) {
        return { ok: true, eventId: updated.eventId };
      }

      if (!updated.notFound) {
        return { ok: false, error: updated.error ?? "Falha ao atualizar evento no Google Agenda." };
      }
    }

    const created = await requestCalendarEvent("POST", accessToken, calendarId, null, eventBody);
    if (!created.eventId) {
      return { ok: false, error: created.error ?? "Falha ao criar evento no Google Agenda." };
    }

    return { ok: true, eventId: created.eventId };
  } catch (error) {
    const message = error instanceof Error ? error.message : "Erro desconhecido";
    console.error("[google/calendar] upsert erro:", message);
    return { ok: false, error: message };
  }
}

export type DeleteCalendarEventResult = {
  ok: boolean;
  error?: string;
  notFound?: boolean;
};

export async function deleteCalendarEvent(eventId: string): Promise<DeleteCalendarEventResult> {
  const accessToken = await getGoogleAccessToken();
  if (!accessToken) {
    return { ok: false, error: "Google Calendar não configurado." };
  }

  const calendarId = (await getSettingOrEnv("google_calendar_id"))?.trim() || "primary";
  const url = `https://www.googleapis.com/calendar/v3/calendars/${encodeURIComponent(calendarId)}/events/${encodeURIComponent(eventId)}?sendUpdates=all`;

  try {
    const response = await fetch(url, {
      method: "DELETE",
      headers: { Authorization: `Bearer ${accessToken}` },
    });

    if (response.ok || response.status === 204) {
      return { ok: true };
    }

    if (response.status === 404 || response.status === 410) {
      return { ok: true, notFound: true };
    }

    const message = await response.text().catch(() => "");
    return {
      ok: false,
      error: message || `Falha ao cancelar evento no Google Agenda (HTTP ${response.status}).`,
    };
  } catch (error) {
    const message = error instanceof Error ? error.message : "Erro desconhecido";
    console.error("[google/calendar] delete erro:", message);
    return { ok: false, error: message };
  }
}

export async function getBusyTimes(input: {
  timeMin: string;
  timeMax: string;
  attendeeEmails: string[];
}): Promise<{ busy: CalendarEvent[]; error?: string }> {
  const normalizedAttendees = new Set(
    input.attendeeEmails.map((email) => email.trim().toLowerCase()).filter(Boolean),
  );

  const { events, error } = await listCalendarEvents({
    timeMin: input.timeMin,
    timeMax: input.timeMax,
  });

  if (normalizedAttendees.size === 0) {
    return { busy: [], error };
  }

  const busy = events.filter((event) =>
    event.attendeeEmails.some((email) => normalizedAttendees.has(email)),
  );

  return { busy, error };
}
