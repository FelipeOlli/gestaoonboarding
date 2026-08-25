"use client";

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
  CHART_COLORS,
  CHART_GRID_STROKE,
  CHART_TOOLTIP_PROPS,
  dashboardEnterStyle,
} from "@/components/charts/chart-config";
import { ChartPlaceholder, useChartReady } from "@/components/charts/use-chart-ready";
import type { FiscalDashboardMetrics } from "@/lib/services/fiscal-dashboard";

const KPI_ITEMS: Array<{
  title: string;
  getValue: (metrics: FiscalDashboardMetrics) => string;
}> = [
  { title: "Total fiscal", getValue: (m) => String(m.kpis.total_fiscal) },
  { title: "Em onboarding fiscal", getValue: (m) => String(m.kpis.em_onboarding) },
  { title: "Homologadas", getValue: (m) => String(m.kpis.homologadas) },
  { title: "Sem analista", getValue: (m) => String(m.kpis.sem_analista) },
];

export function FiscalDashboard({ metrics }: { metrics: FiscalDashboardMetrics }) {
  const chartReady = useChartReady();

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

      <div className="grid gap-4 lg:grid-cols-2">
        <ChartCard title="Empresas por tributação" style={dashboardEnterStyle(0, 100)}>
          {chartReady ? (
            <div className="animate-dashboard-chart-enter" style={dashboardEnterStyle(1, 100)}>
              <ResponsiveContainer width="100%" height={260}>
                <BarChart data={metrics.por_tributacao} margin={{ left: 8, right: 8 }}>
                  <CartesianGrid stroke={CHART_GRID_STROKE} strokeDasharray="3 3" />
                  <XAxis dataKey="tributacao" tick={CHART_AXIS_STYLE} axisLine={{ stroke: CHART_GRID_STROKE }} />
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
                    activeBar={CHART_BAR_ACTIVE}
                    {...CHART_ANIMATION.bar}
                  />
                </BarChart>
              </ResponsiveContainer>
            </div>
          ) : (
            <ChartPlaceholder height={260} />
          )}
        </ChartCard>

        <ChartCard title="Carteira por analista" style={dashboardEnterStyle(1, 100)}>
          {chartReady ? (
            <div className="animate-dashboard-chart-enter" style={dashboardEnterStyle(2, 100)}>
              <ResponsiveContainer width="100%" height={260}>
                <PieChart margin={{ top: 8, right: 16, bottom: 8, left: 16 }}>
                  <Pie
                    data={metrics.por_analista}
                    dataKey="quantidade"
                    nameKey="analista"
                    cx="50%"
                    cy="45%"
                    innerRadius={52}
                    outerRadius={72}
                    paddingAngle={metrics.por_analista.length > 1 ? 3 : 0}
                    {...CHART_ANIMATION.pie}
                  >
                    {metrics.por_analista.map((_, index) => (
                      <Cell key={index} fill={CHART_COLORS[index % CHART_COLORS.length]} />
                    ))}
                  </Pie>
                  <Tooltip {...CHART_TOOLTIP_PROPS} />
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
  children,
  style,
}: {
  title: string;
  children: React.ReactNode;
  style?: React.CSSProperties;
}) {
  return (
    <Card className="animate-dashboard-enter border-border bg-card" style={style}>
      <CardHeader>
        <CardTitle className="text-base text-foreground">{title}</CardTitle>
      </CardHeader>
      <CardContent>{children}</CardContent>
    </Card>
  );
}
