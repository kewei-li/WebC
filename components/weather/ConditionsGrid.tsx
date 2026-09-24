"use client";

import { useUnits } from "@/components/providers";
import type { Current } from "@/lib/weather-primitives";

export function ConditionsGrid({ current }: { current: Current | null }) {
  const { temp } = useUnits();
  if (!current) return <p className="text-sm text-ink-3">Observation unavailable.</p>;
  const items = [
    { label: "Feels like", value: temp(current.feelsF) },
    { label: "Humidity", value: current.humidity != null ? `${current.humidity}%` : "—" },
    { label: "Dew point", value: temp(current.dewpointF), note: current.dewpointF != null && current.dewpointF >= 70 ? "Muggy" : undefined },
    { label: "Wind", value: current.windMph != null ? (current.windMph === 0 ? "Calm" : `${current.windDir} ${current.windMph} mph`) : "—" },
    { label: "Gusts", value: current.gustMph != null ? `${current.gustMph} mph` : "None reported" },
    { label: "Visibility", value: current.visibilityMi != null ? `${current.visibilityMi} mi` : "—" },
    { label: "Pressure", value: current.pressureInHg != null ? `${current.pressureInHg} inHg` : "—" },
    { label: "Station", value: current.stationId },
  ];
  return (
    <dl className="grid grid-cols-2 gap-px overflow-hidden rounded-2xl border border-line bg-line sm:grid-cols-4">
      {items.map((i) => (
        <div key={i.label} className="bg-surface px-4 py-3">
          <dt className="text-xs text-ink-3">{i.label}</dt>
          <dd className="tnum mt-0.5 font-medium">
            {i.value} {i.note && <span className="text-xs font-normal text-ink-2">· {i.note}</span>}
          </dd>
        </div>
      ))}
    </dl>
  );
}
