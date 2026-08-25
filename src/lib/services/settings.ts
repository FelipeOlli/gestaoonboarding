import { eq, inArray } from "drizzle-orm";

import { appSettings } from "@/lib/db/schema";
import { getDb } from "@/lib/db";
import {
  ADMIN_SETTING_GROUPS,
  ALL_ADMIN_SETTING_KEYS,
  SECRET_ADMIN_SETTING_KEYS,
} from "@/lib/config/admin-settings";
import type { SectorTabId } from "@/lib/config/sector-tabs";
import { hasAdminUsers } from "@/lib/services/admin-users";

const ADMIN_ACCESS_TOKEN_KEY = "admin_access_token";

export async function getSetting(key: string): Promise<string | null> {
  const db = getDb();
  const row = await db.query.appSettings.findFirst({
    where: eq(appSettings.key, key),
  });
  return row?.value ?? null;
}

export async function getSettingOrEnv(key: string, envKey?: string): Promise<string | null> {
  const fromDb = (await getSetting(key))?.trim();
  if (fromDb) return fromDb;

  if (!envKey) return null;
  return process.env[envKey]?.trim() || null;
}

export async function getAdminAccessToken(): Promise<string | null> {
  const fromDb = (await getSetting(ADMIN_ACCESS_TOKEN_KEY))?.trim();
  if (fromDb) return fromDb;
  return process.env.ADMIN_ACCESS_TOKEN?.trim() || null;
}

export async function setSetting(key: string, value: string | null): Promise<void> {
  const db = getDb();
  const normalized = value?.trim() || null;

  if (!normalized) {
    await db.delete(appSettings).where(eq(appSettings.key, key));
    return;
  }

  await db
    .insert(appSettings)
    .values({ key, value: normalized })
    .onConflictDoUpdate({
      target: appSettings.key,
      set: { value: normalized, updatedAt: new Date().toISOString() },
    });
}

export async function setSettings(values: Record<string, string | null>): Promise<void> {
  for (const [key, value] of Object.entries(values)) {
    if (!ALL_ADMIN_SETTING_KEYS.includes(key) && key !== ADMIN_ACCESS_TOKEN_KEY) continue;
    await setSetting(key, value);
  }
}

export type AdminSettingView = {
  key: string;
  configured: boolean;
  fromDatabase: boolean;
  fromEnv: boolean;
  maskedValue: string | null;
  value: string | null;
};

function maskSecret(value: string) {
  if (value.length <= 4) return "••••";
  return `${"•".repeat(Math.min(value.length - 4, 12))}${value.slice(-4)}`;
}

function getFieldDefinition(key: string) {
  for (const group of ADMIN_SETTING_GROUPS) {
    const field = group.fields.find((item) => item.key === key);
    if (field) return field;
  }
  return undefined;
}

function resolveFieldValue(
  key: string,
  dbValue: string | null,
): Pick<AdminSettingView, "configured" | "fromDatabase" | "fromEnv" | "value" | "maskedValue"> {
  const field = getFieldDefinition(key);
  const envValue = field?.envFallback ? process.env[field.envFallback]?.trim() || null : null;
  const value = dbValue?.trim() || envValue;
  const fromDatabase = Boolean(dbValue?.trim());
  const fromEnv = !fromDatabase && Boolean(envValue);
  const configured = Boolean(value);
  const isSecret = SECRET_ADMIN_SETTING_KEYS.has(key);

  return {
    configured,
    fromDatabase,
    fromEnv,
    value: isSecret ? null : value,
    maskedValue: configured && isSecret && value ? maskSecret(value) : value,
  };
}

export async function listAdminSettings(
  keys: string[] = ALL_ADMIN_SETTING_KEYS,
): Promise<AdminSettingView[]> {
  const db = getDb();
  const rows = await db.query.appSettings.findMany({
    where: inArray(appSettings.key, keys),
  });
  const map = new Map(rows.map((row) => [row.key, row.value]));

  return keys.map((key) => {
    const dbValue = map.get(key) ?? null;
    return {
      key,
      ...resolveFieldValue(key, dbValue),
    };
  });
}

export async function getAdminSettingsMap(): Promise<Record<string, AdminSettingView>> {
  const settings = await listAdminSettings();
  return Object.fromEntries(settings.map((item) => [item.key, item]));
}

export async function getEnabledSectorTabsFromSettings(): Promise<SectorTabId[]> {
  const raw =
    (await getSettingOrEnv("enabled_sector_tabs", "ENABLED_SECTOR_TABS")) ?? "precificacao,fiscal";

  return raw
    .split(",")
    .map((item) => item.trim())
    .filter((item): item is SectorTabId =>
      ["precificacao", "fiscal", "dp", "contabil"].includes(item),
    );
}

export async function isAdminConfigured(): Promise<boolean> {
  return hasAdminUsers();
}
