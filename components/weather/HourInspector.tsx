"use client";

import { useUnits } from "@/components/providers";
import { type Transition, hourComfort } from "@/lib/editorial-rules";
import { type Hour, fmtHour, fmtLongDay } from "@/lib/weather-primitives";
import { ConditionIcon } from "./ConditionIcon";
import { transitionStyle } from "./HourlyForecast";

export function HourInspector({ hour, transitions }: { hour: Hour; transitions: Transition[] }) {
  const { temp } = useUnits();
  const tr = transitions.filter((t) => t.ts === hour.ts);
  const rows = [
    ["Feels like", temp(hour.feelsF)],
    ["Rain chance", `${hour.pop}%`],
    ["Thunder chance", hour.thunder != null ? `${hour.thunder}%` : "—"],
    ["Rain rate (QPF)", hour.qpfMmPerHr != null ? `${hour.qpfMmPerHr.toFixed(1)} mm/h` : "—"],
    ["Wind", `${hour.windDir} ${hour.windMph} mph`],
    ["Gusts", hour.gustMph != null ? `${hour.gustMph} mph` : "—"],
    ["Humidity", hour.humidity != null ? `${hour.humidity}%` : "—"],
    ["Dew point", temp(hour.dewpointF)],
    ["Sky cover", hour.sky != null ? `${hour.sky}%` : "—"],
    ["Outdoor comfort", `${hourComfort(hour)}/100`],
  ];
  return (
    <div>
      <p className="eyebrow">{fmtLongDay(hour.ts)}</p>
      <div className="mt-1 flex items-center gap-3">
        <span className="tnum font-serif text-4xl">{fmtHour(hour.ts)}</span>
        <ConditionIcon condition={hour.condition} isDay={hour.isDay} size={28} />
        <span className="tnum ml-auto text-3xl font-semibold">{temp(hour.tempF)}</span>
      </div>
      <p className="mt-1 text-sm text-ink-2">{hour.short}</p>
      {tr.length > 0 && (
        <ul className="mt-3 space-y-1.5">
          {tr.map((t) => (
            <li key={t.kind} className={`rounded-xl px-3 py-2 text-sm ${transitionStyle(t.kind)}`}>
              <b>{t.label}</b> — {t.detail}
            </li>
          ))}
        </ul>
      )}
      <dl className="mt-4 divide-y divide-line text-sm">
        {rows.map(([k, v]) => (
          <div key={k} className="flex justify-between py-2">
            <dt className="text-ink-2">{k}</dt>
            <dd className="tnum font-medium">{v}</dd>
          </div>
        ))}
      </dl>
      <p className="mt-3 text-xs text-ink-3">Source: NWS hourly forecast + gridded data.</p>
    </div>
  );
}
