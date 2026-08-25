export const CHART_ANIMATION = {
  bar: {
    isAnimationActive: true,
    animationDuration: 1400,
    animationEasing: "ease-out" as const,
    animationBegin: 0,
  },
  pie: {
    isAnimationActive: true,
    animationDuration: 1500,
    animationEasing: "ease-out" as const,
    animationBegin: 200,
  },
} as const;

export const CHART_BAR_ACTIVE = {
  fill: "#60a5fa",
  stroke: "#93c5fd",
  strokeWidth: 1,
  radius: 6,
} as const;

export const CHART_BAR_ACTIVE_GREEN = {
  fill: "#4ade80",
  stroke: "#86efac",
  strokeWidth: 1,
  radius: 6,
} as const;

export const CHART_COLORS = ["#3b82f6", "#22c55e", "#f59e0b", "#ef4444", "#a855f7"];

export const CHART_AXIS_STYLE = { fill: "#94a3b8", fontSize: 12 };

export const CHART_GRID_STROKE = "#334155";

export const CHART_TOOLTIP_STYLE = {
  backgroundColor: "hsl(222 40% 10%)",
  border: "1px solid hsl(217 25% 20%)",
  borderRadius: "8px",
  color: "#ffffff",
};

export const CHART_TOOLTIP_ITEM_STYLE = {
  color: "#ffffff",
};

export const CHART_TOOLTIP_LABEL_STYLE = {
  color: "#ffffff",
};

export const CHART_TOOLTIP_PROPS = {
  contentStyle: CHART_TOOLTIP_STYLE,
  itemStyle: CHART_TOOLTIP_ITEM_STYLE,
  labelStyle: CHART_TOOLTIP_LABEL_STYLE,
  cursor: false,
  animationDuration: 200,
  animationEasing: "ease-out" as const,
};

export function dashboardEnterStyle(index: number, baseDelayMs = 70) {
  return {
    animationDelay: `${index * baseDelayMs}ms`,
  };
}
