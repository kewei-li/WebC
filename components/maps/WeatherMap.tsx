"use client";

import type { Map as MLMap } from "maplibre-gl";
import { useEffect, useRef, useState } from "react";
import { basemapStyle, radarTiles } from "@/lib/maps/layers";
import { useResolvedTheme } from "@/lib/theme";
import type { WeatherAlert } from "@/lib/weather-primitives";

// MapLibre v6 ships split ESM (main + shared + module worker). Bundling it gives the
// worker a different copy of the shared chunk and the style never loads, so the
// untouched build is served from /public (copied by the postinstall script).
let libPromise: Promise<typeof import("maplibre-gl")> | null = null;
function loadMapLibre() {
  libPromise ??= import(/* webpackIgnore: true */ /* turbopackIgnore: true */ `${window.location.origin}/maplibre/maplibre-gl.mjs`);
  return libPromise;
}

/** MapLibre expands the compact attribution once sources load; keep it as just the (i)
 *  button until the user opens it themselves. */
function keepAttributionCollapsed(root: HTMLElement) {
  const attrib = root.querySelector(".maplibregl-ctrl-attrib");
  if (!attrib) return;
  let userToggled = false;
  attrib.querySelector(".maplibregl-ctrl-attrib-button")?.addEventListener("click", () => (userToggled = true), { capture: true });
  const collapse = () => {
    if (!userToggled && attrib.classList.contains("maplibregl-compact-show")) attrib.classList.remove("maplibregl-compact-show");
  };
  new MutationObserver(collapse).observe(attrib, { attributes: true, attributeFilter: ["class"] });
  collapse();
}

export type MapView = { lat: number; lon: number; zoom: number };

