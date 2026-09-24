"use client";

import { Droplets } from "lucide-react";
import { useUnits } from "@/components/providers";
import type { Transition } from "@/lib/editorial-rules";
import type { Hour } from "@/lib/weather-primitives";
import { fmtHour } from "@/lib/weather-primitives";
import { ConditionIcon } from "./ConditionIcon";

const KIND_STYLE: Record<Transition["kind"], string> = {
  "precip-start": "bg-rain-soft text-rain",
  "precip-end": "bg-ok-soft text-ok",
  "temp-peak": "bg-heat-soft text-heat",
  "temp-drop": "bg-rain-soft text-rain",
  "wind-shift": "bg-surface-2 text-ink-2",
  "risk-up": "bg-storm-soft text-storm",
  "risk-down": "bg-ok-soft text-ok",
};
export const transitionStyle = (k: Transition["kind"]) => KIND_STYLE[k];

/** Hours are not equal: transition hours get a label and an emphasized frame. */
export function HourlyStrip({
  hours,
  transitions = [],
  selectedTs,
  onSelect,
}: {
  hours: Hour[];
  transitions?: Transition[];
  selectedTs?: number | null;
  onSelect?: (h: Hour) => void;
}) {
  const { temp } = useUnits();
  const tmap = new Map(transitions.map((t) => [t.ts, t]));
  return (
    <div className="scroll-x -mx-1 px-1 pb-2">
      <ol className="flex min-w-max gap-1.5 pt-7" aria-label="Hourly forecast">
        {hours.map((h, i) => {
          const tr = tmap.get(h.ts);
          const sel = selectedTs === h.ts;
          return (
            <li key={h.ts} className="relative snap-start">
              {tr && (
                <span className={`absolute -top-6 left-0 whitespace-nowrap rounded-full px-2 py-0.5 text-[11px] font-semibold ${KIND_STYLE[tr.kind]}`}>
                  {tr.label}
                </span>
              )}
              <button
                onClick={() => onSelect?.(h)}
                aria-pressed={onSelect ? sel : undefined}
                aria-label={`${i === 0 ? "Now" : fmtHour(h.ts)}: ${temp(h.tempF)}, ${h.short}, ${h.pop}% chance of rain${tr ? `. ${tr.label}: ${tr.detail}` : ""}`}
                className={`flex w-[64px] flex-col items-center gap-1.5 rounded-2xl border px-1 py-3 transition-colors ${
                  sel ? "border-ink bg-surface" : tr ? "border-line-strong bg-surface" : "border-transparent hover:bg-surface"
                } ${h.isDay ? "" : "bg-[var(--night)]"}`}
              >
                <span className="tnum text-xs text-ink-2">{i === 0 ? "Now" : fmtHour(h.ts)}</span>
                <ConditionIcon condition={h.condition} isDay={h.isDay} size={22} />
                <span className="tnum text-base font-semibold">{temp(h.tempF)}</span>
                <span className={`tnum flex items-center gap-0.5 text-[11px] ${h.pop >= 30 ? "font-medium text-rain" : "text-ink-3"}`}>
                  <Droplets size={10} aria-hidden />
                  {h.pop}%
                </span>
                <span className="h-1 w-8 overflow-hidden rounded-full bg-surface-2" aria-hidden>
                  <span className="block h-full bg-rain" style={{ width: `${h.pop}%` }} />
                </span>
              </button>
            </li>
          );
        })}
      </ol>
    </div>
  );
}
