"use client";

import { Monitor, Moon, Sun } from "lucide-react";
import { type ThemePref, setThemePref, useThemePref } from "@/lib/theme";

const OPTIONS: { id: ThemePref; label: string; icon: typeof Sun }[] = [
  { id: "system", label: "System", icon: Monitor },
  { id: "light", label: "Light", icon: Sun },
  { id: "dark", label: "Dark", icon: Moon },
];

/** Header button: cycles System → Light → Dark. */
export function ThemeToggle({ className = "" }: { className?: string }) {
  const pref = useThemePref();
  const i = OPTIONS.findIndex((o) => o.id === pref);
  const cur = OPTIONS[i];
  const next = OPTIONS[(i + 1) % OPTIONS.length];
  return (
    <button
      onClick={() => setThemePref(next.id)}
      aria-label={`Theme: ${cur.label}. Switch to ${next.label}`}
      title={`Theme: ${cur.label}`}
      className={className}
    >
      <cur.icon size={18} />
    </button>
  );
}

/** Segmented control for Settings. */
export function ThemeSegmented() {
  const pref = useThemePref();
  return (
    <fieldset>
      <legend className="eyebrow mb-2">Appearance</legend>
      <div className="grid grid-cols-3 gap-1 rounded-xl bg-surface-2 p-1">
        {OPTIONS.map((o) => (
          <button
            key={o.id}
            aria-pressed={pref === o.id}
            onClick={() => setThemePref(o.id)}
            className={`flex items-center justify-center gap-1.5 rounded-lg py-2 text-sm font-medium ${pref === o.id ? "bg-surface shadow-sm" : "text-ink-2"}`}
          >
            <o.icon size={14} aria-hidden /> {o.label}
          </button>
        ))}
      </div>
    </fieldset>
  );
}
