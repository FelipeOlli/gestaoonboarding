import { PrecificacaoDashboard } from "@/components/sectors/PrecificacaoDashboard";
import { getDashboardMetrics } from "@/lib/services/companies";

export const dynamic = "force-dynamic";

export default async function PrecificacaoDashboardPage() {
  const metrics = await getDashboardMetrics();

  return (
    <div className="space-y-6">
      <div>
        <h2 className="text-2xl font-bold text-foreground">Dashboard</h2>
        <p className="text-sm text-muted-foreground">
          KPIs e gráficos de precificação, faturamento e setores contratados.
        </p>
      </div>

      <PrecificacaoDashboard metrics={metrics} />
    </div>
  );
}
