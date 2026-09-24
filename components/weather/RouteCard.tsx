"use client";

import { Car, Map as MapIcon } from "lucide-react";
import Link from "next/link";
import type { RouteImpact, SegmentRisk } from "@/lib/editorial-rules";
import { fmtClock } from "@/lib/weather-primitives";

const RISK: Record<SegmentRisk, { label: string; dot: string; text: string }> = {
  heavy: { label: "Heavy rain", dot: "bg-storm", text: "text-storm font-semibold" },
  near: { label: "Rain nearby", dot: "bg-rain", text: "text-rain" },
  clear: { label: "Dry", dot: "bg-ok", text: "text-ink-3" },
};

/** Route weather: where and when the drive meets rain, plus a departure that avoids it. */
export function RouteCard({ impact }: { impact: RouteImpact }) {
  const { route, segments, firstHeavy, suggestion } = impact;
  return (
    <section aria-label={`Drive to ${route.to}`} className="card p-5 sm:p-6">
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div>
          <p className="eyebrow flex items-center gap-1.5"><Car size={14} /> Your drive</p>
          <p className="mt-1 text-sm text-ink-2">
            <span className="font-medium text-ink">{route.from} → {route.to}</span> · leaving {fmtClock(impact.plannedDepart)} · ~{Math.round(route.durationMin / 60)} h
          </p>
        </div>
      </div>
      <h3 className="mt-3 font-serif text-2xl leading-snug">
        {firstHeavy ? `Heavy rain near ${firstHeavy.name} around ${fmtClock(firstHeavy.at)}.` : "Dry the whole way."}
      </h3>

      {/* Segment stepper: horizontal on wide cards, vertical on narrow ones. */}
      <ol className="mt-5 grid gap-3 sm:grid-flow-col sm:auto-cols-fr sm:gap-0">
        {segments.map((s, i) => {
          const r = RISK[s.risk];
          return (
            <li key={s.name} className="relative flex items-center gap-3 sm:flex-col sm:items-start sm:gap-2 sm:pr-2">
              <span className="relative flex items-center sm:w-full">
                <span className={`z-10 size-3 shrink-0 rounded-full ring-4 ring-surface ${r.dot}`} aria-hidden />
                {i < segments.length - 1 && <span className="absolute left-3 hidden h-0.5 w-full bg-line-strong sm:block" aria-hidden />}
              </span>
              <span className="min-w-0">
                <span className="block text-sm font-medium leading-tight">{s.name}</span>
                <span className="tnum block text-xs text-ink-3">{fmtClock(s.at)}</span>
                <span className={`block text-xs ${r.text}`}>{r.label}</span>
              </span>
            </li>
          );
        })}
      </ol>

      <div className="mt-5 flex flex-wrap items-center gap-3">
        {suggestion && <p className="rounded-xl bg-ok-soft px-3 py-2 text-sm text-ok"><b>Suggestion:</b> {suggestion.note}</p>}
        <Link href="/maps?layer=radar,route&z=7.5&lat=26.5&lon=-80.2" className="inline-flex items-center gap-1.5 text-sm font-medium text-accent hover:underline">
          <MapIcon size={14} /> See route on map
        </Link>
      </div>
      <p className="mt-3 text-xs text-ink-3">Rain timing per segment from the scenario file; a live version would sample NWS grid forecasts along the route.</p>
    </section>
  );
}
