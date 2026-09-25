"use client";

import { Bell, Bug, Crown, MapPin, Search, Settings, Star } from "lucide-react";
import Link from "next/link";
import { useState } from "react";
import { useUnits } from "@/components/providers";
import { Sheet } from "@/components/ui/Sheet";
import { ScenarioSwitcher } from "./ScenarioSwitcher";
import { ThemeSegmented } from "./ThemeToggle";
import { useWeather } from "@/lib/use-weather";

export type UtilityTab = "search" | "saved" | "settings" | "account";

const TABS: { id: UtilityTab; label: string; icon: typeof Search }[] = [
  { id: "search", label: "Search", icon: Search },
  { id: "saved", label: "Saved", icon: Star },
  { id: "settings", label: "Settings", icon: Settings },
  { id: "account", label: "Premium", icon: Crown },
];

export function UtilitySheet({ tab, onTab, onClose }: { tab: UtilityTab | null; onTab: (t: UtilityTab) => void; onClose: () => void }) {
  const { data } = useWeather();
  const { units, setUnits, temp } = useUnits();
  const [q, setQ] = useState("");
  const miamiMatch = !q || "miami, fl 33130".includes(q.toLowerCase());

  return (
    <Sheet open={!!tab} onClose={onClose} title="Location & utilities">
      <div role="tablist" aria-label="Utilities" className="mb-5 grid grid-cols-4 gap-1 rounded-2xl bg-surface-2 p-1">
        {TABS.map((t) => (
          <button
            key={t.id}
            role="tab"
            aria-selected={tab === t.id}
            onClick={() => onTab(t.id)}
            className={`flex flex-col items-center gap-1 rounded-xl py-2 text-xs font-medium ${tab === t.id ? "bg-surface shadow-sm" : "text-ink-2"}`}
          >
            <t.icon size={16} />
            {t.label}
          </button>
        ))}
      </div>

      {tab === "search" && (
        <div className="space-y-4">
          <label className="block">
            <span className="sr-only">Search city or ZIP</span>
            <input
              autoFocus
              value={q}
              onChange={(e) => setQ(e.target.value)}
              placeholder="Search city or ZIP"
              className="w-full rounded-xl border border-line-strong bg-surface px-4 py-3 text-base outline-none focus:border-accent"
            />
          </label>
          {miamiMatch ? (
            <button onClick={onClose} className="flex w-full items-center gap-3 rounded-xl border border-accent bg-accent-soft px-4 py-3 text-left">
              <MapPin size={16} className="text-accent" />
              <span className="flex-1">
                <span className="block font-medium">Miami, FL</span>
                <span className="text-xs text-ink-2">NWS Miami (MFL) · grid 110,50</span>
              </span>
              <span className="tnum font-semibold">{temp(data?.current?.tempF)}</span>
            </button>
          ) : (
            <p className="rounded-xl bg-surface-2 p-3 text-sm text-ink-2">No match. This prototype serves live NWS data for Miami, FL only.</p>
          )}
          <p className="text-xs text-ink-3">Multi-location search arrives with the scenario/geocoding milestone.</p>
        </div>
      )}

      {tab === "saved" && (
        <ul className="space-y-2">
          <li className="flex items-center gap-3 rounded-xl border border-line px-4 py-3">
            <Star size={16} className="fill-accent text-accent" />
            <span className="flex-1">
              <span className="block font-medium">Miami, FL</span>
              <span className="text-xs text-ink-2">{data?.current?.text ?? "—"}</span>
            </span>
            <span className="tnum font-semibold">{temp(data?.current?.tempF)}</span>
          </li>
          <li className="rounded-xl border border-dashed border-line-strong px-4 py-3 text-sm text-ink-3">Add another location (coming soon)</li>
        </ul>
      )}

      {tab === "settings" && (
        <div className="space-y-5">
          <fieldset>
            <legend className="eyebrow mb-2">Temperature units</legend>
            <div className="grid grid-cols-2 gap-1 rounded-xl bg-surface-2 p-1">
              {(["F", "C"] as const).map((u) => (
                <button
                  key={u}
                  aria-pressed={units === u}
                  onClick={() => setUnits(u)}
                  className={`rounded-lg py-2 text-sm font-medium ${units === u ? "bg-surface shadow-sm" : "text-ink-2"}`}
                >
                  °{u}
                </button>
              ))}
            </div>
          </fieldset>
          <ThemeSegmented />
          <ScenarioSwitcher onPick={onClose} />
          <p className="text-sm text-ink-2">Motion follows your system “reduce motion” setting.</p>
          <Link href="/alerts" onClick={onClose} className="flex items-center gap-2 text-sm text-accent">
            <Bell size={14} /> Alert preferences
          </Link>
          <Link href="/debug" onClick={onClose} className="flex items-center gap-2 text-sm text-ink-2">
            <Bug size={14} /> Developer: data & editorial debug
          </Link>
        </div>
      )}

      {tab === "account" && (
        <div className="space-y-3 text-sm text-ink-2">
          <p className="font-serif text-xl text-ink">Conservative Weather Premium</p>
          <p>Minute-by-minute rain, route weather and calendar-aware windows. Placeholder in this prototype.</p>
          <button disabled className="w-full rounded-full bg-ink py-2.5 font-medium text-paper opacity-50">Sign in (not available in prototype)</button>
        </div>
      )}
    </Sheet>
  );
}
