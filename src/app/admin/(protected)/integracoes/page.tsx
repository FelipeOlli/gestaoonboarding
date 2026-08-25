import { AdminPageHeader } from "@/components/admin/AdminShell";
import { IntegrationSettingsForm } from "@/components/admin/IntegrationSettingsForm";

export const dynamic = "force-dynamic";

export default function AdminIntegrationsPage() {
  return (
    <div>
      <AdminPageHeader
        title="Integrações"
        description="Configure URLs, secrets e credenciais OAuth do Google, n8n e CNPJ.ws."
      />
      <IntegrationSettingsForm />
    </div>
  );
}
