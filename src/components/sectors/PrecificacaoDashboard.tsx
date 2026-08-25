"use client";

import { useState } from "react";
import {
  Bar,
  BarChart,
  CartesianGrid,
  Cell,
  Pie,
  PieChart,
  Legend,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from "recharts";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import {
  CHART_ANIMATION,
  CHART_AXIS_STYLE,
  CHART_BAR_ACTIVE,
  CHART_BAR_ACTIVE_GREEN,
  CHART_COLORS,
  CHART_GRID_STROKE,
  CHART_TOOLTIP_PROPS,
  dashboardEnterStyle,
} from "@/components/charts/chart-config";
import { ChartPlaceholder, useChartReady } from "@/components/charts/use-chart-ready";
import { SectorCompaniesDialog } from "@/components/sectors/SectorCompaniesDialog";
import { formatCurrency } from "@/lib/utils";
import type { DashboardMetrics } from "@/lib/services/companies";

type SectorChartRow = {
  setor: string;
  quantidade?: number;
  valor?: number;
};

const KPI_ITEMS: Array<{
  title: string;
  getValue: (metrics: DashboardMetrics) => string;
}> = [
  { title: "Total de empresas", getValue: (m) => String(m.kpis.total_empresas) },
  { title: "Contratos assinados", getValue: (m) => String(m.kpis.contratos_assinados) },
  { title: "PR pendente", getValue: (m) => String(m.kpis.pr_pendente) },
  { title: "Reuniões agendadas", getValue: (m) => String(m.kpis.reunioes_agendadas) },
  { title: "Receita potencial", getValue: (m) => formatCurrency(m.kpis.receita_potencial) },
  { title: "Valores faturados", getValue: (m) => formatCurrency(m.kpis.valor_faturado) },
  { title: "Valores pendentes", getValue: (m) => formatCurrency(m.kpis.valor_pendente) },
  { title: "Ticket médio", getValue: (m) => formatCurrency(m.kpis.ticket_medio) },
];

export function PrecificacaoDashboard({ metrics }: { metrics: DashboardMetrics }) {
  const chartReady = useChartReady();
  const [selectedSector, setSelectedSector] = useState<string | null>(null);
  const [dialogOpen, setDialogOpen] = useState(false);

  const faturamentoData = [
    { name: "Faturado", value: metrics.faturamento.valor_faturado },
    { name: "Pendente", value: metrics.faturamento.valor_pendente },
  ];

  function openSectorCompanies(sectorName: string) {
    setSelectedSector(sectorName);
    setDialogOpen(true);
  }

  function handleSectorBarClick(data: { payload?: SectorChartRow; setor?: string }) {
    const sectorName = data.payload?.setor ?? data.setor;
    if (!sectorName) return;
    openSectorCompanies(sectorName);
  }

  return (
    <div className="space-y-6">
      <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-4">
        {KPI_ITEMS.map((item, index) => (
          <KpiCard
            key={item.title}
            title={item.title}
            value={item.getValue(metrics)}
            style={dashboardEnterStyle(index)}
          />
        ))}
      </div>

      <div className="grid gap-4 lg:grid-cols-2 xl:grid-cols-3">
        <ChartCard
          title="Empresas por setor"
          hint="Clique em uma barra para ver as empresas"
          style={dashboardEnterStyle(0, 100)}
        >
          {chartReady ? (
            <div className="animate-dashboard-chart-enter" style={dashboardEnterStyle(1, 100)}>
              <ResponsiveContainer width="100%" height={240}>
                <BarChart data={metrics.empresas_por_setor}>
                  <CartesianGrid stroke={CHART_GRID_STROKE} strokeDasharray="3 3" />
                  <XAxis dataKey="setor" tick={CHART_AXIS_STYLE} axisLine={{ stroke: CHART_GRID_STROKE }} />
                  <YAxis
                    allowDecimals={false}
                    tick={CHART_AXIS_STYLE}
                    axisLine={{ stroke: CHART_GRID_STROKE }}
                  />
                  <Tooltip {...CHART_TOOLTIP_PROPS} />
                  <Bar
                    dataKey="quantidade"
                    fill="#3b82f6"
                    radius={6}
                    className="cursor-pointer"
                    activeBar={CHART_BAR_ACTIVE}
                    {...CHART_ANIMATION.bar}
                    onClick={(row) =>
                      handleSectorBarClick(row as { payload?: SectorChartRow; setor?: string })
                    }
                  />
                </BarChart>
              </ResponsiveContainer>
            </div>
          ) : (
            <ChartPlaceholder height={240} />
          )}
        </ChartCard>

        <ChartCard
          title="Valor por setor"
          hint="Clique em uma barra para ver as empresas"
          style={dashboardEnterStyle(1, 100)}
        >
          {chartReady ? (
            <div className="animate-dashboard-chart-enter" style={dashboardEnterStyle(2, 100)}>
              <ResponsiveContainer width="100%" height={240}>
                <BarChart data={metrics.valor_por_setor}>
                  <CartesianGrid stroke={CHART_GRID_STROKE} strokeDasharray="3 3" />
                  <XAxis dataKey="setor" tick={CHART_AXIS_STYLE} axisLine={{ stroke: CHART_GRID_STROKE }} />
                  <YAxis tick={CHART_AXIS_STYLE} axisLine={{ stroke: CHART_GRID_STROKE }} />
                  <Tooltip
                    {...CHART_TOOLTIP_PROPS}
                    formatter={(value: number) => formatCurrency(value)}
                  />
                  <Bar
                    dataKey="valor"
                    fill="#22c55e"
                    radius={6}
                    className="cursor-pointer"
                    activeBar={CHART_BAR_ACTIVE_GREEN}
                    {...CHART_ANIMATION.bar}
                    animationBegin={180}
                    onClick={(row) =>
                      handleSectorBarClick(row as { payload?: SectorChartRow; setor?: string })
                    }
                  />
                </BarChart>
              </ResponsiveContainer>
            </div>
          ) : (
            <ChartPlaceholder height={240} />
          )}
        </ChartCard>

        <ChartCard title="Faturamento" style={dashboardEnterStyle(2, 100)}>
          {chartReady ? (
            <div className="animate-dashboard-chart-enter" style={dashboardEnterStyle(3, 100)}>
              <ResponsiveContainer width="100%" height={260}>
                <PieChart margin={{ top: 8, right: 16, bottom: 8, left: 16 }}>
                  <Pie
                    data={faturamentoData}
                    dataKey="value"
                    nameKey="name"
                    cx="50%"
                    cy="45%"
                    innerRadius={52}
                    outerRadius={72}
                    paddingAngle={faturamentoData.length > 1 ? 3 : 0}
                    {...CHART_ANIMATION.pie}
                  >
                    {faturamentoData.map((_, index) => (
                      <Cell key={index} fill={CHART_COLORS[index % CHART_COLORS.length]} />
                    ))}
                  </Pie>
                  <Tooltip
                    {...CHART_TOOLTIP_PROPS}
                    formatter={(value: number) => formatCurrency(value)}
                  />
                  <Legend
                    verticalAlign="bottom"
                    align="center"
                    iconType="circle"
                    iconSize={8}
                    wrapperStyle={{ paddingTop: 12, fontSize: 12, color: "#94a3b8" }}
                  />
                </PieChart>
              </ResponsiveContainer>
            </div>
          ) : (
            <ChartPlaceholder height={260} />
          )}
        </ChartCard>
      </div>

      <SectorCompaniesDialog
        open={dialogOpen}
        onOpenChange={setDialogOpen}
        sectorName={selectedSector}
      />
    </div>
  );
}

function KpiCard({
  title,
  value,
  style,
}: {
  title: string;
  value: string;
  style?: React.CSSProperties;
}) {
  return (
    <Card className="animate-dashboard-enter border-border bg-card" style={style}>
      <CardHeader className="pb-2">
        <CardTitle className="text-sm font-medium text-muted-foreground">{title}</CardTitle>
      </CardHeader>
      <CardContent>
        <p className="text-2xl font-bold text-foreground">{value}</p>
      </CardContent>
    </Card>
  );
}

function ChartCard({
  title,
  hint,
  children,
  style,
}: {
  title: string;
  hint?: string;
  children: React.ReactNode;
  style?: React.CSSProperties;
}) {
  return (
    <Card className="animate-dashboard-enter border-border bg-card" style={style}>
      <CardHeader>
        <CardTitle className="text-base text-foreground">{title}</CardTitle>
        {hint ? <p className="text-xs text-muted-foreground">{hint}</p> : null}
      </CardHeader>
      <CardContent>{children}</CardContent>
    </Card>
  );
}
