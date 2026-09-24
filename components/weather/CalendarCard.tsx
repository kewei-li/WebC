"use client";

import { CalendarClock, CheckCircle2, CloudLightning, Eye } from "lucide-react";
import { useUnits } from "@/components/providers";
import { type CalendarImpact, confidenceFrom } from "@/lib/editorial-rules";
import { type Hour, HOUR, fmtHour } from "@/lib/weather-primitives";
import { ConfidenceBadge } from "./ConfidenceBadge";

const VERDICT = {
  "at-risk": { label: "At risk", icon: CloudLightning, cls: "bg-storm-soft text-storm" },
  watch: { label: "Keep an eye out", icon: Eye, cls: "bg-heat-soft text-heat" },
  clear: { label: "Looks fine", icon: CheckCircle2, cls: "bg-ok-soft text-ok" },
} as const;

/** Calendar-aware decision module: how the weather meets a planned activity. */
export function CalendarCard({ impact, hours, now, onEvidence }: { impact: CalendarImpact; hours: Hour[]; now: number; onEvidence?: () => void }) {
  const { temp } = useUnits();
  const { event: e, verdict } = impact;
  const v = VERDICT[verdict];
  // Show the event plus two hours either side for context.
  const from = e.start - 2 * HOUR;
  const to = e.end + 2 * HOUR;
  const strip = hours.filter((h) => h.ts >= from && h.ts < to);
  const conf = confidenceFrom(impact.maxPop, Math.max(0, (e.start - now) / HOUR), [`Thunder up to ${impact.maxThunder}% during the event`]);

  return (
    <section aria-label={`Calendar: ${e.title}`} className="card p-5 sm:p-6">
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div>
          <p className="eyebrow flex items-center gap-1.5"><CalendarClock size={14} /> From your calendar</p>
          <p className="mt-1 text-sm text-ink-2">
            <span className="font-medium text-ink">{e.title}</span> · {e.location} · {fmtHour(e.start)}–{fmtHour(e.end)}
          </p>
        </div>
        <span className={`inline-flex items-center gap-1.5 rounded-full px-2.5 py-1 text-xs font-semibold ${v.cls}`}>
          <v.icon size={13} aria-hidden /> {v.label}
        </span>
      </div>
      <h3 className="mt-3 font-serif text-2xl leading-snug">{impact.summary}.</h3>
      <p className="mt-1 text-sm text-ink-2">{impact.detail}</p>

      <ol className="mt-4 grid gap-1" style={{ gridTemplateColumns: `repeat(${strip.length}, minmax(0, 1fr))` }} aria-label="Hourly rain chance around the event">
        {strip.map((h) => {
          const inEvent = h.ts >= e.start && h.ts < e.end;
          return (
            <li key={h.ts} className={`flex flex-col items-center gap-1 rounded-xl px-0.5 py-2 ${inEvent ? "bg-surface-2 ring-1 ring-line-strong" : ""}`}>
              <span className="tnum text-[11px] text-ink-3">{fmtHour(h.ts)}</span>
              <span className="flex h-10 w-3 items-end overflow-hidden rounded-full bg-surface-2" aria-hidden>
                <span className="w-full rounded-full bg-rain" style={{ height: `${Math.max(4, h.pop)}%` }} />
              </span>
              <span className={`tnum text-[11px] ${h.pop >= 50 ? "font-semibold text-rain" : "text-ink-2"}`}>{h.pop}%</span>
              {(h.thunder ?? 0) >= 30 ? <CloudLightning size={11} className="text-storm" aria-label="thunder" /> : <span className="h-[11px]" />}
            </li>
          );
        })}
      </ol>
      <p className="mt-1 text-[11px] text-ink-3">Outlined hours = {e.title.toLowerCase()}. Feels like up to {temp(impact.maxFeels)}.</p>

      <div className="mt-4 flex flex-wrap items-center justify-between gap-3">
        {impact.alternative ? (
          <p className="rounded-xl bg-ok-soft px-3 py-2 text-sm text-ok">
            <b>Better slot:</b> {fmtHour(impact.alternative.start)}–{fmtHour(impact.alternative.end)} stays dry.
          </p>
        ) : verdict === "at-risk" ? (
          <p className="text-sm text-ink-2">No dry 2-hour slot left today — consider moving indoors.</p>
        ) : (
          <span />
        )}
        <ConfidenceBadge confidence={conf} onClick={onEvidence} />
      </div>
    </section>
  );
}
