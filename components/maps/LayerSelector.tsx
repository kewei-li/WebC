"use client";

import { LAYERS, type LayerId } from "@/lib/maps/layers";

export function LayerSelector({ active, onToggle, available }: { active: Set<LayerId>; onToggle: (id: LayerId) => void; available: LayerId[] }) {
  return (
    <fieldset>
      <legend className="eyebrow mb-2">Layers</legend>
      <div className="space-y-2">
        {LAYERS.filter((l) => available.includes(l.id)).map((l) => (
          <label key={l.id} className={`flex cursor-pointer items-start gap-3 rounded-xl border p-3 ${active.has(l.id) ? "border-accent bg-accent-soft" : "border-line hover:border-line-strong"}`}>
            <input type="checkbox" checked={active.has(l.id)} onChange={() => onToggle(l.id)} className="mt-1 size-4 accent-[var(--accent)]" />
            <span>
              <span className="block text-sm font-medium">{l.label}</span>
              <span className="block text-xs text-ink-2">{l.description}</span>
            </span>
          </label>
        ))}
        <p className="rounded-xl border border-dashed border-line-strong p-3 text-xs text-ink-3">Lightning, satellite, storm tracks and uncertainty polygons (deck.gl) arrive with the next data milestone.</p>
      </div>
    </fieldset>
  );
}
