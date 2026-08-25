"use client";

import { Suspense, useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { AdminStatusBadge } from "@/components/admin/AdminShell";
import { GoogleConnectCard } from "@/components/admin/GoogleConnectCard";
import type { AdminSettingFieldType } from "@/lib/config/admin-settings";

type FieldState = {
  key: string;
  label: string;
  description?: string;
  type: AdminSettingFieldType;
  secret: boolean;
  placeholder?: string;
  configured: boolean;
  fromDatabase: boolean;
  fromEnv: boolean;
  maskedValue: string | null;
  value: string | null;
};

type GroupState = {
  id: string;
  title: string;
  description: string;
  fields: FieldState[];
};

export function IntegrationSettingsForm() {
  const router = useRouter();
  const [groups, setGroups] = useState<GroupState[]>([]);
  const [values, setValues] = useState<Record<string, string>>({});
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [message, setMessage] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    fetch("/api/admin/settings")
      .then((res) => res.json())
      .then((data: { groups: GroupState[] }) => {
        setGroups(data.groups);
        const initial: Record<string, string> = {};
        for (const group of data.groups) {
          for (const field of group.fields) {
            if (!field.secret && field.value) {
              initial[field.key] = field.value;
            }
          }
        }
        setValues(initial);
      })
      .finally(() => setLoading(false));
  }, []);

  function updateValue(key: string, value: string) {
    setValues((current) => ({ ...current, [key]: value }));
  }

  async function handleSubmit(event: React.FormEvent) {
    event.preventDefault();
    setSaving(true);
    setMessage(null);
    setError(null);

    try {
      const payload: Record<string, string | null> = {};
      for (const group of groups) {
        for (const field of group.fields) {
          const nextValue = values[field.key];
          if (nextValue !== undefined) {
            payload[field.key] = nextValue.trim() || null;
          }
        }
      }

      const response = await fetch("/api/admin/settings", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
      });

      if (!response.ok) {
        const data = (await response.json().catch(() => null)) as { error?: string } | null;
        setError(data?.error ?? "Não foi possível salvar as configurações.");
        return;
      }

      setMessage("Configurações salvas com sucesso.");
      router.refresh();
    } finally {
      setSaving(false);
    }
  }

  if (loading) {
    return <p className="text-sm text-muted-foreground">Carregando integrações...</p>;
  }

  return (
    <form className="space-y-6" onSubmit={handleSubmit}>
      {groups.map((group) => (
        <Card key={group.id}>
          <CardHeader>
            <CardTitle className="text-base">{group.title}</CardTitle>
            <p className="text-sm text-muted-foreground">{group.description}</p>
          </CardHeader>
          <CardContent className="space-y-4">
            {group.id === "google" ? (
              <Suspense fallback={<p className="text-sm text-muted-foreground">Carregando OAuth...</p>}>
                <GoogleConnectCard />
              </Suspense>
            ) : null}
            {group.fields.map((field) => (
              <div key={field.key} className="space-y-2 rounded-lg border border-border p-4">
                <div className="flex flex-wrap items-center justify-between gap-2">
                  <Label htmlFor={field.key}>{field.label}</Label>
                  <AdminStatusBadge
                    configured={field.configured}
                    fromEnv={field.fromEnv}
                  />
                </div>
                {field.description ? (
                  <p className="text-xs text-muted-foreground">{field.description}</p>
                ) : null}
                {field.secret && field.maskedValue ? (
                  <p className="text-xs text-muted-foreground">
                    Valor atual: <span className="font-mono">{field.maskedValue}</span>
                  </p>
                ) : null}
                <Input
                  id={field.key}
                  type={field.type === "password" ? "password" : "text"}
                  placeholder={
                    field.placeholder ??
                    (field.secret ? "Informe um novo valor para substituir" : "")
                  }
                  value={values[field.key] ?? ""}
                  onChange={(e) => updateValue(field.key, e.target.value)}
                  disabled={saving || field.key === "google_oauth_refresh_token"}
                  readOnly={field.key === "google_oauth_refresh_token"}
                />
              </div>
            ))}
          </CardContent>
        </Card>
      ))}

      {message ? <p className="text-sm text-emerald-400">{message}</p> : null}
      {error ? <p className="text-sm text-rose-400">{error}</p> : null}

      <Button type="submit" disabled={saving}>
        {saving ? "Salvando..." : "Salvar integrações"}
      </Button>
    </form>
  );
}
