import { AdminPageHeader } from "@/components/admin/AdminShell";
import { SectorEmailsForm } from "@/components/admin/SectorEmailsForm";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import {
  countAdminUsers,
  DEFAULT_ADMIN_PASSWORD,
  DEFAULT_ADMIN_USERNAME,
} from "@/lib/services/admin-users";

export const dynamic = "force-dynamic";

export default async function AdminSystemPage() {
  const userCount = await countAdminUsers();

  return (
    <div>
      <AdminPageHeader
        title="Sistema"
        description="Usuários administrativos e responsáveis por setor para convites de reunião."
      />

      <div className="space-y-6">
        <SectorEmailsForm />

        <Card>
        <CardHeader>
          <CardTitle className="text-base">Usuários administrativos</CardTitle>
        </CardHeader>
        <CardContent className="space-y-3 text-sm text-muted-foreground">
          <p>
            Usuários ativos: <span className="text-foreground">{userCount}</span>
          </p>
          <p>
            Usuário padrão inicial:{" "}
            <code className="text-foreground">{DEFAULT_ADMIN_USERNAME}</code> /{" "}
            <code className="text-foreground">{DEFAULT_ADMIN_PASSWORD}</code>
          </p>
          <p className="text-xs">
            O usuário padrão é criado automaticamente no primeiro login, caso ainda não exista no
            banco de dados.
          </p>
        </CardContent>
      </Card>
      </div>
    </div>
  );
}
