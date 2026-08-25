"use client";

import { useEffect, useState } from "react";

export function useChartReady() {
  const [ready, setReady] = useState(false);

  useEffect(() => {
    const timer = window.setTimeout(() => setReady(true), 80);
    return () => window.clearTimeout(timer);
  }, []);

  return ready;
}

export function ChartPlaceholder({ height = 240 }: { height?: number }) {
  return (
    <div
      className="animate-pulse rounded-lg bg-muted/20"
      style={{ height }}
      aria-hidden="true"
    />
  );
}
