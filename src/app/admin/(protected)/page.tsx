import Link from "next/link";
import { Plug, Settings } from "lucide-react";
import { AdminPageHeader } from "@/components/admin/AdminShell";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { getAdminSettingsMap, isAdminConfigured } from "@/lib/services/settings";
import { ADMIN_SETTING_GROUPS } from "@/lib/config/admin-settings";

export const dynamic = "force-dynamic";

export default async function AdminHomePage() {
  const configured = await isAdminConfigured();
  const settings = await getAdminSettingsMap();

  const integrationSummary = ADMIN_SETTING_GROUPS.map((group) => {
    const configuredCount = group.fields.filter((field) => settings[field.key]?.configured).length;
    return {
      id: group.id,
      title: group.title,
      configuredCount,
      total: group.fields.length,
    };
  });

  return (
    <div>
      <AdminPageHeader
        title="Visão geral"
        description="Controle administrativo do painel, integrações e credenciais."
      />

      <div className="grid gap-4 md:grid-cols-2">
        <Card>
          <CardHeader>
            <CardTitle className="text-base">Acesso administrativo</CardTitle>
          </CardHeader>
          <CardContent className="space-y-3 text-sm text-muted-foreground">
            <p>
              Usuários administrativos:{" "}
              <span className={configured ? "text-emerald-400" : "text-rose-400"}>
                {configured ? "Ativos" : "Nenhum cadastrado"}
              </span>
            </p>
            <Button asChild variant="outline" size="sm">
              <Link href="/admin/sistema">
                <Settings className="mr-2 h-4 w-4" />
                Ver usuários
              </Link>
            </Button>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle className="text-base">Integrações</CardTitle>
          </CardHeader>
          <CardContent className="space-y-3">
            {integrationSummary.map((group) => (
              <div
                key={group.id}
                className="flex items-center justify-between rounded-lg border border-border px-3 py-2 text-sm"
              >
                <span>{group.title}</span>
                <span className="text-muted-foreground">
                  {group.configuredCount}/{group.total} configurados
                </span>
              </div>
            ))}
            <Button asChild size="sm">
              <Link href="/admin/integracoes">
                <Plug className="mr-2 h-4 w-4" />
                Abrir integrações
              </Link>
            </Button>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
