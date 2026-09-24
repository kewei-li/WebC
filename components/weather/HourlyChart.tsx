"use client";

import { EChart } from "@/components/visualization/EChart";
import { useUnits } from "@/components/providers";
import type { Transition } from "@/lib/editorial-rules";
import { type Hour, fToC, fmtHour } from "@/lib/weather-primitives";

export function HourlyChart({ hours, transitions, onSelect }: { hours: Hour[]; transitions: Transition[]; onSelect?: (h: Hour) => void }) {
  const { units } = useUnits();
  const cv = (f: number | null) => (f == null ? null : Math.round(units === "F" ? f : fToC(f)));
  const hi = Math.max(...hours.map((h) => h.feelsF ?? h.tempF));
  const lo = Math.min(...hours.map((h) => h.tempF));
  const label = `Temperature, feels-like and rain chance chart for the next ${hours.length} hours. Temperatures range ${cv(lo)}° to ${cv(hi)}° feels-like.`;
  return (
    <EChart
      label={label}
      className="h-72 w-full"
      deps={[hours, transitions, units]}
      onClickIndex={(i) => onSelect?.(hours[i])}
      build={(c) => ({
        grid: { left: 36, right: 36, top: 36, bottom: 28 },
        legend: { top: 0, left: 0, itemWidth: 14, itemHeight: 8, textStyle: { color: c.ink2, fontSize: 11 } },
        tooltip: {
          trigger: "axis",
          backgroundColor: c.surface,
          borderColor: c.line,
          textStyle: { color: c.ink, fontSize: 12 },
          valueFormatter: (v: unknown) => (v == null ? "—" : String(v)),
        },
        xAxis: {
          type: "category",
          data: hours.map((h) => fmtHour(h.ts)),
          axisLine: { lineStyle: { color: c.line } },
          axisTick: { show: false },
          axisLabel: { color: c.ink3, fontSize: 11, interval: hours.length > 24 ? 3 : 1 },
        },
        yAxis: [
          { type: "value", scale: true, splitLine: { lineStyle: { color: c.line, type: "dashed" } }, axisLabel: { color: c.ink3, fontSize: 11, formatter: "{value}°" } },
          { type: "value", min: 0, max: 100, splitLine: { show: false }, axisLabel: { color: c.ink3, fontSize: 11, formatter: "{value}%" } },
        ],
        series: [
          {
            name: "Rain chance",
            type: "bar",
            yAxisIndex: 1,
            barWidth: "55%",
            data: hours.map((h) => h.pop),
            itemStyle: { color: c.rain, opacity: 0.55, borderRadius: [3, 3, 0, 0] },
          },
          {
            name: "Temperature",
            type: "line",
            smooth: true,
            symbol: "none",
            data: hours.map((h) => cv(h.tempF)),
            lineStyle: { color: c.heat, width: 2.5 },
            itemStyle: { color: c.heat },
            markLine: {
              symbol: "none",
              silent: true,
              label: { color: c.storm, fontSize: 11, formatter: "{b}" },
              lineStyle: { color: c.storm, type: "dashed" },
              data: transitions
                .filter((t) => t.kind !== "temp-peak")
                .map((t) => ({ name: t.label, xAxis: hours.findIndex((h) => h.ts === t.ts) }))
                .filter((d) => d.xAxis >= 0),
            },
          },
          {
            name: "Feels like",
            type: "line",
            smooth: true,
            symbol: "none",
            data: hours.map((h) => cv(h.feelsF)),
            lineStyle: { color: c.heat, width: 1.5, type: "dashed", opacity: 0.7 },
            itemStyle: { color: c.heat },
          },
        ],
      })}
    />
  );
}

export function WindChart({ hours }: { hours: Hour[] }) {
  return (
    <EChart
      label={`Wind speed and gust chart. Peak gust ${Math.max(0, ...hours.map((h) => h.gustMph ?? 0))} mph.`}
      className="h-44 w-full"
      deps={[hours]}
      build={(c) => ({
        grid: { left: 36, right: 12, top: 28, bottom: 24 },
        legend: { top: 0, left: 0, itemWidth: 14, itemHeight: 8, textStyle: { color: c.ink2, fontSize: 11 } },
        tooltip: { trigger: "axis", backgroundColor: c.surface, borderColor: c.line, textStyle: { color: c.ink, fontSize: 12 } },
        xAxis: { type: "category", data: hours.map((h) => fmtHour(h.ts)), axisLine: { lineStyle: { color: c.line } }, axisTick: { show: false }, axisLabel: { color: c.ink3, fontSize: 11, interval: 3 } },
        yAxis: { type: "value", splitLine: { lineStyle: { color: c.line, type: "dashed" } }, axisLabel: { color: c.ink3, fontSize: 11, formatter: "{value}" } },
        series: [
          { name: "Wind (mph)", type: "line", smooth: true, symbol: "none", data: hours.map((h) => h.windMph), lineStyle: { color: c.accent, width: 2 }, itemStyle: { color: c.accent }, areaStyle: { color: c.accent, opacity: 0.08 } },
          { name: "Gust (mph)", type: "line", smooth: true, symbol: "none", data: hours.map((h) => h.gustMph), lineStyle: { color: c.ink3, width: 1.5, type: "dashed" }, itemStyle: { color: c.ink3 } },
        ],
      })}
    />
  );
}
