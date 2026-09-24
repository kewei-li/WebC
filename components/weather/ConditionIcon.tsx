import { Cloud, CloudFog, CloudLightning, CloudRain, CloudSun, Moon, Sun, Wind } from "lucide-react";
import type { ConditionKey } from "@/lib/weather-primitives";

const MAP = {
  clear: { day: Sun, night: Moon, color: "text-heat" },
  partly: { day: CloudSun, night: Cloud, color: "text-ink-2" },
  cloudy: { day: Cloud, night: Cloud, color: "text-ink-3" },
  rain: { day: CloudRain, night: CloudRain, color: "text-rain" },
  storm: { day: CloudLightning, night: CloudLightning, color: "text-storm" },
  fog: { day: CloudFog, night: CloudFog, color: "text-ink-3" },
  wind: { day: Wind, night: Wind, color: "text-ink-2" },
} as const;

export function ConditionIcon({
  condition,
  isDay = true,
  size = 20,
  className = "",
  label,
}: {
  condition: ConditionKey;
  isDay?: boolean;
  size?: number;
  className?: string;
  label?: string;
}) {
  const m = MAP[condition];
  const I = isDay ? m.day : m.night;
  return <I size={size} strokeWidth={1.75} className={`${m.color} ${className}`} aria-label={label} aria-hidden={!label} role={label ? "img" : undefined} />;
}
