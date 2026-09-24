"use client";

import { useUnits } from "@/components/providers";
import type { Day, WeatherBundle } from "@/lib/weather-primitives";
import { relativeMinutes } from "@/lib/weather-primitives";
import { ConditionIcon } from "./ConditionIcon";

export function CurrentConditions({ data, today, now }: { data: WeatherBundle; today?: Day; now: number }) {
  const { temp } = useUnits();
  const c = data.current;
  const obsAge = c ? now - c.observedAt : Infinity;
  const obsStale = obsAge > 90 * 60_000;
  return (
    <div className="flex flex-col gap-3">
      <div className="flex items-center gap-2 text-sm text-ink-2">
        <span className="font-medium text-ink">{data.location.name}</span>
        <span aria-hidden>·</span>
        <span>{new Date(now).toLocaleDateString("en-US", { weekday: "long", month: "long", day: "numeric", timeZone: data.location.timeZone })}</span>
      </div>
      {c ? (
        <div className="flex items-end gap-4">
          <span className="tnum font-serif text-[5.5rem] leading-[0.85] tracking-tight sm:text-[6.5rem]">{temp(c.tempF)}</span>
          <div className="pb-1.5">
            <div className="flex items-center gap-2 text-lg font-medium">
              <ConditionIcon condition={c.condition} size={22} />
              {c.text}
            </div>
            <div className="tnum mt-0.5 text-sm text-ink-2">
              Feels {temp(c.feelsF)} · H {temp(today?.highF)} · L {temp(today?.lowF)}
            </div>
          </div>
        </div>
      ) : (
        <p role="status" className="rounded-xl bg-surface-2 p-3 text-sm text-ink-2">Current observation unavailable from nearby NWS stations.</p>
      )}
      {c && (
        <p className={`text-xs ${obsStale ? "font-medium text-heat" : "text-ink-3"}`}>
          {obsStale ? "Stale — " : ""}Observed {relativeMinutes(c.observedAt, now)} at {c.stationName} ({c.stationId})
        </p>
      )}
    </div>
  );
}