export function WeatherMap({
  view,
  frames,
  frameIndex,
  showRadar = true,
  showAlerts = false,
  alerts = [],
  interactive = true,
  onAlertClick,
  onViewChange,
  route = [],
  showRoute = false,
  className = "",
  label = "Weather map",
}: {
  view: MapView;
  frames: string[]; // ISO times; empty → latest only
  frameIndex: number;
  showRadar?: boolean;
  showAlerts?: boolean;
  alerts?: WeatherAlert[];
  interactive?: boolean;
  onAlertClick?: (id: string) => void;
  onViewChange?: (v: MapView) => void;
  /** Route stops with the rain risk at the time they are passed. */
  route?: { name: string; lat: number; lon: number; risk: "clear" | "near" | "heavy" }[];
  showRoute?: boolean;
  className?: string;
  label?: string;
}) {
  const el = useRef<HTMLDivElement>(null);
  const map = useRef<MLMap | null>(null);
  const beforeId = useRef<string | undefined>(undefined); // first label layer: weather draws beneath labels
  const [ready, setReady] = useState(false);
  const dark = useResolvedTheme() === "dark";
  const frameKeys = frames.length ? frames : ["latest"];
  const cb = useRef({ onAlertClick, onViewChange });
  useEffect(() => {
    cb.current = { onAlertClick, onViewChange };
  });

  // init
  useEffect(() => {
    let disposed = false;
    let m: MLMap | null = null;
    (async () => {
      const maplibregl = await loadMapLibre();
      if (disposed || !el.current) return;
      const mm = new maplibregl.Map({
        container: el.current,
        center: [view.lon, view.lat],
        zoom: view.zoom,
        interactive,
        attributionControl: false,
        style: basemapStyle(dark),
      });
      m = mm;
      if (process.env.NODE_ENV !== "production") (window as unknown as { __maps?: MLMap[] }).__maps = [...((window as unknown as { __maps?: MLMap[] }).__maps ?? []), mm];
      mm.on("error", (e) => console.warn("[map]", e.error?.message ?? e));
      // Controls live top-left so the bottom edge stays free for the radar timeline.
      if (interactive) {
        // Narrow/touch screens pinch to zoom and keep the top edge free for the header and
        // Layers button: attribution goes bottom-right, lifted above the timeline (.map-lift-bottom).
        const narrow = window.matchMedia("(max-width: 1023px)").matches;
        mm.addControl(new maplibregl.AttributionControl({ compact: true }), narrow ? "bottom-right" : "top-left");
        if (!narrow) mm.addControl(new maplibregl.NavigationControl({ showCompass: false }), "top-left");
        keepAttributionCollapsed(el.current);
      }
      // "style.load" (not "load") — "load" waits for every tile incl. slow relief rasters.
      mm.once("style.load", () => {
        if (disposed || !m) return;
        beforeId.current = m.getStyle().layers.find((l) => l.type === "symbol")?.id;
        m.addSource("home", { type: "geojson", data: { type: "Feature", properties: {}, geometry: { type: "Point", coordinates: [-80.1918, 25.7617] } } });
        m.addLayer({ id: "home-halo", type: "circle", source: "home", paint: { "circle-radius": 11, "circle-color": "#0b6e77", "circle-opacity": 0.18 } });
        m.addLayer({ id: "home", type: "circle", source: "home", paint: { "circle-radius": 5, "circle-color": "#0b6e77", "circle-stroke-width": 2, "circle-stroke-color": "#fff" } });
        setReady(true);
      });
      mm.on("moveend", () => {
        if (!m) return;
        const c = m.getCenter();
        cb.current.onViewChange?.({ lat: +c.lat.toFixed(3), lon: +c.lng.toFixed(3), zoom: +m.getZoom().toFixed(1) });
      });
      map.current = mm;
    })();
    return () => {
      disposed = true;
      m?.remove();
      map.current = null;
      setReady(false);
    };
    // Recreate only when theme or interactivity changes.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [dark, interactive]);

  // radar frames: one source per frame, toggled by opacity for smooth playback
  useEffect(() => {
    const m = map.current;
    if (!m || !ready) return;
    for (const key of frameKeys) {
      const id = `radar-${key}`;
      if (!m.getSource(id)) {
        m.addSource(id, { type: "raster", tiles: [radarTiles(key === "latest" ? undefined : key)], tileSize: 256, attribution: "Radar: NOAA/NCEP MRMS" });
        m.addLayer({ id, type: "raster", source: id, paint: { "raster-opacity": 0, "raster-fade-duration": 0 } }, beforeId.current);
      }
    }
    // remove frames that aged out
    for (const l of m.getStyle().layers ?? []) {
      if (l.id.startsWith("radar-") && !frameKeys.includes(l.id.slice(6))) {
        m.removeLayer(l.id);
        m.removeSource(l.id);
      }
    }
  }, [ready, frameKeys.join("|")]); // eslint-disable-line react-hooks/exhaustive-deps

  useEffect(() => {
    const m = map.current;
    if (!m || !ready) return;
    frameKeys.forEach((key, i) => {
      if (m.getLayer(`radar-${key}`)) m.setPaintProperty(`radar-${key}`, "raster-opacity", showRadar && i === Math.min(frameIndex, frameKeys.length - 1) ? 0.78 : 0);
    });
  }, [ready, frameIndex, showRadar, frameKeys.join("|")]); // eslint-disable-line react-hooks/exhaustive-deps

  // alert polygons
  useEffect(() => {
    const m = map.current;
    if (!m || !ready) return;
    const fc: GeoJSON.FeatureCollection = {
      type: "FeatureCollection",
      features: alerts
        .filter((a) => a.geometry)
        .map((a) => ({ type: "Feature", geometry: a.geometry!, properties: { id: a.id, event: a.event, warning: /warning/i.test(a.event) } })),
    };
    const src = m.getSource("alerts") as { setData?: (d: GeoJSON.FeatureCollection) => void } | undefined;
    if (src?.setData) src.setData(fc);
    else {
      m.addSource("alerts", { type: "geojson", data: fc });
      m.addLayer({ id: "alerts-fill", type: "fill", source: "alerts", paint: { "fill-color": ["case", ["get", "warning"], "#d93025", "#e8912d"], "fill-opacity": 0.18 } }, beforeId.current);
      m.addLayer({ id: "alerts-line", type: "line", source: "alerts", paint: { "line-color": ["case", ["get", "warning"], "#b3261e", "#c86f10"], "line-width": 2 } }, beforeId.current);
      m.on("click", "alerts-fill", (e) => {
        const id = e.features?.[0]?.properties?.id;
        if (id) cb.current.onAlertClick?.(String(id));
      });
      m.on("mouseenter", "alerts-fill", () => (m.getCanvas().style.cursor = "pointer"));
      m.on("mouseleave", "alerts-fill", () => (m.getCanvas().style.cursor = ""));
    }
    for (const id of ["alerts-fill", "alerts-line"]) m.setLayoutProperty(id, "visibility", showAlerts ? "visible" : "none");
  }, [ready, alerts, showAlerts]);

  // route overlay
  useEffect(() => {
    const m = map.current;
    if (!m || !ready) return;
    const color = ["match", ["get", "risk"], "heavy", "#6b48c2", "near", "#2b64c8", "#2d7a4c"] as unknown as string;
    const line: GeoJSON.FeatureCollection = {
      type: "FeatureCollection",
      features: route.slice(1).map((s, i) => ({
        type: "Feature",
        properties: { risk: s.risk === "heavy" || route[i].risk === "heavy" ? "heavy" : s.risk === "near" || route[i].risk === "near" ? "near" : "clear" },
        geometry: { type: "LineString", coordinates: [[route[i].lon, route[i].lat], [s.lon, s.lat]] },
      })),
    };
    const stops: GeoJSON.FeatureCollection = {
      type: "FeatureCollection",
      features: route.map((s) => ({ type: "Feature", properties: { risk: s.risk, name: s.name }, geometry: { type: "Point", coordinates: [s.lon, s.lat] } })),
    };
    const src = m.getSource("route-line") as { setData?: (d: GeoJSON.FeatureCollection) => void } | undefined;
    if (src?.setData) {
      src.setData(line);
      (m.getSource("route-stops") as unknown as { setData: (d: GeoJSON.FeatureCollection) => void }).setData(stops);
    } else {
      m.addSource("route-line", { type: "geojson", data: line });
      m.addSource("route-stops", { type: "geojson", data: stops });
      m.addLayer({ id: "route-casing", type: "line", source: "route-line", layout: { "line-cap": "round" }, paint: { "line-color": "#ffffff", "line-width": 8, "line-opacity": 0.8 } });
      m.addLayer({ id: "route-line", type: "line", source: "route-line", layout: { "line-cap": "round" }, paint: { "line-color": color, "line-width": 5 } });
      m.addLayer({ id: "route-stops", type: "circle", source: "route-stops", paint: { "circle-radius": 5, "circle-color": color, "circle-stroke-color": "#fff", "circle-stroke-width": 2 } });
    }
    for (const id of ["route-casing", "route-line", "route-stops"]) m.setLayoutProperty(id, "visibility", showRoute && route.length ? "visible" : "none");
  }, [ready, route, showRoute]);

  // external view changes (deep links)
  useEffect(() => {
    const m = map.current;
    if (!m || !ready) return;
    const c = m.getCenter();
    if (Math.abs(c.lat - view.lat) > 0.01 || Math.abs(c.lng - view.lon) > 0.01 || Math.abs(m.getZoom() - view.zoom) > 0.2)
      m.easeTo({ center: [view.lon, view.lat], zoom: view.zoom, duration: 600 });
  }, [ready, view.lat, view.lon, view.zoom]);

  // MapLibre's (unlayered) CSS forces position:relative on the map element, so sizing lives on a wrapper.
  return (
    <div role="region" aria-label={label} className={`overflow-hidden bg-surface-2 ${className}`}>
      <div ref={el} className="h-full w-full" />
    </div>
  );
}
