"use client";

import { CloudLightning, Thermometer, Wind } from "lucide-react";
import Link from "next/link";
import { useUnits } from "@/components/providers";
import type { HeatRisk, LightningRisk } from "@/lib/editorial-rules";
import { confidenceFrom } from "@/lib/editorial-rules";
import { HOUR, fmtHour } from "@/lib/weather-primitives";
import { ConfidenceBadge } from "./ConfidenceBadge";

export function LightningCard({ risk, now, onEvidence }: { risk: LightningRisk; now: number; onEvidence?: () => void }) {
  const soon = risk.start <= now + HOUR;
  const conf = confidenceFrom(Math.min(95, risk.peak + 20), Math.max(0, (risk.start - now) / HOUR), [`NWS thunder probability peaks at ${risk.peak}%`]);
  return (
    <section aria-label="Lightning risk" className="card border-storm/30 p-5">
      <div className="flex items-start justify-between gap-3">
        <p className="eyebrow flex items-center gap-1.5 text-storm"><CloudLightning size={14} /> Lightning</p>
        <ConfidenceBadge confidence={conf} onClick={onEvidence} />
      </div>
      <p className="mt-2 font-serif text-2xl leading-snug">
        {soon ? "Lightning possible now" : `Lightning possible from ${fmtHour(risk.start)}`} through {fmtHour(risk.end)}.
      </p>
      <p className="mt-2 text-sm text-ink-2">
        Thunder chance up to {risk.peak}%. When thunder roars, go indoors — plan pool, beach and field time outside this window.
      </p>
      <Link href="/maps?layer=radar&z=8&play=1" className="mt-3 inline-block text-sm font-medium text-accent hover:underline">View storms on radar →</Link>
    </section>
  );
}

export function HeatCard({ heat }: { heat: HeatRisk }) {
  const { temp } = useUnits();
  const tone = heat.level === "caution" ? "Hot and humid" : heat.level === "danger" ? "Dangerous heat" : "Extreme heat";
  return (
    <section aria-label="Heat" className="card p-5">
      <p className="eyebrow flex items-center gap-1.5 text-heat"><Thermometer size={14} /> Heat · {tone}</p>
      <p className="tnum mt-2 font-serif text-2xl">Feels like {temp(heat.peakFeels)} around {fmtHour(heat.peakTs)}</p>
      <p className="mt-2 text-sm text-ink-2">
        {heat.hoursAbove} hour{heat.hoursAbove === 1 ? "" : "s"} at or above {temp(100)} feels-like ahead. Shade and water breaks for outdoor work.
      </p>
      <p className="mt-2 text-xs text-ink-3">NWS apparent temperature (heat index) · NWS HeatRisk is the official product.</p>
    </section>
  );
}

export function AqiCard() {
  return (
    <section aria-label="Air quality" className="card p-5">
      <p className="eyebrow flex items-center gap-1.5"><Wind size={14} /> Air quality</p>
      <p className="mt-2 text-sm font-medium">Unavailable</p>
      <p className="mt-1 text-sm text-ink-2">The NWS API does not publish AQI. AirNow integration is planned; nothing is estimated here.</p>
    </section>
  );
}
