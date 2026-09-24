"use client";

import { CloudLightning, Droplets, Sun, Wind } from "lucide-react";
import { AnimatePresence, motion, useReducedMotion } from "motion/react";
import { useRouter, useSearchParams } from "next/navigation";
import { useState } from "react";
import { useUnits } from "@/components/providers";
import { PageLoading, StaleNotice, Unavailable } from "@/components/ui/States";
import { ConditionIcon } from "@/components/weather/ConditionIcon";
import { ConfidenceBadge } from "@/components/weather/ConfidenceBadge";
import { TempRangeBar } from "@/components/weather/DailyForecast";
import { type Evidence, EvidenceDrawer } from "@/components/weather/EvidenceDrawer";
import { WeatherDayLandscape } from "@/components/weather/WeatherDayLandscape";
import { analyzePrecip, confidenceFrom, findBestWindow } from "@/lib/editorial-rules";
import { useMediaQuery, useWeather } from "@/lib/use-weather";
import { type Day, type WeatherBundle, HOUR, dayKey, fmtHour, fmtLongDay } from "@/lib/weather-primitives";

export default function DailyPage() {
  const { data, error, isLoading, refetch, now, isStale } = useWeather();
  const params = useSearchParams();
  const router = useRouter();
  const { temp } = useUnits();
  const isDesktop = useMediaQuery("(min-width: 1024px)");
  const [evidence, setEvidence] = useState<Evidence | null>(null);

  if (isLoading) return <PageLoading />;
  if (error || !data) return <Unavailable message={String(error?.message ?? "no data")} onRetry={() => refetch()} />;

  const selectedKey = params.get("day") ?? data.days[0]?.key;
  const select = (k: string) => router.replace(`/daily?day=${k}`, { scroll: false });
  const temps = data.days.flatMap((d) => [d.lowF, d.highF]).filter((v): v is number => v != null);
  const min = Math.min(...temps);
  const max = Math.max(...temps);
  const selected = data.days.find((d) => d.key === selectedKey) ?? data.days[0];

  const detail = (d: Day) => <DayDetail day={d} data={data} now={now} onEvidence={setEvidence} />;

  return (
    <div className="space-y-5">
      {isStale && <StaleNotice fetchedAt={data.fetchedAt} />}
      <div>
        <p className="eyebrow">{data.location.name}</p>
        <h1 className="font-serif text-3xl sm:text-4xl">Daily</h1>
      </div>

      <div className="grid grid-cols-1 gap-5 lg:grid-cols-12">
        <nav aria-label="Days" className="card min-w-0 self-start p-2 lg:col-span-4 wide:col-span-3">
          <ul>
            {data.days.map((d) => {
              const active = d.key === selected?.key;
              return (
                <li key={d.key} className="border-b border-line last:border-0">
                  <button
                    onClick={() => select(d.key)}
                    aria-current={active ? "true" : undefined}
                    aria-expanded={!isDesktop ? active : undefined}
                    className={`grid w-full grid-cols-[3.75rem_1.5rem_2.25rem_minmax(0,1fr)] items-center gap-2 rounded-xl px-2 py-3 text-left sm:grid-cols-[4.5rem_1.75rem_2.5rem_1fr] sm:gap-3 sm:px-3 ${active ? "bg-surface-2" : "hover:bg-surface-2/60"}`}
                  >
                    <span>
                      <span className="block font-semibold">{d.label}</span>
                      <span className="block text-xs text-ink-3">{d.dateLabel}</span>
                    </span>
                    <ConditionIcon condition={d.condition} size={22} />
                    <span className={`tnum text-xs ${d.popMax >= 30 ? "font-medium text-rain" : "text-ink-3"}`}>{d.popMax}%</span>
                    <span className="tnum flex items-center gap-2 text-sm">
                      <span className="w-7 text-right text-ink-3">{temp(d.lowF)}</span>
                      <TempRangeBar day={d} min={min} max={max} />
                      <span className="w-7 font-semibold">{temp(d.highF)}</span>
                    </span>
                  </button>
                  {/* Narrow layouts stack the detail beneath the selected day. */}
                  {!isDesktop && active && <div className="px-1 pb-3 pt-1">{detail(d)}</div>}
                </li>
              );
            })}
          </ul>
        </nav>

        {isDesktop && selected && <div className="min-w-0 lg:col-span-8 wide:col-span-9">{detail(selected)}</div>}
      </div>
      <EvidenceDrawer evidence={evidence} onClose={() => setEvidence(null)} />
    </div>
  );
}

