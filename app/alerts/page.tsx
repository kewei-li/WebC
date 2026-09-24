"use client";

import { AlertTriangle, CheckCircle2, ChevronDown, Map as MapIcon, Sparkles } from "lucide-react";
import Link from "next/link";
import { useState } from "react";
import { PageLoading, Unavailable } from "@/components/ui/States";
import { ConfidenceBadge } from "@/components/weather/ConfidenceBadge";
import { type Evidence, EvidenceDrawer } from "@/components/weather/EvidenceDrawer";
import { untilLabel } from "@/components/weather/RiskBanner";
import { type Editorial, alertConfidence, sortAlerts } from "@/lib/editorial-rules";
import { useWeather } from "@/lib/use-weather";
import { type WeatherAlert, type WeatherBundle, HOUR, fmtClock, fmtHour, relativeMinutes } from "@/lib/weather-primitives";

/** Personal interpretation — always separated from, and subordinate to, the official text. */
function interpret(a: WeatherAlert, b: WeatherBundle, e: Editorial, now: number): string[] {
  const out: string[] = [];
  const end = a.ends ?? a.expires;
  if (a.approach)
    out.push(`The strongest part of the storm may approach in approximately ${a.approach.minMinutes}–${a.approach.maxMinutes} minutes, bringing ${a.approach.hazard}.`);
  if (a.onset && a.onset > now) out.push(`Begins in about ${Math.round((a.onset - now) / HOUR)} h (${fmtClock(a.onset)}).`);
  else if (end) out.push(`In effect now; about ${Math.max(1, Math.round((end - now) / 60000 / 15) * 15)} minutes remain in the official period.`);
  if (/thunderstorm|tornado/i.test(a.event) && e.lightning)
    out.push(`Hourly forecast shows thunder chances up to ${e.lightning.peak}% between ${fmtHour(e.lightning.start)} and ${fmtHour(e.lightning.end)}.`);
  if (/flood/i.test(a.event)) {
    const qpf = b.hours.slice(0, 24).reduce((s, h) => s + (h.qpfMmPerHr ?? 0), 0);
    out.push(`NWS forecasts about ${(qpf / 25.4).toFixed(2)} in of additional rain at your location over the next 24 h.`);
  }
  if (/heat/i.test(a.event) && e.heat) out.push(`Feels-like temperature peaks near ${e.heat.peakFeels}° around ${fmtHour(e.heat.peakTs)}.`);
  if (/rip current|coastal|surf|beach/i.test(a.event)) out.push("Applies to beaches and the shoreline — inland activities are not affected.");
  return out;
}

