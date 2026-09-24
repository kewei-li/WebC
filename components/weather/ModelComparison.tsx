"use client";

import { Layers3 } from "lucide-react";
import { EChart } from "@/components/visualization/EChart";
import type { ModelSpread } from "@/lib/editorial-rules";
import { type Hour, HOUR, fmtHour } from "@/lib/weather-primitives";
import { ConfidenceBadge } from "./ConfidenceBadge";

const MODEL_COLORS = ["#2b64c8", "#c85a1c", "#6b48c2", "#2d7a4c"];

/** Forecast Uncertainty: each model's rain chance vs the blended forecast. */
export function ModelComparison({ spread, hours, onEvidence }: { spread: ModelSpread; hours: Hour[]; onEvidence?: () => void }) {
  const t0 = hours[0]?.ts ?? 0;
  const labels = Array.from({ length: 24 }, (_, i) => fmtHour(t0 + i * HOUR));
  const label = `Model comparison: ${spread.models
    .map((m) => `${m.name} ${m.rainStart ? `starts rain at ${fmtHour(m.rainStart)}` : "stays mostly dry"}`)
    .join("; ")}. Blended forecast shown dashed.`;
  return (
    <section aria-label="Forecast uncertainty" className="card p-5 sm:p-6">
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div>
          <p className="eyebrow flex items-center gap-1.5"><Layers3 size={14} /> Forecast uncertainty</p>
          <h3 className="mt-1.5 font-serif text-2xl leading-snug">
            Models disagree by {spread.startSpreadH} hours on when rain starts{spread.dryModels ? ` — ${spread.dryModels} keeps it dry` : ""}.
          </h3>
        </div>
        <ConfidenceBadge confidence={spread.confidence} onClick={onEvidence} />
      </div>
      <EChart
        label={label}
        className="mt-3 h-60 w-full"
        deps={[spread, hours]}
        build={(c) => ({
          grid: { left: 36, right: 12, top: 32, bottom: 24 },
          legend: { top: 0, left: 0, itemWidth: 14, itemHeight: 8, textStyle: { color: c.ink2, fontSize: 11 } },
          tooltip: { trigger: "axis", backgroundColor: c.surface, borderColor: c.line, textStyle: { color: c.ink, fontSize: 12 }, valueFormatter: (v: unknown) => `${v}%` },
          xAxis: { type: "category", data: labels, axisLine: { lineStyle: { color: c.line } }, axisTick: { show: false }, axisLabel: { color: c.ink3, fontSize: 11, interval: 2 } },
          yAxis: { type: "value", min: 0, max: 100, splitLine: { lineStyle: { color: c.line, type: "dashed" } }, axisLabel: { color: c.ink3, fontSize: 11, formatter: "{value}%" } },
          series: [
            ...spread.models.map((m, i) => ({
              name: m.name,
              type: "line",
              smooth: true,
              symbol: "none",
              data: m.pop,
              lineStyle: { width: 2, color: MODEL_COLORS[i % 4] },
              itemStyle: { color: MODEL_COLORS[i % 4] },
            })),
            {
              name: "Blended (NWS-style)",
              type: "line",
              smooth: true,
              symbol: "none",
              data: hours.slice(0, 24).map((h) => h.pop),
              lineStyle: { width: 3, type: "dashed", color: c.ink },
              itemStyle: { color: c.ink },
            },
          ],
        })}
      />
      <dl className="mt-3 grid grid-cols-2 gap-3 text-sm sm:grid-cols-4">
        {spread.models.map((m, i) => (
          <div key={m.name} className="rounded-xl bg-surface-2 px-3 py-2">
            <dt className="flex items-center gap-1.5 text-xs text-ink-3">
              <span className="size-2 rounded-full" style={{ background: MODEL_COLORS[i % 4] }} aria-hidden />
              {m.name}
            </dt>
            <dd className="tnum font-medium">{m.rainStart ? `Rain from ${fmtHour(m.rainStart)}` : "Mostly dry"}</dd>
            <dd className="tnum text-xs text-ink-2">{m.totalIn.toFixed(2)} in</dd>
          </div>
        ))}
      </dl>
      <p className="mt-3 text-sm text-ink-2">
        What to do: keep plans flexible after {fmtHour(Math.min(...spread.models.map((m) => m.rainStart ?? Infinity)))} and check back — confidence improves as the short-range HRRR updates hourly.
      </p>
    </section>
  );
}