function DayDetail({ day, data, now, onEvidence }: { day: Day; data: WeatherBundle; now: number; onEvidence: (e: Evidence) => void }) {
  const { temp } = useUnits();
  const reduce = useReducedMotion();
  const hours = data.hours.filter((h) => dayKey(h.ts) === day.key);
  const isToday = day.key === dayKey(now);
  const ref = isToday ? now : (hours[0]?.ts ?? day.day?.start ?? now);
  const precip = hours.length ? analyzePrecip(hours, ref, 24) : null;
  const best = hours.length ? findBestWindow(hours, ref) : null;
  const lead = Math.max(0, ((day.day?.start ?? day.night?.start ?? now) - now) / HOUR);
  const conf = confidenceFrom(day.popMax, lead, [`${hours.length} hourly values available for this day`]);
  const thunderMax = Math.max(0, ...hours.map((h) => h.thunder ?? 0));
  const gustMax = Math.max(0, ...hours.map((h) => h.gustMph ?? 0));
  const narrative = day.day?.detailed || day.night?.detailed || "";

  const facts = [
    { icon: Sun, label: "High / Low", value: `${temp(day.highF)} / ${temp(day.lowF)}` },
    { icon: Droplets, label: "Rain", value: precip ? `${fmtHour(precip.likelyStart)}–${fmtHour(precip.likelyEnd)} most likely` : `${day.popMax}% max chance` },
    { icon: Wind, label: "Wind", value: `${day.day?.wind ?? day.night?.wind ?? "—"}${gustMax ? `, gusts ${gustMax} mph` : ""}` },
    { icon: CloudLightning, label: "Risk", value: thunderMax >= 30 ? `Lightning (${thunderMax}% thunder)` : thunderMax > 0 ? `Low thunder risk (${thunderMax}%)` : "No thunder signal" },
  ];

  return (
    <AnimatePresence mode="wait">
      <motion.article
        key={day.key}
        initial={reduce ? false : { opacity: 0, y: 8 }}
        animate={{ opacity: 1, y: 0 }}
        exit={reduce ? undefined : { opacity: 0 }}
        transition={{ duration: 0.2 }}
        className="card space-y-6 p-4 sm:p-6"
        aria-label={`${fmtLongDay(day.day?.start ?? day.night!.start)} detail`}
      >
        <header className="flex flex-wrap items-start justify-between gap-3">
          <div>
            <p className="eyebrow">{fmtLongDay(day.day?.start ?? day.night!.start)}</p>
            <h2 className="mt-1 font-serif text-2xl leading-snug sm:text-3xl">{day.day?.short ?? day.night?.short}</h2>
          </div>
          <div className="flex items-center gap-3">
            <ConditionIcon condition={day.condition} size={36} />
            <span className="tnum text-3xl font-semibold">{temp(day.highF)}</span>
            <span className="tnum text-xl text-ink-3">{temp(day.lowF)}</span>
          </div>
        </header>

        <section aria-label="Narrative" className="grid gap-4 sm:grid-cols-2">
          {day.day && (
            <div>
              <p className="eyebrow mb-1">{day.day.name}</p>
              <p className="text-[0.95rem] leading-relaxed text-ink-2">{day.day.detailed}</p>
            </div>
          )}
          {day.night && (
            <div>
              <p className="eyebrow mb-1">{day.night.name}</p>
              <p className="text-[0.95rem] leading-relaxed text-ink-2">{day.night.detailed}</p>
            </div>
          )}
          {!narrative && <p className="text-sm text-ink-3">No NWS narrative for this day.</p>}
        </section>

        <section aria-label="Day landscape">
          <p className="eyebrow mb-2">Day landscape</p>
          {hours.length >= 2 ? (
            <WeatherDayLandscape hours={hours} now={isToday ? now : undefined} best={best} maxHours={24} title={`${day.label} landscape`} />
          ) : (
            <p className="rounded-xl bg-surface-2 p-4 text-sm text-ink-2">Hourly detail is not published this far out (NWS hourly covers ~6.5 days).</p>
          )}
        </section>

        <dl className="grid grid-cols-1 gap-3 sm:grid-cols-2">
          {facts.map((f) => (
            <div key={f.label} className="rounded-2xl bg-surface-2 p-3">
              <dt className="flex items-center gap-2 text-xs text-ink-3">
                <f.icon size={14} aria-hidden /> {f.label}
              </dt>
              <dd className="tnum mt-0.5 pl-[22px] text-sm font-medium">{f.value}</dd>
            </div>
          ))}
        </dl>

        <div className="grid gap-4 sm:grid-cols-2">
          <section aria-label="Best activity window" className="rounded-2xl border border-line p-4">
            <p className="eyebrow flex items-center gap-1.5 text-ok"><Sun size={12} /> Best activity window</p>
            {best ? (
              <>
                <p className="tnum mt-1 font-serif text-2xl">{best.summary}</p>
                <p className="mt-1 text-sm text-ink-2">{best.why.join(" · ")}</p>
              </>
            ) : (
              <p className="mt-1 text-sm text-ink-2">{hours.length ? "No comfortable 2-hour daylight stretch." : "Not available this far out."}</p>
            )}
          </section>
          <section aria-label="Confidence" className="rounded-2xl border border-line p-4">
            <p className="eyebrow mb-2">Confidence</p>
            <ConfidenceBadge
              confidence={conf}
              onClick={() =>
                onEvidence({
                  title: `${day.label} — evidence`,
                  confidence: conf,
                  facts: hours.filter((_, i) => i % 2 === 0).map((h) => ({ label: fmtHour(h.ts), value: `${temp(h.tempF)} · ${h.pop}% · ${h.short}` })),
                  sources: data.sources.filter((s) => ["forecast", "hourly", "grid"].includes(s.id)).map((s) => ({ label: s.label, url: s.url, updatedAt: s.updatedAt })),
                })
              }
            />
            <p className="mt-2 text-sm text-ink-2">{conf.reason}. Tap for the evidence.</p>
          </section>
        </div>
      </motion.article>
    </AnimatePresence>
  );
}
