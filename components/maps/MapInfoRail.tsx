"use client";

import { AlertTriangle, MapPin, Sparkles } from "lucide-react";
import Link from "next/link";
import { useUnits } from "@/components/providers";
import { ConfidenceBadge } from "@/components/weather/ConfidenceBadge";
import { untilLabel } from "@/components/weather/RiskBanner";
import type { Editorial } from "@/lib/editorial-rules";
import { DBZ_LEGEND, LAYERS, type LayerId } from "@/lib/maps/layers";
import type { WeatherAlert, WeatherBundle } from "@/lib/weather-primitives";
import { fmtHour } from "@/lib/weather-primitives";
import { LayerSelector } from "./LayerSelector";

export function MapInfoRail({
  data,
  editorial,
  active,
  onToggle,
  selectedAlert,
  now,
}: {
  data: WeatherBundle;
  editorial: Editorial;
  active: Set<LayerId>;
  onToggle: (id: LayerId) => void;
  selectedAlert: WeatherAlert | null;
  now: number;
}) {
  const { temp } = useUnits();
  const p = editorial.precip;
  const polyAlerts = data.regionalAlerts.filter((a) => a.geometry);
  return (
    <div className="space-y-6">
      {data.scenario && (
        <p className="rounded-xl border border-storm/30 bg-storm-soft px-3 py-2 text-xs text-storm">
          Scenario “{data.scenario.label}”: warnings{data.route ? ", route" : ""} and the forecast are simulated; the radar loop is still live NOAA data.
        </p>
      )}
      <LayerSelector active={active} onToggle={onToggle} available={data.route ? ["radar", "alerts", "route"] : ["radar", "alerts"]} />

      {active.has("radar") && (
        <section aria-label="Radar legend">
          <h3 className="eyebrow mb-2">Reflectivity (dBZ)</h3>
          <div className="flex h-2.5 overflow-hidden rounded-full">
            {DBZ_LEGEND.map((l) => (
              <span key={l.dbz} className="flex-1" style={{ background: l.color }} />
            ))}
          </div>
          <div className="mt-1 flex justify-between text-[11px] text-ink-3">
            <span>Light</span>
            <span>Moderate</span>
            <span>Heavy</span>
            <span>Extreme</span>
          </div>
        </section>
      )}

      {selectedAlert && (
        <section aria-label="Selected warning" className="rounded-2xl border border-warn/40 bg-warn-soft p-4">
          <p className="flex items-center gap-1.5 text-sm font-semibold">
            <AlertTriangle size={14} className="text-warn" /> {selectedAlert.event}
          </p>
          <p className="mt-1 text-xs text-ink-2">Official {untilLabel(selectedAlert.ends ?? selectedAlert.expires, now)} · {selectedAlert.areaDesc}</p>
          <Link href={`/alerts#${encodeURIComponent(selectedAlert.id)}`} className="mt-2 inline-block text-xs font-medium text-accent">Read official text →</Link>
        </section>
      )}

      <section aria-label="Selected location">
        <h3 className="eyebrow mb-2 flex items-center gap-1.5"><MapPin size={12} /> {data.location.name}</h3>
        <div className="flex items-baseline gap-3">
          <span className="tnum font-serif text-4xl">{temp(data.current?.tempF)}</span>
          <span className="text-sm text-ink-2">{data.current?.text}</span>
        </div>
        <ol className="mt-3 grid grid-cols-6 gap-1 text-center text-[11px]">
          {data.hours.slice(0, 6).map((h, i) => (
            <li key={h.ts} className="rounded-lg bg-surface-2 py-1.5">
              <span className="block text-ink-3">{i === 0 ? "Now" : fmtHour(h.ts)}</span>
              <span className="tnum block font-semibold">{temp(h.tempF)}</span>
              <span className={`tnum block ${h.pop >= 30 ? "text-rain" : "text-ink-3"}`}>{h.pop}%</span>
            </li>
          ))}
        </ol>
      </section>

      {editorial.route && active.has("route") && (
        <section aria-label="Route" className="rounded-2xl border border-line p-4">
          <h3 className="eyebrow mb-1.5">Drive · {editorial.route.route.from} → {editorial.route.route.to}</h3>
          <p className="text-sm">
            {editorial.route.firstHeavy ? `Heavy rain near ${editorial.route.firstHeavy.name} when you pass.` : "Dry the whole way."}
          </p>
          {editorial.route.suggestion && <p className="mt-1 text-sm text-ok">{editorial.route.suggestion.note}</p>}
        </section>
      )}

      <section aria-label="Insight" className="rounded-2xl bg-surface-2 p-4">
        <h3 className="eyebrow mb-1.5 flex items-center gap-1.5"><Sparkles size={12} /> Insight</h3>
        {p ? (
          <>
            <p className="text-sm">
              {p.state === "ongoing"
                ? `Rain chances are high now and most likely ease by ${fmtHour(p.likelyEnd)}. Check the loop for cells near the dot.`
                : `Rain most likely ${fmtHour(p.likelyStart)}–${fmtHour(p.likelyEnd)}, possible from ${fmtHour(p.possibleStart)}.`}
              {p.thunder ? " Thunderstorms are in the mix." : ""}
            </p>
            <div className="mt-2">
              <ConfidenceBadge confidence={p.confidence} />
            </div>
          </>
        ) : (
          <p className="text-sm text-ink-2">No organized rain expected near Miami in the next 24 hours.</p>
        )}
        <p className="mt-2 text-xs text-ink-3">{polyAlerts.length} polygon warning/advisor{polyAlerts.length === 1 ? "y" : "ies"} active{data.scenario ? " (scenario)" : " in Florida"}.</p>
      </section>

      <section aria-label="Sources" className="text-xs text-ink-3">
        <h3 className="eyebrow mb-1.5">Source</h3>
        {LAYERS.filter((l) => active.has(l.id)).map((l) => (
          <p key={l.id}>{l.label}: {l.source}</p>
        ))}
        <p>Point forecast: NWS {data.location.grid}</p>
      </section>
    </div>
  );
}
