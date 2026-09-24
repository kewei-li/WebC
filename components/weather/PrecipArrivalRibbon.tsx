"use client";

import { CloudLightning, CloudRain, Map as MapIcon } from "lucide-react";
import Link from "next/link";
import type { PrecipEvent } from "@/lib/editorial-rules";
import { HOUR, fmtHour } from "@/lib/weather-primitives";
import { ConfidenceBadge } from "./ConfidenceBadge";

const INTENSITY_LABEL = { light: "Light", moderate: "Moderate", heavy: "Heavy" } as const;

/**
 * Precip Arrival Ribbon — possible range (pale), most likely interval (solid,
 * shaded by hourly chance), duration, intensity and confidence on one timeline.
 */
export function PrecipArrivalRibbon({
  event,
  now,
  onEvidence,
  compact = false,
}: {
  event: PrecipEvent;
  now: number;
  onEvidence?: () => void;
  compact?: boolean;
}) {
  const start = Math.floor(now / HOUR) * HOUR;
  const span = Math.min(24, Math.max(10, Math.ceil((event.possibleEnd - start) / HOUR) + 2));
  const end = start + span * HOUR;
  const pct = (ts: number) => `${Math.max(0, Math.min(100, ((ts - start) / (end - start)) * 100))}%`;
  const width = (a: number, b: number) => `${Math.max(0, ((Math.min(b, end) - Math.max(a, start)) / (end - start)) * 100)}%`;
  const hours = event.hours.filter((h) => h.ts >= start && h.ts < end);
  const Icon = event.thunder ? CloudLightning : CloudRain;
  const ongoing = event.state === "ongoing";

  const headline = ongoing
    ? `${event.thunder ? "Storm" : "Rain"} chances stay high until about ${fmtHour(event.likelyEnd)}`
    : `Most likely ${fmtHour(event.likelyStart)}–${fmtHour(event.likelyEnd)}`;
  const sr = `${ongoing ? "Rain window open now" : "Rain arriving"}. Possible from ${fmtHour(event.possibleStart)} to ${fmtHour(
    event.possibleEnd,
  )}; most likely ${fmtHour(event.likelyStart)} to ${fmtHour(event.likelyEnd)}, about ${event.durationH} hours. ${INTENSITY_LABEL[event.intensity]} intensity${
    event.thunder ? " with thunder" : ""
  }. Peak chance ${event.peakPop}%. ${event.confidence.level} confidence.`;

  const tickEvery = span > 16 ? 3 : 2;

  return (
    <section aria-label="Precipitation arrival" className="card overflow-hidden p-5 sm:p-6">
      <p className="sr-only">{sr}</p>
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div>
          <p className="eyebrow flex items-center gap-1.5">
            <Icon aria-hidden size={14} className={event.thunder ? "text-storm" : "text-rain"} />
            {ongoing ? "Rain window open now" : "Rain arrival"}
          </p>
          <h3 aria-hidden className="mt-1.5 font-serif text-2xl leading-tight sm:text-[1.75rem]">{headline}</h3>
        </div>
        <ConfidenceBadge confidence={event.confidence} onClick={onEvidence} />
      </div>

      <div className="relative mt-6 h-16" aria-hidden>
        {/* track */}
        <div className="absolute inset-x-0 top-5 h-6 rounded-full bg-surface-2" />
        {/* possible range */}
        <div
          className="absolute top-5 h-6 rounded-full border border-dashed border-rain/50 bg-rain-soft"
          style={{ left: pct(event.possibleStart), width: width(event.possibleStart, event.possibleEnd) }}
        />
        {/* most likely: shaded per hour */}
        <div
          className="absolute top-4 flex h-8 overflow-hidden rounded-full ring-2 ring-surface"
          style={{ left: pct(event.likelyStart), width: width(event.likelyStart, event.likelyEnd) }}
        >
          {hours
            .filter((h) => h.ts >= event.likelyStart && h.ts < event.likelyEnd)
            .map((h) => (
              <span key={h.ts} className="h-full flex-1 bg-rain" style={{ opacity: 0.45 + (h.pop / 100) * 0.55 }} />
            ))}
        </div>
        {/* thunder marks */}
        {hours
          .filter((h) => (h.thunder ?? 0) >= 30)
          .map((h) => (
            <CloudLightning key={h.ts} size={12} className="absolute top-0 -translate-x-1/2 text-storm" style={{ left: pct(h.ts + HOUR / 2) }} />
          ))}
        {/* now */}
        <div className="absolute top-2 h-12 w-px bg-ink" style={{ left: pct(now) }}>
          <span className="absolute -top-2 left-1 text-[11px] font-semibold">Now</span>
        </div>
        {/* ticks */}
        {Array.from({ length: Math.floor(span / tickEvery) + 1 }, (_, i) => start + i * tickEvery * HOUR)
          .filter((ts) => ts < end)
          .map((ts) => (
            <span key={ts} className="tnum absolute top-12 -translate-x-1/2 text-[11px] text-ink-3" style={{ left: pct(ts) }}>
              {fmtHour(ts)}
            </span>
          ))}
      </div>

      {!compact && (
        <dl className="mt-4 grid grid-cols-2 gap-x-6 gap-y-3 text-sm sm:grid-cols-4" aria-hidden>
          <Fact label={ongoing ? "Window" : "Could start"} value={ongoing ? `Open now → ${fmtHour(event.possibleEnd)}` : `from ${fmtHour(event.possibleStart)}`} />
          <Fact label="Duration" value={`~${event.durationH} h`} />
          <Fact label="Intensity" value={`${INTENSITY_LABEL[event.intensity]}${event.thunder ? " + thunder" : ""}`} />
          <Fact label="Peak chance" value={`${event.peakPop}% at ${fmtHour(event.peakTs)}`} />
        </dl>
      )}

      <div className="mt-5 flex flex-wrap items-center gap-3 text-sm">
        <Link
          href={`/maps?layer=radar&z=8&lat=25.76&lon=-80.19&play=1`}
          className="inline-flex items-center gap-1.5 rounded-full bg-ink px-4 py-2 font-medium text-paper hover:opacity-90"
        >
          <MapIcon size={14} /> {ongoing ? "Rain nearby" : "Rain approaching"} — View radar
        </Link>
        <span className="flex items-center gap-2 text-xs text-ink-3">
          <span className="inline-block h-2.5 w-5 rounded-full border border-dashed border-rain/50 bg-rain-soft" /> possible
          <span className="ml-2 inline-block h-2.5 w-5 rounded-full bg-rain" /> most likely
        </span>
      </div>
    </section>
  );
}

function Fact({ label, value }: { label: string; value: string }) {
  return (
    <div>
      <dt className="text-xs text-ink-3">{label}</dt>
      <dd className="tnum font-medium">{value}</dd>
    </div>
  );
}
