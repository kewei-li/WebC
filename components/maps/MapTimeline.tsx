"use client";

import { Pause, Play, SkipBack, SkipForward } from "lucide-react";
import { fmtClock } from "@/lib/weather-primitives";

export function MapTimeline({
  frames,
  index,
  playing,
  onIndex,
  onPlaying,
}: {
  frames: string[];
  index: number;
  playing: boolean;
  onIndex: (i: number) => void;
  onPlaying: (p: boolean) => void;
}) {
  if (!frames.length) return <div className="rounded-2xl bg-surface/95 px-4 py-3 text-sm text-ink-2 shadow-card">Radar timeline unavailable — showing latest mosaic.</div>;
  const last = frames.length - 1;
  const cur = frames[index];
  const btn = "grid size-10 place-items-center rounded-full hover:bg-surface-2";
  return (
    <div className="flex items-center gap-2 rounded-2xl border border-line bg-surface/95 px-2 py-2 shadow-card backdrop-blur sm:gap-3 sm:px-3">
      <button className={btn} aria-label="Previous frame" onClick={() => onIndex(Math.max(0, index - 1))}>
        <SkipBack size={16} />
      </button>
      <button className={`${btn} bg-ink text-paper hover:bg-ink`} aria-label={playing ? "Pause radar loop" : "Play radar loop"} onClick={() => onPlaying(!playing)}>
        {playing ? <Pause size={16} /> : <Play size={16} />}
      </button>
      <button className={btn} aria-label="Next frame" onClick={() => onIndex(Math.min(last, index + 1))}>
        <SkipForward size={16} />
      </button>
      <label className="flex flex-1 flex-col gap-1">
        <span className="sr-only">Radar time</span>
        <input
          type="range"
          min={0}
          max={last}
          value={index}
          onChange={(e) => {
            onPlaying(false);
            onIndex(Number(e.target.value));
          }}
          className="w-full accent-[var(--accent)]"
          aria-valuetext={cur ? fmtClock(Date.parse(cur)) : ""}
        />
        <span className="tnum flex justify-between text-[11px] text-ink-3">
          <span>{fmtClock(Date.parse(frames[0]))}</span>
          <span>{fmtClock(Date.parse(frames[last]))}</span>
        </span>
      </label>
      <span className="tnum min-w-[5.5rem] text-right text-sm font-semibold">
        {cur ? fmtClock(Date.parse(cur)) : "—"}
        <span className="block text-[11px] font-normal text-ink-3">{index === last ? "Latest" : `${Math.round((Date.parse(frames[last]) - Date.parse(cur)) / 60000)} min ago`}</span>
      </span>
    </div>
  );
}
