"use client";

import Link from "next/link";
import { useUnits } from "@/components/providers";
import type { Day } from "@/lib/weather-primitives";
import { ConditionIcon } from "./ConditionIcon";

export function TempRangeBar({ day, min, max }: { day: Day; min: number; max: number }) {
  const lo = day.lowF ?? day.highF ?? min;
  const hi = day.highF ?? lo;
  const span = Math.max(1, max - min);
  return (
    <span className="relative block h-1.5 w-full rounded-full bg-surface-2" aria-hidden>
      <span
        className="absolute h-full rounded-full"
        style={{
          left: `${((lo - min) / span) * 100}%`,
          width: `${Math.max(6, ((hi - lo) / span) * 100)}%`,
          background: "linear-gradient(90deg, var(--rain), var(--heat))",
        }}
      />
    </span>
  );
}

export function DailyForecast({ days, limit = 7 }: { days: Day[]; limit?: number }) {
  const { temp } = useUnits();
  const list = days.slice(0, limit);
  const temps = list.flatMap((d) => [d.lowF, d.highF]).filter((v): v is number => v != null);
  const min = Math.min(...temps);
  const max = Math.max(...temps);
  return (
    <ul className="divide-y divide-line">
      {list.map((d) => (
        <li key={d.key}>
          <Link
            href={`/daily?day=${d.key}`}
            className="grid grid-cols-[3.5rem_1.75rem_3rem_1fr] items-center gap-3 rounded-xl px-2 py-2.5 hover:bg-surface-2 sm:grid-cols-[4rem_1.75rem_1fr_3rem_8rem] sm:gap-4"
            aria-label={`${d.label}: ${d.day?.short ?? d.night?.short}, high ${temp(d.highF)}, low ${temp(d.lowF)}, ${d.popMax}% chance of rain`}
          >
            <span className="font-medium">{d.label}</span>
            <ConditionIcon condition={d.condition} size={20} />
            <span className="hidden truncate text-sm text-ink-2 sm:block">{d.day?.short ?? d.night?.short}</span>
            <span className={`tnum text-xs ${d.popMax >= 30 ? "font-medium text-rain" : "text-ink-3"}`}>{d.popMax}%</span>
            <span className="tnum flex items-center gap-2 text-sm">
              <span className="w-7 text-right text-ink-3">{temp(d.lowF)}</span>
              <TempRangeBar day={d} min={min} max={max} />
              <span className="w-7 font-semibold">{temp(d.highF)}</span>
            </span>
          </Link>
        </li>
      ))}
    </ul>
  );
}
