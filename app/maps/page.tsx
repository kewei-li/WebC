"use client";

import { Layers } from "lucide-react";
import { useRouter, useSearchParams } from "next/navigation";
import { useEffect, useMemo, useState } from "react";
import { MapInfoRail } from "@/components/maps/MapInfoRail";
import { MapTimeline } from "@/components/maps/MapTimeline";
import { type MapView, WeatherMap } from "@/components/maps/WeatherMap";
import { Sheet } from "@/components/ui/Sheet";
import { PageLoading, Unavailable } from "@/components/ui/States";
import type { LayerId } from "@/lib/maps/layers";
import { useMediaQuery, useRadarFrames, useWeather } from "@/lib/use-weather";

export default function MapsPage() {
  const params = useSearchParams();
  const router = useRouter();
  const { data, editorial, error, isLoading, refetch, now } = useWeather();
  const frames = useRadarFrames().data?.frames ?? [];
  const isDesktop = useMediaQuery("(min-width: 1024px)");
  const reduce = useMediaQuery("(prefers-reduced-motion: reduce)");

  // Deep link: /maps?layer=radar,alerts&z=8&lat=25.76&lon=-80.19&play=1
  const [active, setActive] = useState<Set<LayerId>>(() => {
    const l = (params.get("layer") ?? "radar,alerts,route").split(",").filter((x): x is LayerId => x === "radar" || x === "alerts" || x === "route");
    return new Set(l.length ? l : ["radar"]);
  });
  const [view, setView] = useState<MapView>(() => ({
    lat: Number(params.get("lat") ?? 25.9),
    lon: Number(params.get("lon") ?? -80.5),
    zoom: Number(params.get("z") ?? 7),
  }));
  // null = follow the latest frame; a number = user-picked frame.
  const [picked, setPicked] = useState<number | null>(null);
  const [framesKey, setFramesKey] = useState("");
  const [playing, setPlaying] = useState(params.get("play") === "1");
  const [sheet, setSheet] = useState(false);
  const [alertId, setAlertId] = useState<string | null>(params.get("alert"));

  // Jump back to the latest frame whenever the frame list refreshes.
  if (framesKey !== frames.join("|")) {
    setFramesKey(frames.join("|"));
    setPicked(null);
  }
  const index = Math.min(picked ?? frames.length - 1, Math.max(0, frames.length - 1));
  const setIndex = (i: number) => setPicked(i);

  useEffect(() => {
    if (!playing || frames.length < 2 || reduce) return;
    const id = setInterval(() => setPicked((i) => ((i ?? frames.length - 1) + 1) % frames.length), 700);
    return () => clearInterval(id);
  }, [playing, frames.length, reduce]);

  const selectedAlert = useMemo(() => data?.regionalAlerts.find((a) => a.id === alertId) ?? null, [data, alertId]);

  const toggle = (id: LayerId) => {
    const next = new Set(active);
    if (next.has(id)) next.delete(id);
    else next.add(id);
    setActive(next);
    const q = new URLSearchParams(params.toString());
    q.set("layer", [...next].join(","));
    router.replace(`/maps?${q}`, { scroll: false });
  };

  if (isLoading) return <PageLoading />;
  if (error || !data || !editorial) return <Unavailable message={String(error?.message ?? "no data")} onRetry={() => refetch()} />;

  const routeStops = editorial.route?.segments ?? [];
  const rail = <MapInfoRail data={data} editorial={editorial} active={active} onToggle={toggle} selectedAlert={selectedAlert} now={now} />;

  return (
    <div className="-mx-4 -my-5 sm:-mx-6 sm:-my-7 wide:-mx-10">
      <h1 className="sr-only">Maps — radar and warnings around {data.location.name}</h1>
      <div className="flex h-[calc(100dvh-var(--header-h,8rem))]">
        <div className="relative min-w-0 flex-1">
          <WeatherMap
            view={view}
            frames={frames}
            frameIndex={index}
            showRadar={active.has("radar")}
            showAlerts={active.has("alerts")}
            alerts={data.regionalAlerts}
            route={routeStops}
            showRoute={active.has("route")}
            onAlertClick={(id) => {
              setAlertId(id);
              if (!isDesktop) setSheet(true);
            }}
            onViewChange={setView}
            className="map-lift-bottom absolute inset-0"
            label="Interactive weather map. Use the layer panel and timeline controls to explore."
          />
          {!isDesktop && (
            <button onClick={() => setSheet(true)} className="absolute right-3 top-3 inline-flex items-center gap-1.5 rounded-full bg-surface px-3.5 py-2 text-sm font-medium shadow-card">
              <Layers size={15} /> Layers & info
            </button>
          )}
          {active.has("radar") && (
            <div className="absolute inset-x-3 bottom-3 sm:inset-x-4 sm:bottom-4">
              <MapTimeline frames={frames} index={index} playing={playing && !reduce} onIndex={setIndex} onPlaying={setPlaying} />
            </div>
          )}
        </div>
        {isDesktop && (
          <aside aria-label="Layers and map info" className="w-[340px] shrink-0 overflow-y-auto border-l border-line bg-paper p-5 wide:w-[380px]">
            {rail}
          </aside>
        )}
      </div>
      {!isDesktop && (
        <Sheet open={sheet} onClose={() => setSheet(false)} title="Layers & info">
          {rail}
        </Sheet>
      )}
    </div>
  );
}
