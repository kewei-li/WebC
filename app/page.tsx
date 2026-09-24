"use client";

import { Bell, ChevronRight, Star } from "lucide-react";
import { LayoutGroup, motion, useReducedMotion } from "motion/react";
import Link from "next/link";
import { useState } from "react";
import { DesktopRail } from "@/components/layout/DesktopRail";
import { RadarPreview } from "@/components/maps/RadarPreview";
import { useUnits } from "@/components/providers";
import { PageLoading, StaleNotice, Unavailable } from "@/components/ui/States";
import { BestWindowCard } from "@/components/weather/BestWindowCard";
import { ConditionsGrid } from "@/components/weather/ConditionsGrid";
import { CurrentConditions } from "@/components/weather/CurrentConditions";
import { DailyForecast } from "@/components/weather/DailyForecast";
import { CalendarCard } from "@/components/weather/CalendarCard";
import { AqiCard, HeatCard, LightningCard } from "@/components/weather/DecisionModules";
import { ModelComparison } from "@/components/weather/ModelComparison";
import { RouteCard } from "@/components/weather/RouteCard";
import { type Evidence, EvidenceDrawer } from "@/components/weather/EvidenceDrawer";
import { HourlyStrip } from "@/components/weather/HourlyForecast";
import { PrecipArrivalRibbon } from "@/components/weather/PrecipArrivalRibbon";
import { RiskBanner } from "@/components/weather/RiskBanner";
import { WeatherBrief } from "@/components/weather/WeatherBrief";
import { WeatherDayLandscape } from "@/components/weather/WeatherDayLandscape";
import type { ModuleId } from "@/lib/editorial-rules";
import { bestWindowEvidence, precipEvidence } from "@/lib/evidence";
import { useWeather } from "@/lib/use-weather";

function Section({ id, title, href, linkLabel, children }: { id: string; title: string; href?: string; linkLabel?: string; children: React.ReactNode }) {
  const reduce = useReducedMotion();
  return (
    <motion.section layout={!reduce} layoutId={id} aria-labelledby={`${id}-h`} className="card p-4 sm:p-6">
      <div className="mb-3 flex items-center justify-between">
        <h2 id={`${id}-h`} className="text-base font-semibold">{title}</h2>
        {href && (
          <Link href={href} className="flex items-center gap-0.5 text-sm font-medium text-accent hover:underline">
            {linkLabel ?? "More"} <ChevronRight size={14} />
          </Link>
        )}
      </div>
      {children}
    </motion.section>
  );
}

