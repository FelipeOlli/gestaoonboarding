import { NextResponse } from "next/server";

import { ADMIN_SETTING_GROUPS } from "@/lib/config/admin-settings";
import {
  getAdminSettingsMap,
  isAdminConfigured,
  listAdminSettings,
  setSettings,
} from "@/lib/services/settings";

export async function GET() {
  const configured = await isAdminConfigured();
  const settings = await getAdminSettingsMap();

  return NextResponse.json({
    configured,
    groups: ADMIN_SETTING_GROUPS.map((group) => ({
      ...group,
      fields: group.fields.map((field) => {
        const current = settings[field.key];
        return {
          ...field,
          configured: current?.configured ?? false,
          fromDatabase: current?.fromDatabase ?? false,
          fromEnv: current?.fromEnv ?? false,
          maskedValue: current?.maskedValue ?? null,
          value: current?.value ?? null,
        };
      }),
    })),
  });
}

export async function PATCH(request: Request) {
  const body = (await request.json().catch(() => null)) as Record<string, string | null> | null;
  if (!body) {
    return NextResponse.json({ error: "Payload inválido." }, { status: 400 });
  }

  await setSettings(body);
  const settings = await listAdminSettings();

  return NextResponse.json({ ok: true, settings });
}
