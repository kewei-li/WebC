"use client";

import { CheckCircle2, XCircle } from "lucide-react";
import { ScenarioSwitcher } from "@/components/layout/ScenarioSwitcher";
import { PageLoading, Unavailable } from "@/components/ui/States";
import { hourComfort } from "@/lib/editorial-rules";
import { useWeather } from "@/lib/use-weather";
import { fmtHour, relativeMinutes } from "@/lib/weather-primitives";

export default function DebugPage() {
  const { data, editorial, error, isLoading, refetch, now } = useWeather();
  if (isLoading) return <PageLoading />;
  if (error || !data || !editorial) return <Unavailable message={String(error?.message ?? "no data")} onRetry={() => refetch()} />;

  return (
    <div className="space-y-6">
      <div className="flex flex-wrap items-end justify-between gap-3">
        <div>
          <p className="eyebrow">Developer</p>
          <h1 className="font-serif text-3xl">Debug</h1>
        </div>
        <button
          onClick={async () => {
            await fetch("/api/weather?refresh=1");
            refetch();
          }}
          className="rounded-full border border-line-strong px-4 py-2 text-sm hover:bg-surface-2"
        >
          Force refresh from NWS
        </button>
      </div>

      <div className="grid gap-5 lg:grid-cols-3">
        <section className="card p-5"><ScenarioSwitcher /></section>

        <section className="card p-5 lg:col-span-2">
          <h2 className="eyebrow mb-3">Sources · fetched {relativeMinutes(data.fetchedAt, now)}</h2>
          <ul className="space-y-2 text-sm">
            {data.sources.map((s) => (
              <li key={s.id} className="flex items-start gap-2">
                {s.ok ? <CheckCircle2 size={16} className="mt-0.5 text-ok" /> : <XCircle size={16} className="mt-0.5 text-warn" />}
                <span className="min-w-0 flex-1">
                  <span className="font-medium">{s.label}</span>
                  <span className="block truncate text-xs text-ink-3">{s.url}</span>
                  {s.error && <span className="block text-xs text-warn">{s.error}</span>}
                </span>
                <span className="text-xs text-ink-2">{s.updatedAt ? relativeMinutes(s.updatedAt, now) : "—"}</span>
              </li>
            ))}
          </ul>
        </section>
      </div>

      <section className="card p-5">
        <h2 className="eyebrow mb-3">Editorial decisions</h2>
        <p className="font-serif text-xl">{editorial.headline}</p>
        <p className="mt-2 text-sm">
          Modules: <code>{editorial.modules.join(" → ") || "none"}</code> · Radar promoted: <code>{String(editorial.promoteRadar)}</code>
        </p>
        <ul className="mt-3 list-inside list-disc text-sm text-ink-2">
          {editorial.rationale.map((r) => (
            <li key={r}>{r}</li>
          ))}
        </ul>
      </section>

      <section tabIndex={0} aria-label="Normalized hours table (scrolls horizontally)" className="card overflow-x-auto p-5">
        <h2 className="eyebrow mb-3">Normalized hours (first 24)</h2>
        <table className="tnum w-full min-w-[760px] text-left text-xs">
          <thead className="text-ink-3">
            <tr>{["Hour", "Temp", "Feels", "PoP", "Thunder", "QPF mm/h", "Wind", "Gust", "Sky", "Comfort", "Short"].map((h) => <th key={h} className="py-1 pr-3 font-medium">{h}</th>)}</tr>
          </thead>
          <tbody className="divide-y divide-line">
            {data.hours.slice(0, 24).map((h) => (
              <tr key={h.ts}>
                <td className="py-1 pr-3">{fmtHour(h.ts)}</td>
                <td className="pr-3">{h.tempF}</td>
                <td className="pr-3">{h.feelsF ?? "—"}</td>
                <td className="pr-3">{h.pop}%</td>
                <td className="pr-3">{h.thunder ?? "—"}</td>
                <td className="pr-3">{h.qpfMmPerHr?.toFixed(2) ?? "—"}</td>
                <td className="pr-3">{h.windDir} {h.windMph}</td>
                <td className="pr-3">{h.gustMph ?? "—"}</td>
                <td className="pr-3">{h.sky ?? "—"}</td>
                <td className="pr-3">{hourComfort(h)}</td>
                <td className="pr-3">{h.short}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </section>
    </div>
  );
}
