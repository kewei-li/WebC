"use client";

import { Sun } from "lucide-react";
import type { BestWindow } from "@/lib/editorial-rules";
import { hourComfort } from "@/lib/editorial-rules";
import { fmtHour } from "@/lib/weather-primitives";

export function BestWindowCard({ best, context = "today", onEvidence }: { best: BestWindow | null; context?: string; onEvidence?: () => void }) {
  if (!best)
    return (
      <section aria-label="Best window" className="card p-5">
        <p className="eyebrow flex items-center gap-1.5"><Sun size={14} /> Best window</p>
        <p className="mt-2 text-sm text-ink-2">No comfortable 2-hour daylight stretch left {context}. Rain, storms or heat dominate the remaining hours.</p>
      </section>
    );
  return (
    <section aria-label="Best window" className="card p-5">
      <p className="eyebrow flex items-center gap-1.5 text-ok"><Sun size={14} /> Best outdoor window {context}</p>
      <p className="tnum mt-2 font-serif text-3xl">{best.summary}</p>
      <div className="mt-3 flex h-8 items-end gap-[3px]" aria-hidden>
        {best.hours.map((h) => (
          <div key={h.ts} className="flex flex-1 flex-col items-center gap-1">
            <div className="w-full rounded-sm bg-ok" style={{ height: 6 + hourComfort(h) * 0.2, opacity: 0.35 + hourComfort(h) / 160 }} />
          </div>
        ))}
      </div>
      <div className="tnum mt-1 flex justify-between text-[11px] text-ink-3" aria-hidden>
        <span>{fmtHour(best.start)}</span>
        <span>{fmtHour(best.end)}</span>
      </div>
      <ul className="mt-3 space-y-1 text-sm text-ink-2">
        {best.why.map((w) => (
          <li key={w}>· {w}</li>
        ))}
      </ul>
      {onEvidence && (
        <button onClick={onEvidence} className="mt-3 text-xs font-medium text-accent underline-offset-2 hover:underline">
          Why this window?
        </button>
      )}
    </section>
  );
}
