"use client";

import { FlaskConical, Radio } from "lucide-react";
import { usePathname, useRouter } from "next/navigation";
import { setStoredScenario, useScenario } from "@/lib/scenario";
import type { ScenarioId } from "@/lib/weather-primitives";

export const SCENARIOS: { id: ScenarioId | "live"; label: string; file?: string }[] = [
  { id: "live", label: "Live — NWS Miami" },
  { id: "calm", label: "Calm Day", file: "calm-day.json" },
  { id: "rain", label: "Rain Arrival", file: "rain-arrival.json" },
  { id: "severe", label: "Severe Weather", file: "severe-weather.json" },
  { id: "calendar", label: "Calendar Activity — soccer practice", file: "calendar-activity.json" },
  { id: "route", label: "Route Weather — 2 h drive", file: "route-weather.json" },
  { id: "uncertain", label: "Forecast Uncertainty", file: "forecast-uncertainty.json" },
];

/** Dev control: swaps the data source for every page. Choice sticks for this tab. */
export function ScenarioSwitcher({ onPick }: { onPick?: () => void }) {
  const active = useScenario() ?? "live";
  const router = useRouter();
  const path = usePathname();
  const pick = (id: ScenarioId | "live") => {
    setStoredScenario(id === "live" ? null : id);
    router.replace(`${path}?scenario=${id}`, { scroll: false });
    onPick?.();
  };
  return (
    <fieldset className="space-y-2">
      <legend className="eyebrow mb-2">Scenario</legend>
      {SCENARIOS.map((s) => (
        <label
          key={s.id}
          className={`flex cursor-pointer items-center gap-3 rounded-xl border px-3 py-2 text-sm ${active === s.id ? "border-accent bg-accent-soft" : "border-line hover:border-line-strong"}`}
        >
          <input type="radio" name="scenario" checked={active === s.id} onChange={() => pick(s.id)} className="accent-[var(--accent)]" />
          {s.id === "live" ? <Radio size={14} className="text-accent" /> : <FlaskConical size={14} className="text-ink-3" />}
          <span className="flex-1">{s.label}</span>
          <code className="hidden text-xs text-ink-2 sm:inline">?scenario={s.id}</code>
        </label>
      ))}
    </fieldset>
  );
}
