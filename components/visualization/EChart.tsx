"use client";

import { BarChart, LineChart } from "echarts/charts";
import { GridComponent, LegendComponent, MarkAreaComponent, MarkLineComponent, TooltipComponent } from "echarts/components";
import * as echarts from "echarts/core";
import { CanvasRenderer } from "echarts/renderers";
import { useEffect, useRef } from "react";
import { useResolvedTheme } from "@/lib/theme";
import { useMediaQuery } from "@/lib/use-weather";

echarts.use([LineChart, BarChart, GridComponent, TooltipComponent, LegendComponent, MarkLineComponent, MarkAreaComponent, CanvasRenderer]);

export type ThemeColors = Record<"ink" | "ink2" | "ink3" | "line" | "surface" | "rain" | "heat" | "storm" | "accent" | "ok", string>;

export function readTheme(): ThemeColors {
  const s = getComputedStyle(document.documentElement);
  const v = (n: string) => s.getPropertyValue(n).trim();
  return { ink: v("--ink"), ink2: v("--ink-2"), ink3: v("--ink-3"), line: v("--line"), surface: v("--surface"), rain: v("--rain"), heat: v("--heat"), storm: v("--storm"), accent: v("--accent"), ok: v("--ok") };
}

/** Thin ECharts host for conventional dense charts. `option` is built from theme colours. */
export function EChart({
  build,
  deps,
  className = "h-72",
  label,
  onClickIndex,
}: {
  build: (c: ThemeColors) => echarts.EChartsCoreOption;
  deps: unknown[];
  className?: string;
  label: string;
  onClickIndex?: (i: number) => void;
}) {
  const el = useRef<HTMLDivElement>(null);
  const chart = useRef<echarts.ECharts | null>(null);
  const dark = useResolvedTheme() === "dark";
  const reduce = useMediaQuery("(prefers-reduced-motion: reduce)");
  const click = useRef(onClickIndex);
  useEffect(() => {
    click.current = onClickIndex;
  });

  useEffect(() => {
    if (!el.current) return;
    const c = echarts.init(el.current, undefined, { renderer: "canvas" });
    chart.current = c;
    c.on("click", (p) => typeof p.dataIndex === "number" && click.current?.(p.dataIndex));
    const ro = new ResizeObserver(() => c.resize());
    ro.observe(el.current);
    return () => {
      ro.disconnect();
      c.dispose();
      chart.current = null;
    };
  }, []);

  useEffect(() => {
    chart.current?.setOption({ animation: !reduce, ...build(readTheme()) }, true);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [dark, reduce, ...deps]);

  return <div ref={el} role="img" aria-label={label} className={className} />;
}
