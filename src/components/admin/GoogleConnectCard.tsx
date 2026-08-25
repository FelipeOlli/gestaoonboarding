"use client";

import { useEffect, useState } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { Link2, Unlink } from "lucide-react";
import { Button } from "@/components/ui/button";
import { AdminStatusBadge } from "@/components/admin/AdminShell";

type GoogleStatus = {
  connected: boolean;
  email: string | null;
  connectedAt: string | null;
  calendarId: string | null;
  credentialsConfigured: boolean;
  redirectUriHint: string;
};

export function GoogleConnectCard() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const [status, setStatus] = useState<GoogleStatus | null>(null);
  const [loading, setLoading] = useState(true);
  const [disconnecting, setDisconnecting] = useState(false);
  const [banner, setBanner] = useState<{ type: "success" | "error"; message: string } | null>(
    null,
  );

  async function loadStatus() {
    const response = await fetch("/api/admin/integrations/google/status");
    const data = (await response.json()) as GoogleStatus;
    setStatus(data);
  }

  useEffect(() => {
    loadStatus().finally(() => setLoading(false));
  }, []);

  useEffect(() => {
    const connected = searchParams.get("google");
    const error = searchParams.get("google_error");

    if (connected === "connected") {
      setBanner({
        type: "success",
        message: "Conta Google conectada com sucesso. O refresh token foi salvo automaticamente.",
      });
      loadStatus();
      router.replace("/admin/integracoes");
    } else if (error) {
      const messages: Record<string, string> = {
        missing_credentials:
          "Configure e salve o Client ID e o Client Secret antes de conectar a conta Google.",
        missing_refresh_token:
          "O Google não retornou refresh token. Revogue o acesso do app em myaccount.google.com/permissions e tente novamente.",
        invalid_state: "Sessão OAuth inválida ou expirada. Tente conectar novamente.",
        access_denied: "Autorização cancelada no Google.",
      };

      setBanner({
        type: "error",
        message: messages[error] ?? `Falha na conexão com o Google: ${error}`,
      });
      router.replace("/admin/integracoes");
    }
  }, [searchParams, router]);

  async function disconnect() {
    setDisconnecting(true);
    try {
      await fetch("/api/admin/integrations/google/status", { method: "DELETE" });
      setBanner({ type: "success", message: "Conta Google desconectada." });
      await loadStatus();
    } finally {
      setDisconnecting(false);
    }
  }

  if (loading) {
    return <p className="text-sm text-muted-foreground">Verificando conexão Google...</p>;
  }

  return (
    <div className="space-y-4 rounded-lg border border-border bg-muted/20 p-4">
      <div className="flex flex-wrap items-center justify-between gap-2">
        <div>
          <p className="text-sm font-medium text-foreground">Conexão OAuth</p>
          <p className="text-xs text-muted-foreground">
            Gera automaticamente o refresh token após autorização no Google.
          </p>
        </div>
        <AdminStatusBadge configured={Boolean(status?.connected)} />
      </div>

      {status?.connected ? (
        <div className="space-y-1 text-sm text-muted-foreground">
          <p>
            Conta conectada:{" "}
            <span className="text-foreground">{status.email || "—"}</span>
          </p>
          <p>
            Calendar ID: <span className="text-foreground">{status.calendarId || "primary"}</span>
          </p>
          {status.connectedAt ? (
            <p className="text-xs">
              Conectado em: {new Date(status.connectedAt).toLocaleString("pt-BR")}
            </p>
          ) : null}
        </div>
      ) : (
        <p className="text-sm text-muted-foreground">
          Nenhuma conta Google conectada. Salve o Client ID e o Client Secret abaixo e clique em
          conectar.
        </p>
      )}

      <div className="rounded-md border border-dashed border-border bg-card/50 p-3 text-xs text-muted-foreground">
        <p className="font-medium text-foreground">Redirect URI no Google Cloud Console</p>
        <code className="mt-1 block break-all">
          {typeof window !== "undefined"
            ? `${window.location.origin}${status?.redirectUriHint ?? "/api/admin/integrations/google/callback"}`
            : status?.redirectUriHint}
        </code>
      </div>

      <div className="flex flex-wrap gap-2">
        <Button asChild type="button" disabled={!status?.credentialsConfigured}>
          <a href="/api/admin/integrations/google/authorize">
            <Link2 className="mr-2 h-4 w-4" />
            Conectar conta Google
          </a>
        </Button>

        {status?.connected ? (
          <Button
            type="button"
            variant="outline"
            onClick={disconnect}
            disabled={disconnecting}
          >
            <Unlink className="mr-2 h-4 w-4" />
            {disconnecting ? "Desconectando..." : "Desconectar"}
          </Button>
        ) : null}
      </div>

      {!status?.credentialsConfigured ? (
        <p className="text-xs text-amber-400">
          Preencha e salve o Client ID e o Client Secret antes de conectar.
        </p>
      ) : null}

      {banner ? (
        <p className={banner.type === "success" ? "text-sm text-emerald-400" : "text-sm text-rose-400"}>
          {banner.message}
        </p>
      ) : null}
    </div>
  );
}
