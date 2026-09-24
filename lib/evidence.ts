import type { Evidence } from "@/components/weather/EvidenceDrawer";
import type { BestWindow, PrecipEvent } from "./editorial-rules";
import { type WeatherBundle, fmtHour } from "./weather-primitives";

const src = (b: WeatherBundle, ids: string[]) =>
  b.sources.filter((s) => ids.includes(s.id)).map((s) => ({ label: s.label, url: s.url, updatedAt: s.updatedAt }));

export function precipEvidence(e: PrecipEvent, b: WeatherBundle): Evidence {
  return {
    title: "Rain arrival — evidence",
    confidence: e.confidence,
    facts: [
      { label: "Possible range", value: `${fmtHour(e.possibleStart)}–${fmtHour(e.possibleEnd)}` },
      { label: "Most likely", value: `${fmtHour(e.likelyStart)}–${fmtHour(e.likelyEnd)}` },
      { label: "Peak chance", value: `${e.peakPop}% at ${fmtHour(e.peakTs)}` },
      { label: "Intensity", value: e.intensity + (e.thunder ? " + thunder" : "") },
      ...e.hours
        .filter((h) => h.ts >= e.possibleStart && h.ts < e.possibleEnd)
        .slice(0, 10)
        .map((h) => ({ label: fmtHour(h.ts), value: `${h.pop}% · ${h.qpfMmPerHr?.toFixed(1) ?? "–"} mm/h${h.thunder ? ` · ⚡${h.thunder}%` : ""}` })),
    ],
    sources: src(b, ["hourly", "grid"]),
    note: "Possible = hours with ≥30% chance; most likely = hours within 20 points of the peak and ≥50%. Intensity uses NWS quantitative precipitation and thunder probability.",
  };
}

export function bestWindowEvidence(w: BestWindow, b: WeatherBundle): Evidence {
  return {
    title: "Best window — why",
    facts: w.hours.map((h) => ({
      label: fmtHour(h.ts),
      value: `${h.pop}% rain · feels ${h.feelsF ?? h.tempF}° · ${h.windMph} mph`,
    })),
    sources: src(b, ["hourly", "grid"]),
    note: "Each daylight hour is scored for comfort (rain & thunder chance, feels-like above 92°, gusts above 20 mph). The longest block of 2+ hours scoring ≥55 wins.",
  };
}
