"use client";

import { useState } from "react";
import { DesktopRail } from "@/components/layout/DesktopRail";
import { useUnits } from "@/components/providers";
import { Sheet } from "@/components/ui/Sheet";
import { PageLoading, StaleNotice, Unavailable } from "@/components/ui/States";
import { CalendarCard } from "@/components/weather/CalendarCard";
import { ConditionIcon } from "@/components/weather/ConditionIcon";
import { ModelComparison } from "@/components/weather/ModelComparison";
import { RouteCard } from "@/components/weather/RouteCard";
import { type Evidence, EvidenceDrawer } from "@/components/weather/EvidenceDrawer";
import { HourInspector } from "@/components/weather/HourInspector";
import { HourlyChart, WindChart } from "@/components/weather/HourlyChart";
import { HourlyStrip, transitionStyle } from "@/components/weather/HourlyForecast";
import { PrecipArrivalRibbon } from "@/components/weather/PrecipArrivalRibbon";
import { precipEvidence } from "@/lib/evidence";
import { useMediaQuery, useWeather } from "@/lib/use-weather";
import { type Hour, dayKey, fmtHour, fmtLongDay } from "@/lib/weather-primitives";

export default function HourlyPage() {
  const { data, editorial, error, isLoading, refetch, now, isStale } = useWeather();
  const { temp } = useUnits();
  const [sel, setSel] = useState<number | null>(null);
  const [evidence, setEvidence] = useState<Evidence | null>(null);
  const [range, setRange] = useState<24 | 48>(24);
  const isDesktop = useMediaQuery("(min-width: 1024px)");
  const isTablet = useMediaQuery("(min-width: 640px)");

  if (isLoading) return <PageLoading />;
  if (error || !data || !editorial) return <Unavailable message={String(error?.message ?? "no data")} onRetry={() => refetch()} />;

  // Glance range scales with viewport: narrow 6, tablet 12, desktop 24.
  const glance = isDesktop ? 24 : isTablet ? 12 : 6;
  const hours = data.hours.slice(0, range);
  const selected: Hour = data.hours.find((h) => h.ts === sel) ?? data.hours[0];
  const pick = (h: Hour) => setSel(h.ts);
  const byDay = hours.reduce<Record<string, Hour[]>>((acc, h) => ((acc[dayKey(h.ts)] ??= []).push(h), acc), {});
  const tmap = new Map(editorial.transitions.map((t) => [t.ts, t]));

  return (
    <div className="space-y-5">
      {isStale && <StaleNotice fetchedAt={data.fetchedAt} />}
      <div className="flex flex-wrap items-end justify-between gap-3">
        <div>
          <p className="eyebrow">{data.location.name}</p>
          <h1 className="font-serif text-3xl sm:text-4xl">Hourly</h1>
        </div>
        <div role="group" aria-label="Time range" className="flex rounded-full border border-line bg-surface p-1 text-sm">
          {([24, 48] as const).map((r) => (
            <button key={r} aria-pressed={range === r} onClick={() => setRange(r)} className={`rounded-full px-3.5 py-1.5 font-medium ${range === r ? "bg-ink text-paper" : "text-ink-2"}`}>
              {r} h
            </button>
          ))}
        </div>
      </div>

      {editorial.calendar.map((c) => (
        <CalendarCard key={c.event.title} impact={c} hours={data.hours} now={now} />
      ))}
      {editorial.route?.firstHeavy && <RouteCard impact={editorial.route} />}
      {editorial.spread && <ModelComparison spread={editorial.spread} hours={data.hours} />}
      {editorial.precip && (
        <PrecipArrivalRibbon event={editorial.precip} now={now} onEvidence={() => setEvidence(precipEvidence(editorial.precip!, data))} />
      )}

      <div className="grid gap-5 lg:grid-cols-12">
        <div className="flex min-w-0 flex-col gap-5 lg:col-span-8 wide:col-span-9">
          <section aria-labelledby="changes-h" className="card p-4 sm:p-6">
            <h2 id="changes-h" className="mb-3 text-base font-semibold">What changes in the next 24 hours</h2>
            {editorial.transitions.length ? (
              <ol className="flex flex-wrap gap-2">
                {editorial.transitions.map((t) => (
                  <li key={`${t.ts}${t.kind}`}>
                    <button onClick={() => setSel(t.ts)} className={`rounded-xl px-3 py-2 text-left text-sm ${transitionStyle(t.kind)} hover:ring-1 hover:ring-current`}>
                      <span className="tnum font-semibold">{fmtHour(t.ts)}</span> · {t.label}
                      <span className="block text-xs">{t.detail}</span>
                    </button>
                  </li>
                ))}
              </ol>
            ) : (
              <p className="text-sm text-ink-2">A steady stretch — no significant transitions.</p>
            )}
          </section>

          <section aria-labelledby="glance-h" className="card p-4 sm:p-6">
            <h2 id="glance-h" className="mb-1 text-base font-semibold">Next {glance} hours</h2>
            <HourlyStrip hours={data.hours.slice(0, glance)} transitions={editorial.transitions} selectedTs={selected.ts} onSelect={pick} />
          </section>

          <section aria-labelledby="chart-h" className="card p-4 sm:p-6">
            <h2 id="chart-h" className="mb-2 text-base font-semibold">Temperature & rain chance</h2>
            <HourlyChart hours={hours} transitions={editorial.transitions} onSelect={pick} />
            <h3 className="mb-1 mt-4 text-sm font-semibold">Wind</h3>
            <WindChart hours={hours} />
          </section>

          {!isDesktop && (
            <section aria-labelledby="list-h" className="card p-2 sm:p-4">
              <h2 id="list-h" className="px-2 pb-2 pt-2 text-base font-semibold">Hour by hour</h2>
              {Object.entries(byDay).map(([k, hs]) => (
                <div key={k}>
                  <p className="eyebrow sticky top-[7.5rem] z-10 bg-surface px-2 py-2">{fmtLongDay(hs[0].ts)}</p>
                  <ul className="divide-y divide-line">
                    {hs.map((h) => {
                      const tr = tmap.get(h.ts);
                      return (
                        <li key={h.ts}>
                          <button onClick={() => pick(h)} className="grid w-full grid-cols-[3.25rem_1.5rem_minmax(0,1fr)_2.75rem_2.75rem] items-center gap-2 px-2 py-2.5 text-left text-sm">
                            <span className="tnum text-ink-2">{fmtHour(h.ts)}</span>
                            <ConditionIcon condition={h.condition} isDay={h.isDay} />
                            <span className="truncate">
                              {tr ? <span className={`mr-1 rounded-full px-1.5 py-0.5 text-[11px] font-semibold ${transitionStyle(tr.kind)}`}>{tr.label}</span> : null}
                              <span className="text-ink-2">{h.short}</span>
                            </span>
                            <span className={`tnum text-right text-xs ${h.pop >= 30 ? "text-rain" : "text-ink-3"}`}>{h.pop}%</span>
                            <span className="tnum text-right font-semibold">{temp(h.tempF)}</span>
                          </button>
                        </li>
                      );
                    })}
                  </ul>
                </div>
              ))}
            </section>
          )}
        </div>

        {isDesktop && (
          <div className="lg:col-span-4 wide:col-span-3">
            <DesktopRail label="Hour inspection">
              <section className="card p-5" aria-label="Selected hour detail">
                <HourInspector hour={selected} transitions={editorial.transitions} />
              </section>
            </DesktopRail>
          </div>
        )}
      </div>

      {!isDesktop && (
        <Sheet open={sel != null} onClose={() => setSel(null)} title="Hour detail">
          <HourInspector hour={selected} transitions={editorial.transitions} />
        </Sheet>
      )}
      <EvidenceDrawer evidence={evidence} onClose={() => setEvidence(null)} />
    </div>
  );
}
