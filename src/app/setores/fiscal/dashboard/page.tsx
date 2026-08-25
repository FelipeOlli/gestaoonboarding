import { FiscalDashboard } from "@/components/sectors/FiscalDashboard";
import { getFiscalDashboardMetrics } from "@/lib/services/fiscal-dashboard";

export const dynamic = "force-dynamic";

export default async function FiscalDashboardPage() {
  const metrics = await getFiscalDashboardMetrics();

  return (
    <div className="space-y-6">
      <div>
        <h2 className="text-2xl font-bold text-foreground">Dashboard Fiscal</h2>
        <p className="text-sm text-muted-foreground">
          Onboarding fiscal, distribuição por tributação e carteira de analistas.
        </p>
      </div>

      <FiscalDashboard metrics={metrics} />
    </div>
  );
}
