"use client";

import { useQuery } from "@tanstack/react-query";
import { useEffect, useMemo, useState, useSyncExternalStore } from "react";
import { buildEditorial } from "./editorial-rules";
import { useScenario } from "./scenario";
import type { WeatherBundle } from "./weather-primitives";

export const STALE_AFTER_MS = 20 * 60_000;

export function useWeather() {
  const scenario = useScenario();
  const q = useQuery<WeatherBundle>({
    queryKey: ["weather", "miami", scenario ?? "live"],
    queryFn: async () => {
      const res = await fetch(scenario ? `/api/weather?scenario=${scenario}` : "/api/weather");
      const body = await res.json();
      if (!res.ok) throw new Error(body?.detail ?? "NWS data unavailable");
      return body as WeatherBundle;
    },
    staleTime: 4 * 60_000,
    refetchInterval: 5 * 60_000,
  });
  const now = useNow(60_000);
  const editorial = useMemo(() => (q.data ? buildEditorial(q.data, now) : null), [q.data, now]);
  const isStale = !!q.data && now - q.data.fetchedAt > STALE_AFTER_MS;
  return { ...q, editorial, now, isStale };
}

export function useNow(interval = 60_000) {
  const [now, setNow] = useState(() => Date.now());
  useEffect(() => {
    const id = setInterval(() => setNow(Date.now()), interval);
    return () => clearInterval(id);
  }, [interval]);
  return now;
}

export function useElementWidth<T extends HTMLElement>() {
  const [el, setEl] = useState<T | null>(null);
  const [width, setWidth] = useState(0);
  useEffect(() => {
    if (!el) return;
    const ro = new ResizeObserver(([e]) => setWidth(e.contentRect.width));
    ro.observe(el);
    return () => ro.disconnect();
  }, [el]);
  return [setEl, width] as const;
}

export function useMediaQuery(query: string) {
  return useSyncExternalStore(
    (cb) => {
      const m = window.matchMedia(query);
      m.addEventListener("change", cb);
      return () => m.removeEventListener("change", cb);
    },
    () => window.matchMedia(query).matches,
    () => false,
  );
}

export function useRadarFrames() {
  return useQuery<{ frames: string[] }>({
    queryKey: ["radar-frames"],
    queryFn: () => fetch("/api/radar-frames").then((r) => r.json()),
    refetchInterval: 2 * 60_000,
  });
}