export default function AlertsPage() {
  const { data, editorial, error, isLoading, refetch, now } = useWeather();
  const [evidence, setEvidence] = useState<Evidence | null>(null);
  if (isLoading) return <PageLoading />;
  if (error || !data || !editorial) return <Unavailable message={String(error?.message ?? "no data")} onRetry={() => refetch()} />;

  const local = sortAlerts(data.alerts);
  const localIds = new Set(local.map((a) => a.id));
  const regional = sortAlerts(data.regionalAlerts.filter((a) => !localIds.has(a.id)));

  return (
    <div className="mx-auto max-w-4xl space-y-8">
      <div>
        <p className="eyebrow">{data.location.name}</p>
        <h1 className="font-serif text-3xl sm:text-4xl">Alerts</h1>
        <p className="mt-1 text-sm text-ink-3">Checked {relativeMinutes(data.fetchedAt, now)} · Source: {data.scenario ? `scenario “${data.scenario.label}” (simulated)` : "National Weather Service"}</p>
      </div>

      <section aria-labelledby="local-h" className="space-y-4">
        <h2 id="local-h" className="text-base font-semibold">For your location</h2>
        {local.length === 0 ? (
          <div className="card flex items-start gap-3 p-5">
            <CheckCircle2 size={20} className="mt-0.5 text-ok" aria-hidden />
            <div>
              <p className="font-medium">No active NWS alerts for Miami, FL.</p>
              <p className="mt-1 text-sm text-ink-2">
                We re-check every 5 minutes. {editorial.lightning ? `Note: thunder chances reach ${editorial.lightning.peak}% by ${fmtHour(editorial.lightning.end)} — no warning has been issued.` : ""}
              </p>
            </div>
          </div>
        ) : (
          local.map((a) => {
            const conf = alertConfidence(a);
            const notes = interpret(a, data, editorial, now);
            return (
              <article key={a.id} id={a.id} className="card overflow-hidden">
                <div className={`border-b px-5 py-4 ${/warning/i.test(a.event) ? "border-warn/30 bg-warn-soft" : "border-heat/30 bg-heat-soft"}`}>
                  <p className="eyebrow">Official · {a.sender}</p>
                  <h3 className="mt-1 flex items-center gap-2 text-xl font-semibold">
                    <AlertTriangle size={20} className="text-warn" aria-hidden /> {a.event}
                  </h3>
                  <p className="tnum text-sm">Official {untilLabel(a.ends ?? a.expires, now)}</p>
                </div>
                <div className="space-y-3 px-5 py-4 text-sm">
                  <p className="font-medium">{a.headline}</p>
                  <p className="whitespace-pre-line leading-relaxed text-ink-2">{a.description}</p>
                  {a.instruction && (
                    <div className="rounded-xl bg-surface-2 p-3">
                      <p className="eyebrow mb-1">Instructions</p>
                      <p className="whitespace-pre-line text-ink-2">{a.instruction}</p>
                    </div>
                  )}
                </div>
                {notes.length > 0 && (
                  <div className="border-t border-dashed border-line-strong bg-paper px-5 py-4">
                    <div className="flex flex-wrap items-center justify-between gap-2">
                      <p className="eyebrow flex items-center gap-1.5"><Sparkles size={12} /> Interpretation for your location</p>
                      <ConfidenceBadge
                        confidence={conf}
                        onClick={() =>
                          setEvidence({
                            title: `${a.event} — evidence`,
                            confidence: conf,
                            facts: [
                              { label: "Effective", value: a.effective ? fmtClock(a.effective) : "—" },
                              { label: "Onset", value: a.onset ? fmtClock(a.onset) : "—" },
                              { label: "Ends / expires", value: a.ends || a.expires ? fmtClock((a.ends ?? a.expires)!) : "—" },
                              { label: "Area", value: a.areaDesc },
                              ...(a.approach ? [{ label: "Arrival estimate", value: `${a.approach.minMinutes}–${a.approach.maxMinutes} min (storm motion from warning text)` }] : []),
                            ],
                            sources: data.sources.filter((s) => ["alerts", "hourly", "grid"].includes(s.id)).map((s) => ({ label: s.label, url: s.url, updatedAt: s.updatedAt })),
                            note: "Interpretation combines the official alert timing with the NWS point forecast. It never replaces the official text above.",
                          })
                        }
                      />
                    </div>
                    <ul className="mt-2 space-y-1 text-sm">
                      {notes.map((n) => (
                        <li key={n}>{n}</li>
                      ))}
                    </ul>
                  </div>
                )}
              </article>
            );
          })
        )}
      </section>

      <section aria-labelledby="regional-h" className="space-y-3">
        <div className="flex items-center justify-between">
          <h2 id="regional-h" className="text-base font-semibold">Elsewhere in Florida ({regional.length})</h2>
          <Link href="/maps?layer=alerts,radar&z=6&lat=27.8&lon=-82.5" className="inline-flex items-center gap-1 text-sm font-medium text-accent hover:underline">
            <MapIcon size={14} /> View on map
          </Link>
        </div>
        {regional.length === 0 ? (
          <p className="text-sm text-ink-2">No other active alerts in Florida.</p>
        ) : (
          <ul className="card divide-y divide-line">
            {regional.map((a) => (
              <li key={a.id} id={a.id}>
                <details className="group px-5 py-3">
                  <summary className="flex cursor-pointer list-none items-center gap-3">
                    <span className={`size-2 shrink-0 rounded-full ${/warning/i.test(a.event) ? "bg-warn" : "bg-heat"}`} aria-hidden />
                    <span className="min-w-0 flex-1">
                      <span className="block font-medium">{a.event}</span>
                      <span className="block truncate text-xs text-ink-3">{a.areaDesc}</span>
                    </span>
                    <span className="tnum hidden text-xs text-ink-2 sm:block">{untilLabel(a.ends ?? a.expires, now)}</span>
                    <ChevronDown size={16} className="text-ink-3 transition-transform group-open:rotate-180" aria-hidden />
                  </summary>
                  <p className="mt-3 whitespace-pre-line text-sm leading-relaxed text-ink-2">{a.description || a.headline}</p>
                </details>
              </li>
            ))}
          </ul>
        )}
      </section>
      <EvidenceDrawer evidence={evidence} onClose={() => setEvidence(null)} />
    </div>
  );
}
