"use client";

import { scaleLinear } from "d3-scale";
import { area, curveMonotoneX, line } from "d3-shape";
import { useId, useMemo, useState } from "react";
import { useUnits } from "@/components/providers";
import type { BestWindow } from "@/lib/editorial-rules";
import { useElementWidth } from "@/lib/use-weather";
import { type Hour, HOUR, fmtHour, hourOfDay } from "@/lib/weather-primitives";

type Marker = { ts: number; label: string };

/**
 * Weather Day Landscape — one glance at a day: sky cover on top, a temperature
 * ridge in the middle, rain-chance columns below, night shading, best window and now.
 */
export function WeatherDayLandscape({
  hours,
  now,
  best,
  markers = [],
  height = 230,
  maxHours,
  onSelect,
  title = "Day landscape",
}: {
  hours: Hour[];
  now?: number;
  best?: BestWindow | null;
  markers?: Marker[];
  height?: number;
  /** When omitted, the horizon grows with the container: wider screens see further ahead. */
  maxHours?: number;
  onSelect?: (h: Hour) => void;
  title?: string;
}) {
  const [ref, width] = useElementWidth<HTMLDivElement>();
  const { temp } = useUnits();
  const gid = useId().replace(/:/g, "");
  const [focus, setFocus] = useState<number | null>(null);

  const horizon = maxHours ?? (width < 480 ? 12 : width < 820 ? 24 : width < 1100 ? 36 : 48);
  const data = useMemo(() => hours.slice(0, horizon), [hours, horizon]);

  const W = Math.max(width, 160);
  const H = height;
  const padL = 8;
  const padR = 8;
  const skyY = 6;
  const skyH = 10;
  const ridgeTop = 58; // leaves a clear row for the "Now" label above the high-temperature label
  const ground = Math.round(H * 0.58);
  const barsBottom = H - 24;
  const barsMax = barsBottom - ground - 10;

  const geo = useMemo(() => {
    if (data.length < 2) return null;
    const t0 = data[0].ts;
    const t1 = data.at(-1)!.ts + HOUR;
    const x = scaleLinear().domain([t0, t1]).range([padL, W - padR]);
    const temps = data.map((h) => h.tempF);
    const lo = Math.min(...temps);
    const hi = Math.max(...temps);
    const y = scaleLinear().domain([lo - 2, hi + 2]).range([ground - 6, ridgeTop]);
    const mid = (h: Hour) => x(h.ts + HOUR / 2);
    const pts = data.map((h) => [mid(h), y(h.tempF)] as [number, number]);
    // Extend flat to the edges so the ridge fills the frame.
    const full: [number, number][] = [[padL, pts[0][1]], ...pts, [W - padR, pts.at(-1)![1]]];
    const ridge = area<[number, number]>().x((d) => d[0]).y0(ground).y1((d) => d[1]).curve(curveMonotoneX)(full) ?? "";
    const crest = line<[number, number]>().x((d) => d[0]).y((d) => d[1]).curve(curveMonotoneX)(full) ?? "";
    const iHi = temps.indexOf(hi);
    const iLo = temps.indexOf(lo);
    const colW = (x(t0 + HOUR) - x(t0)) as number;
    return { x, y, mid, ridge, crest, iHi, iLo, colW, t0, t1 };
  }, [data, W, ground]);

  if (!hours.length) {
    return <div className="grid h-40 place-items-center rounded-2xl bg-surface-2 text-sm text-ink-3">Hourly data not available for this day.</div>;
  }

  const summary = (() => {
    if (!data.length) return "";
    const hi = data.reduce((a, b) => (b.tempF > a.tempF ? b : a));
    const wet = data.filter((h) => h.pop >= 50);
    return `${title}: ${data.length} hours from ${fmtHour(data[0].ts)}. Warmest ${temp(hi.tempF)} at ${fmtHour(hi.ts)}. ${
      wet.length ? `Rain likely ${fmtHour(wet[0].ts)} to ${fmtHour(wet.at(-1)!.ts + HOUR)}.` : "Rain unlikely."
    }${best ? ` Best window ${best.summary}.` : ""}`;
  })();

  const labelEvery = geo ? Math.max(1, Math.ceil(44 / geo.colW)) : 3;
  const f = focus != null ? data[focus] : null;

  const pick = (clientX: number, rect: DOMRect) => {
    if (!geo) return;
    const i = Math.floor((clientX - rect.left - padL) / geo.colW);
    const c = Math.max(0, Math.min(data.length - 1, i));
    setFocus(c);
  };

  return (
    <figure ref={ref as React.Ref<HTMLElement>} className="relative w-full select-none">
      <figcaption className="sr-only">{summary}</figcaption>
      {width > 0 && geo && (
        <svg
          width={W}
          height={H}
          role="img"
          aria-label={summary}
          tabIndex={0}
          className="block touch-pan-y outline-none focus-visible:ring-2 focus-visible:ring-accent rounded-xl"
          onPointerMove={(e) => pick(e.clientX, e.currentTarget.getBoundingClientRect())}
          onPointerLeave={() => setFocus(null)}
          onClick={() => f && onSelect?.(f)}
          onKeyDown={(e) => {
            if (e.key === "ArrowRight") setFocus((v) => Math.min(data.length - 1, (v ?? -1) + 1));
            else if (e.key === "ArrowLeft") setFocus((v) => Math.max(0, (v ?? 1) - 1));
            else if (e.key === "Enter" && f) onSelect?.(f);
            else return;
            e.preventDefault();
          }}
          onBlur={() => setFocus(null)}
        >
          <defs>
            <linearGradient id={`ridge-${gid}`} x1="0" x2="0" y1="0" y2="1">
              <stop offset="0%" style={{ stopColor: "var(--heat)", stopOpacity: 0.32 }} />
              <stop offset="100%" style={{ stopColor: "var(--heat)", stopOpacity: 0.03 }} />
            </linearGradient>
            <pattern id={`best-${gid}`} width="6" height="6" patternUnits="userSpaceOnUse" patternTransform="rotate(45)">
              <line x1="0" y1="0" x2="0" y2="6" style={{ stroke: "var(--ok)", strokeOpacity: 0.18 }} strokeWidth="3" />
            </pattern>
          </defs>

          {/* night */}
          {data.map((h) =>
            h.isDay ? null : (
              <rect key={`n${h.ts}`} x={geo.x(h.ts)} y={0} width={geo.colW + 0.5} height={barsBottom} style={{ fill: "var(--night)" }} />
            ),
          )}

          {/* best window */}
          {best && best.end > geo.t0 && best.start < geo.t1 && (
            <g>
              <rect
                x={geo.x(Math.max(best.start, geo.t0))}
                y={skyY + skyH + 4}
                width={geo.x(Math.min(best.end, geo.t1)) - geo.x(Math.max(best.start, geo.t0))}
                height={barsBottom - skyY - skyH - 4}
                fill={`url(#best-${gid})`}
                rx={6}
              />
            </g>
          )}

          {/* sky cover */}
          {data.map((h) => (
            <rect
              key={`s${h.ts}`}
              x={geo.x(h.ts) + 0.5}
              y={skyY}
              width={Math.max(1, geo.colW - 1)}
              height={skyH}
              rx={2}
              style={{ fill: "var(--ink-3)", fillOpacity: 0.08 + ((h.sky ?? 0) / 100) * 0.55 }}
            />
          ))}

          {/* ridge */}
          <path d={geo.ridge} fill={`url(#ridge-${gid})`} />
          <path d={geo.crest} fill="none" style={{ stroke: "var(--heat)" }} strokeWidth={2} />
          <line x1={padL} x2={W - padR} y1={ground} y2={ground} style={{ stroke: "var(--line-strong)" }} />

          {/* high / low labels */}
          {[geo.iHi, geo.iLo].map((i, k) =>
            i === geo.iHi && k === 1 ? null : (
              <g key={`hl${k}`} transform={`translate(${geo.mid(data[i])},${geo.y(data[i].tempF)})`}>
                <circle r={3.5} style={{ fill: "var(--surface)", stroke: "var(--heat)" }} strokeWidth={2} />
                <text y={k === 0 ? -9 : 16} textAnchor="middle" className="tnum text-[11px] font-semibold" style={{ fill: "var(--ink)" }}>
                  {temp(data[i].tempF)}
                </text>
              </g>
            ),
          )}

          {/* rain chance */}
          {data.map((h) => {
            const bh = (h.pop / 100) * barsMax;
            const strong = (h.qpfMmPerHr ?? 0) >= 2 || h.pop >= 70;
            return (
              <g key={`p${h.ts}`}>
                {h.pop >= 5 && (
                  <rect
                    x={geo.x(h.ts) + geo.colW * 0.18}
                    y={barsBottom - bh}
                    width={geo.colW * 0.64}
                    height={bh}
                    rx={Math.min(3, geo.colW * 0.2)}
                    style={{ fill: "var(--rain)", fillOpacity: strong ? 0.9 : 0.45 }}
                  />
                )}
                {(h.thunder ?? 0) >= 30 && geo.colW >= 10 && (
                  <path
                    transform={`translate(${geo.mid(h) - 4},${barsBottom - bh - 13})`}
                    d="M5 0 L1 6 H4 L3 11 L8 4 H5 Z"
                    style={{ fill: "var(--storm)" }}
                  />
                )}
              </g>
            );
          })}

          {/* markers (transitions) */}
          {markers
            .filter((m) => m.ts >= geo.t0 && m.ts < geo.t1)
            .map((m) => (
              <g key={`m${m.ts}${m.label}`}>
                <line x1={geo.x(m.ts)} x2={geo.x(m.ts)} y1={ridgeTop - 10} y2={barsBottom} style={{ stroke: "var(--storm)" }} strokeDasharray="2 3" />
              </g>
            ))}

          {/* now */}
          {now && now >= geo.t0 && now < geo.t1 && (
            <g>
              <line x1={geo.x(now)} x2={geo.x(now)} y1={skyY + skyH + 2} y2={barsBottom} style={{ stroke: "var(--ink)" }} strokeWidth={1.25} />
              <text x={geo.x(now) + 4} y={skyY + skyH + 14} className="text-[11px] font-semibold" style={{ fill: "var(--ink)" }}>
                Now
              </text>
            </g>
          )}

          {/* axis */}
          {data.map((h, i) =>
            i % labelEvery === 0 ? (
              <text key={`a${h.ts}`} x={geo.mid(h)} y={H - 8} textAnchor="middle" className="tnum text-[11px]" style={{ fill: hourOfDay(h.ts) === 0 ? "var(--ink)" : "var(--ink-3)", fontWeight: hourOfDay(h.ts) === 0 ? 600 : 400 }}>
                {hourOfDay(h.ts) === 0 ? new Date(h.ts).toLocaleDateString("en-US", { weekday: "short", timeZone: "America/New_York" }) : fmtHour(h.ts)}
              </text>
            ) : null,
          )}

          {/* focus */}
          {f && (
            <g pointerEvents="none">
              <rect x={geo.x(f.ts)} y={skyY} width={geo.colW} height={barsBottom - skyY} rx={4} style={{ fill: "var(--ink)", fillOpacity: 0.05 }} />
              <circle cx={geo.mid(f)} cy={geo.y(f.tempF)} r={4.5} style={{ fill: "var(--heat)" }} />
            </g>
          )}
        </svg>
      )}
      <ul aria-hidden className="mt-2 flex flex-wrap gap-x-4 gap-y-1 text-[11px] text-ink-3">
        <li className="flex items-center gap-1.5"><span className="h-0.5 w-4 rounded bg-heat" />Temperature</li>
        <li className="flex items-center gap-1.5"><span className="h-2.5 w-2 rounded-sm bg-rain" />Rain chance</li>
        <li className="flex items-center gap-1.5"><span className="h-2 w-4 rounded-sm bg-ink-3/40" />Sky cover</li>
        <li className="flex items-center gap-1.5"><span className="h-2.5 w-4 rounded-sm bg-[var(--night)] ring-1 ring-line" />Night</li>
        {data.some((h) => (h.thunder ?? 0) >= 30) && <li className="flex items-center gap-1.5"><span className="text-storm">⚡</span>Thunder ≥30%</li>}
        {best && <li className="flex items-center gap-1.5"><span className="h-2.5 w-4 rounded-sm border border-ok/50 bg-ok-soft" />Best window</li>}
      </ul>
      <div aria-live="polite" className={`pointer-events-none absolute right-2 top-7 rounded-lg border border-line bg-surface/95 px-2.5 py-1.5 text-xs shadow-card transition-opacity ${f ? "opacity-100" : "opacity-0"}`}>
        {f && (
          <span className="tnum">
            <b>{fmtHour(f.ts)}</b> · {temp(f.tempF)}
            {f.feelsF != null && f.feelsF !== f.tempF ? ` (feels ${temp(f.feelsF)})` : ""} · {f.pop}% rain
            {(f.thunder ?? 0) >= 30 ? ` · ${f.thunder}% thunder` : ""} · {f.short}
          </span>
        )}
      </div>
    </figure>
  );
}
