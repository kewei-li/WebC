"use client";

import Link from "next/link";
import { useRadarFrames } from "@/lib/use-weather";
import { fmtClock } from "@/lib/weather-primitives";
import { WeatherMap } from "./WeatherMap";

export function RadarPreview() {
  const { data } = useRadarFrames();
  const latest = data?.frames?.at(-1);
  return (
    <Link href="/maps?layer=radar&play=1" className="group relative block overflow-hidden rounded-2xl" aria-label="Open radar map">
      <WeatherMap
        view={{ lat: 25.9, lon: -80.4, zoom: 6.4 }}
        frames={latest ? [latest] : []}
        frameIndex={0}
        interactive={false}
        className="pointer-events-none h-56 sm:h-64"
        label="Radar preview around Miami"
      />
      <span className="tnum absolute left-3 top-3 rounded-full bg-surface/90 px-2.5 py-1 text-xs font-medium shadow-card">
        Radar {latest ? `· ${fmtClock(Date.parse(latest))}` : "· latest"}
      </span>
      <span className="absolute bottom-3 right-3 rounded-full bg-ink px-3 py-1.5 text-xs font-medium text-paper transition-transform group-hover:translate-x-0.5">
        Open interactive radar →
      </span>
    </Link>
  );
}
