import type { MeetingSyncStatus } from "@/lib/db/schema";
import {
  deleteCalendarEvent,
  isGoogleCalendarConfigured,
  upsertCalendarEvent,
} from "@/lib/google/calendar";
import { getSettingOrEnv } from "@/lib/services/settings";

export type SyncMeetingCompany = {
  name: string;
  cnpj: string;
};

export type SyncMeetingInput = {
  meetingId: string;
  franchise: string;
  companies: SyncMeetingCompany[];
  scheduledAt: string;
  durationMinutes?: number;
  notes?: string | null;
  attendees?: string[];
  calendarEventId?: string | null;
};

export type SyncMeetingResult = {
  ok: boolean;
  calendarEventId?: string | null;
  syncStatus: MeetingSyncStatus;
  error?: string;
};

function buildMeetingEventTitle(franchise: string): string {
  return `${franchise.trim()} - ONBOARDING`;
}

function buildEventDescription(input: SyncMeetingInput): string {
  const lines = [`Franquia: ${input.franchise}`, "", "Empresas incluídas:"];

  for (const company of input.companies) {
    lines.push(`- ${company.name} (${company.cnpj})`);
  }

  if (input.notes?.trim()) {
    lines.push("", input.notes.trim());
  }

  return lines.join("\n");
}

async function syncViaN8n(input: SyncMeetingInput): Promise<SyncMeetingResult> {
  const webhookUrl = await getSettingOrEnv("n8n_meeting_webhook_url", "N8N_MEETING_WEBHOOK_URL");
  if (!webhookUrl) {
    return {
      ok: false,
      syncStatus: "failed",
      error: "URL do webhook n8n não configurada.",
    };
  }

  const secret = await getSettingOrEnv("n8n_webhook_secret", "N8N_WEBHOOK_SECRET");

  const headers: Record<string, string> = {
    "Content-Type": "application/json",
  };

  if (secret) {
    headers["x-webhook-secret"] = secret;
  }

  const googleClientId = await getSettingOrEnv("google_oauth_client_id");
  const googleClientSecret = await getSettingOrEnv("google_oauth_client_secret");
  const googleRefreshToken = await getSettingOrEnv("google_oauth_refresh_token");
  const googleCalendarId = await getSettingOrEnv("google_calendar_id");

  try {
    const response = await fetch(webhookUrl, {
      method: "POST",
      headers,
      body: JSON.stringify({
        meeting_id: input.meetingId,
        franchise: input.franchise,
        companies: input.companies,
        scheduled_at: input.scheduledAt,
        duration_minutes: input.durationMinutes ?? 60,
        notes: input.notes ?? null,
        attendees: input.attendees ?? [],
        calendar_event_id: input.calendarEventId ?? null,
        event_title: buildMeetingEventTitle(input.franchise),
        google: {
          client_id: googleClientId,
          client_secret: googleClientSecret,
          refresh_token: googleRefreshToken,
          calendar_id: googleCalendarId,
        },
      }),
    });

    if (!response.ok) {
      const message = await response.text().catch(() => "");
      return {
        ok: false,
        syncStatus: "failed",
        error: message || `Falha ao sincronizar reunião (HTTP ${response.status}).`,
      };
    }

    const payload = (await response.json().catch(() => null)) as
      | { calendar_event_id?: string | null; status?: string }
      | null;

    return {
      ok: true,
      calendarEventId: payload?.calendar_event_id ?? input.calendarEventId ?? null,
      syncStatus: "synced",
    };
  } catch (error) {
    return {
      ok: false,
      syncStatus: "failed",
      error: error instanceof Error ? error.message : "Erro desconhecido ao sincronizar reunião.",
    };
  }
}

export type CancelMeetingInput = {
  calendarEventId?: string | null;
};

export type CancelMeetingResult = {
  ok: boolean;
  error?: string;
};

export async function cancelMeeting(input: CancelMeetingInput): Promise<CancelMeetingResult> {
  if (!input.calendarEventId) {
    return { ok: true };
  }

  const googleConfigured = await isGoogleCalendarConfigured();
  if (!googleConfigured) {
    return { ok: true };
  }

  const result = await deleteCalendarEvent(input.calendarEventId);
  if (result.ok) {
    return { ok: true };
  }

  return {
    ok: false,
    error: result.error ?? "Não foi possível cancelar o evento no Google Agenda.",
  };
}

export async function syncMeeting(input: SyncMeetingInput): Promise<SyncMeetingResult> {
  const googleConfigured = await isGoogleCalendarConfigured();

  if (googleConfigured) {
    const googleResult = await upsertCalendarEvent({
      summary: buildMeetingEventTitle(input.franchise),
      description: buildEventDescription(input),
      scheduledAt: input.scheduledAt,
      durationMinutes: input.durationMinutes ?? 60,
      attendees: input.attendees ?? [],
      eventId: input.calendarEventId,
    });

    if (googleResult.ok) {
      return {
        ok: true,
        calendarEventId: googleResult.eventId ?? input.calendarEventId ?? null,
        syncStatus: "synced",
      };
    }

    const n8nFallback = await syncViaN8n(input);
    if (n8nFallback.ok) {
      return n8nFallback;
    }

    return {
      ok: false,
      syncStatus: "failed",
      error:
        googleResult.error ??
        n8nFallback.error ??
        "Não foi possível sincronizar a reunião com o Google Agenda.",
    };
  }

  const n8nResult = await syncViaN8n(input);
  if (n8nResult.ok) {
    return n8nResult;
  }

  return {
    ok: false,
    syncStatus: "failed",
    error:
      n8nResult.error ??
      "Google Calendar não configurado e webhook n8n indisponível.",
  };
}
