import { AlertTriangle, ChevronRight } from "lucide-react";
import Link from "next/link";
import type { WeatherAlert } from "@/lib/weather-primitives";
import { fmtClock, fmtWeekday, dayKey } from "@/lib/weather-primitives";

export function untilLabel(ts: number | null, now = Date.now()) {
  if (!ts) return "until further notice";
  return dayKey(ts) === dayKey(now) ? `until ${fmtClock(ts)}` : `until ${fmtWeekday(ts)} ${fmtClock(ts)}`;
}

/** Official alert language stays verbatim and on top. */
export function RiskBanner({ alert, now }: { alert: WeatherAlert; now: number }) {
  const warning = /warning/i.test(alert.event);
  return (
    <Link
      href={`/alerts#${encodeURIComponent(alert.id)}`}
      className={`flex items-center gap-3 rounded-2xl border px-4 py-3 ${warning ? "border-warn/40 bg-warn-soft" : "border-heat/40 bg-heat-soft"}`}
    >
      <AlertTriangle size={20} className={warning ? "text-warn" : "text-heat"} aria-hidden />
      <div className="min-w-0 flex-1">
        <p className="font-semibold">
          {alert.event} <span className="font-normal text-ink-2">· Official {untilLabel(alert.ends ?? alert.expires, now)}</span>
        </p>
        {alert.approach ? (
          <p className="text-sm">
            <span className="font-medium">For your location:</span> the strongest part of the storm may arrive in about {alert.approach.minMinutes}–{alert.approach.maxMinutes} minutes.
          </p>
        ) : (
          <p className="truncate text-sm text-ink-2">{alert.sender} · {alert.areaDesc}</p>
        )}
      </div>
      <ChevronRight size={18} className="text-ink-3" aria-hidden />
    </Link>
  );
}