export default function Home() {
  const { data, editorial, error, isLoading, refetch, now, isStale } = useWeather();
  const { temp } = useUnits();
  const [evidence, setEvidence] = useState<Evidence | null>(null);
  const reduce = useReducedMotion();

  if (isLoading) return <PageLoading />;
  if (error || !data || !editorial) return <Unavailable message={String(error?.message ?? "no data")} onRetry={() => refetch()} />;

  const today = data.days[0];

  // The intelligence layer decides which decision modules exist and where they go.
  const moduleView = (id: ModuleId) => {
    switch (id) {
      case "rain":
        return editorial.precip && (
          <PrecipArrivalRibbon event={editorial.precip} now={now} onEvidence={() => setEvidence(precipEvidence(editorial.precip!, data))} />
        );
      case "lightning":
        return editorial.lightning && (
          <LightningCard risk={editorial.lightning} now={now} onEvidence={editorial.precip ? () => setEvidence(precipEvidence(editorial.precip!, data)) : undefined} />
        );
      case "calendar":
        return editorial.calendar.map((c) => (
          <CalendarCard key={c.event.title} impact={c} hours={data.hours} now={now} />
        ));
      case "route":
        return editorial.route && <RouteCard impact={editorial.route} />;
      case "uncertainty":
        return editorial.spread && (
          <ModelComparison
            spread={editorial.spread}
            hours={data.hours}
            onEvidence={() => setEvidence({ title: "Model disagreement — evidence", confidence: editorial.spread!.confidence, sources: [{ label: "Scenario model runs (HRRR, NAM, GFS, ECMWF)" }] })}
          />
        );
      case "heat":
        return editorial.heat && <HeatCard heat={editorial.heat} />;
      case "best-window":
        return <BestWindowCard best={editorial.best} onEvidence={editorial.best ? () => setEvidence(bestWindowEvidence(editorial.best!, data)) : undefined} />;
      default:
        return null;
    }
  };

  const radar = (
    <Section key="radar" id="radar" title="Radar" href="/maps?layer=radar&play=1" linkLabel="Open map">
      <RadarPreview />
    </Section>
  );
  const daily = (
    <Section key="daily" id="daily" title="Next 7 days" href="/daily" linkLabel="Daily">
      <DailyForecast days={data.days} />
    </Section>
  );

  return (
    <div className="space-y-5">
      {isStale && <StaleNotice fetchedAt={data.fetchedAt} />}
      {editorial.alerts.map((a) => (
        <RiskBanner key={a.id} alert={a} now={now} />
      ))}

      {/* Above the fold: current + brief */}
      <section aria-label="Current conditions and brief" className="grid gap-6 border-b border-line pb-7 lg:grid-cols-12 lg:gap-10">
        <div className="lg:col-span-5 wide:col-span-4">
          <CurrentConditions data={data} today={today} now={now} />
        </div>
        <div className="lg:col-span-7 wide:col-span-8 lg:border-l lg:border-line lg:pl-10">
          <WeatherBrief editorial={editorial} />
        </div>
      </section>

      <LayoutGroup>
        <div className="grid gap-5 lg:grid-cols-12">
          <div className="flex min-w-0 flex-col gap-5 lg:col-span-8 wide:col-span-9">
            {editorial.main
              .filter((id) => id !== "alert")
              .map((id) => (
                <motion.div key={id} layout={!reduce} layoutId={`m-${id}`} className="flex flex-col gap-5">
                  {moduleView(id)}
                </motion.div>
              ))}

            <Section id="hourly" title="Hourly" href="/hourly" linkLabel="Hourly">
              <HourlyStrip hours={data.hours.slice(0, 24)} transitions={editorial.transitions} />
              <div className="mt-4 border-t border-line pt-4">
                <p className="eyebrow mb-2">Day landscape</p>
                <WeatherDayLandscape hours={data.hours} now={now} best={editorial.best} title="Next hours" />
              </div>
            </Section>

            {editorial.promoteRadar ? [radar, daily] : [daily, radar]}

            <Section id="conditions" title="Conditions now">
              <ConditionsGrid current={data.current} />
            </Section>
          </div>

          <div className="lg:col-span-4 wide:col-span-3">
            <DesktopRail>
              {editorial.rail.map((id) => (
                <motion.div key={id} layout={!reduce} layoutId={`m-${id}`} className="flex flex-col gap-4">
                  {moduleView(id)}
                </motion.div>
              ))}
              {!editorial.best && moduleView("best-window")}

              <section aria-label="Alerts" className="card p-5">
                <p className="eyebrow flex items-center gap-1.5"><Bell size={14} /> Alerts</p>
                {data.alerts.length ? (
                  <p className="mt-2 text-sm">{data.alerts.length} active for Miami.</p>
                ) : (
                  <p className="mt-2 text-sm">No active NWS alerts for your location.</p>
                )}
                {!data.scenario && <p className="mt-1 text-xs text-ink-3">{data.regionalAlerts.length} active elsewhere in Florida.</p>}
                <Link href="/alerts" className="mt-2 inline-block text-sm font-medium text-accent hover:underline">View alerts →</Link>
              </section>

              <AqiCard />

              <section aria-label="Saved locations" className="card p-5">
                <p className="eyebrow flex items-center gap-1.5"><Star size={14} /> Saved</p>
                <div className="mt-2 flex items-center justify-between">
                  <span className="text-sm font-medium">Miami, FL</span>
                  <span className="tnum text-sm">{temp(data.current?.tempF)} · {data.current?.text}</span>
                </div>
              </section>
            </DesktopRail>
          </div>
        </div>
      </LayoutGroup>

      <EvidenceDrawer evidence={evidence} onClose={() => setEvidence(null)} />
    </div>
  );
}
