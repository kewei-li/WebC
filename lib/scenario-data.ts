// Local scenario files → the same normalized WeatherBundle the live NWS path produces.
// Scenario times are offsets from "now" (hour 0 = the current hour), so every scenario
// looks the same whenever it is reviewed.

import calmDay from "@/data/scenarios/calm-day.json";
import calendarActivity from "@/data/scenarios/calendar-activity.json";
import forecastUncertainty from "@/data/scenarios/forecast-uncertainty.json";
import rainArrival from "@/data/scenarios/rain-arrival.json";
import routeWeather from "@/data/scenarios/route-weather.json";
import severeWeather from "@/data/scenarios/severe-weather.json";
import {
  type Current,
  type Day,
  type Hour,
  type Period,
  type ScenarioId,
  type WeatherAlert,
  type WeatherBundle,
  HOUR,
  cardinalToDeg,
  conditionFromText,
  dayKey,
  fmtClock,
  fmtHour,
  fmtMonthDay,
  fmtWeekday,
  hourOfDay,
} from "./weather-primitives";

/** Keyframes: { "<hour offset>": value } — linearly interpolated per hour. */
type Keyframes = Record<string, number>;
/** Text spans: [fromHour, toHour (exclusive), text]. */
type Spans = [number, number, string][];

export type ScenarioSpec = {
  id: ScenarioId;
  label: string;
  description: string;
  current: {
    tempF: number;
    feelsF: number;
    text: string;
    humidity: number;
    dewpointF: number;
    windMph: number;
    windDir: string;
    gustMph: number | null;
    visibilityMi: number;
    pressureInHg: number;
    observedMinutesAgo: number;
  };
  /** Keyed by local clock hour (0–23), repeats daily — keeps afternoon the warmest part of the day. */
  diurnal: { temp: Keyframes; feels: Keyframes; humidity: Keyframes; dewpoint: Keyframes };
  /** Keyed by hour offset from now — the weather events. */
  hourly: {
    tempDelta: Keyframes; // rain-cooled air etc.
    pop: Keyframes;
    thunder: Keyframes;
    qpf: Keyframes; // mm per hour
    wind: Keyframes;
    gust: Keyframes;
    sky: Keyframes;
    windDir: Spans;
    /** "{fair}" → Sunny/Clear and "{mfair}" → Mostly Sunny/Mostly Clear by time of day. */
    short: Spans;
  };
  /** Seven days starting today. Text is written like an NWS narrative. */
  days: {
    high: number;
    low: number;
    pop: number;
    wind: string;
    dayShort: string;
    dayText: string;
    nightShort: string;
    nightText: string;
  }[];
  alerts?: {
    event: string;
    severity: string;
    urgency: string;
    certainty: string;
    headline: string;
    description: string;
    instruction: string;
    areaDesc: string;
    onsetMin: number;
    endsMin: number;
    polygon: [number, number][];
    approach?: { minMinutes: number; maxMinutes: number; hazard: string };
  }[];
  calendar?: { title: string; location: string; startOffsetH: number; durationH: number }[];
  route?: {
    from: string;
    to: string;
    departInMin: number;
    durationMin: number;
    segments: { name: string; lat: number; lon: number; etaMin: number; heavyFromMin: number | null; heavyToMin: number | null }[];
  };
  models?: { name: string; pop: Keyframes; rainStartH: number | null; totalIn: number }[];
};

const SPECS: Record<ScenarioId, ScenarioSpec> = {
  calm: calmDay as unknown as ScenarioSpec,
  rain: rainArrival as unknown as ScenarioSpec,
  severe: severeWeather as unknown as ScenarioSpec,
  calendar: calendarActivity as unknown as ScenarioSpec,
  route: routeWeather as unknown as ScenarioSpec,
  uncertain: forecastUncertainty as unknown as ScenarioSpec,
};

export const SCENARIO_IDS = Object.keys(SPECS) as ScenarioId[];
export const isScenarioId = (v: string | null | undefined): v is ScenarioId => !!v && v in SPECS;
export const scenarioMeta = (id: ScenarioId) => ({ id, label: SPECS[id].label, description: SPECS[id].description, file: FILES[id] });

const FILES: Record<ScenarioId, string> = {
  calm: "calm-day.json",
  rain: "rain-arrival.json",
  severe: "severe-weather.json",
  calendar: "calendar-activity.json",
  route: "route-weather.json",
  uncertain: "forecast-uncertainty.json",
};

const HOURS = 72;

function interp(kf: Keyframes, n = HOURS): number[] {
  const pts = Object.entries(kf)
    .map(([k, v]) => [Number(k), v] as const)
    .sort((a, b) => a[0] - b[0]);
  return Array.from({ length: n }, (_, i) => {
    if (i <= pts[0][0]) return pts[0][1];
    for (let j = 1; j < pts.length; j++) {
      const [x1, y1] = pts[j];
      const [x0, y0] = pts[j - 1];
      if (i <= x1) return y0 + ((y1 - y0) * (i - x0)) / (x1 - x0);
    }
    return pts.at(-1)![1];
  });
}

function cyclic(kf: Keyframes, hour: number) {
  const pts = Object.entries(kf).map(([k, v]) => [Number(k), v] as const).sort((a, b) => a[0] - b[0]);
  const ext = [[pts.at(-1)![0] - 24, pts.at(-1)![1]] as const, ...pts, [pts[0][0] + 24, pts[0][1]] as const];
  for (let j = 1; j < ext.length; j++) {
    const [x0, y0] = ext[j - 1];
    const [x1, y1] = ext[j];
    if (hour <= x1) return y0 + ((y1 - y0) * (hour - x0)) / (x1 - x0);
  }
  return pts[0][1];
}

function spanAt(spans: Spans, i: number, fallback: string) {
  return spans.find(([a, b]) => i >= a && i < b)?.[2] ?? spans.at(-1)?.[2] ?? fallback;
}

const isDaylight = (ts: number) => {
  const h = hourOfDay(ts);
  return h >= 7 && h < 19; // Miami, late September: sunrise ~7:10, sunset ~7:20
};

/** Timestamp of a given local clock hour on the day `dayOffset` days from `base`. */
function atLocalHour(base: number, dayOffset: number, hour: number) {
  const t = base + dayOffset * 24 * HOUR;
  return t + (hour - hourOfDay(t)) * HOUR;
}

/** "{t+3}" → clock hour 3 h from the current hour ("5 PM"); "{m+40}" → clock time 40 min from now. */
function timeText(s: string, t0: number, now: number) {
  return s
    .replace(/\{t([+-]\d+)\}/g, (_, n) => fmtHour(t0 + Number(n) * HOUR))
    .replace(/\{m([+-]\d+)\}/g, (_, n) => fmtClock(now + Number(n) * 60_000));
}

export function buildScenario(id: ScenarioId, now = Date.now()): WeatherBundle {
  const spec = SPECS[id];
  const t0 = Math.floor(now / HOUR) * HOUR;
  const tt = (s: string) => timeText(s, t0, now);
  const h = spec.hourly;
  const dn = spec.diurnal;
  const [delta, pop, thunder, qpf, wind, gust, sky] = [h.tempDelta, h.pop, h.thunder, h.qpf, h.wind, h.gust, h.sky].map((k) => interp(k));

  const hours: Hour[] = delta.map((_, i) => {
    const ts = t0 + i * HOUR;
    const lh = hourOfDay(ts);
    const day = isDaylight(ts);
    const short = spanAt(h.short, i, "{mfair}")
      .replace("{mfair}", day ? "Mostly Sunny" : "Mostly Clear")
      .replace("{fair}", day ? "Sunny" : "Clear");
    const dir = spanAt(h.windDir, i, "E");
    const temp = cyclic(dn.temp, lh) + delta[i];
    const feels = cyclic(dn.feels, lh) + delta[i] * 1.4;
    return {
      ts,
      tempF: Math.round(temp),
      feelsF: Math.round(Math.max(temp, feels)),
      pop: Math.round(pop[i]),
      thunder: Math.round(thunder[i]),
      qpfMmPerHr: Math.round(qpf[i] * 10) / 10,
      windMph: Math.round(wind[i]),
      gustMph: Math.round(gust[i]) || null,
      windDir: dir,
      windDeg: cardinalToDeg(dir),
      humidity: Math.round(Math.min(100, cyclic(dn.humidity, lh) - delta[i] * 2.5)),
      dewpointF: Math.round(cyclic(dn.dewpoint, lh)),
      sky: Math.round(sky[i]),
      short,
      isDay: day,
      condition: conditionFromText(short, day),
    };
  });

  // 12-hour periods like the NWS 7-day forecast.
  const periods: Period[] = [];
  const nowHour = hourOfDay(now);
  spec.days.forEach((d, i) => {
    const dayStart = atLocalHour(t0, i, 6);
    const nightStart = atLocalHour(t0, i, 18);
    const wd = new Intl.DateTimeFormat("en-US", { weekday: "long", timeZone: "America/New_York" }).format(dayStart + HOUR);
    if (!(i === 0 && nowHour >= 18)) {
      periods.push({
        name: i === 0 ? (nowHour >= 12 ? "This Afternoon" : "Today") : wd,
        start: i === 0 ? Math.max(dayStart, t0) : dayStart,
        end: nightStart,
        isDay: true,
        tempF: d.high,
        pop: d.pop,
        wind: d.wind,
        short: d.dayShort,
        detailed: tt(d.dayText),
        condition: conditionFromText(d.dayShort),
      });
    }
    periods.push({
      name: i === 0 ? "Tonight" : `${wd} Night`,
      start: i === 0 ? Math.max(nightStart, t0) : nightStart,
      end: nightStart + 12 * HOUR,
      isDay: false,
      tempF: d.low,
      pop: d.pop,
      wind: d.wind,
      short: d.nightShort,
      detailed: tt(d.nightText),
      condition: conditionFromText(d.nightShort, false),
    });
  });

  const days: Day[] = spec.days.map((d, i) => {
    const anchor = atLocalHour(t0, i, 12);
    const key = dayKey(anchor);
    const dayP = periods.find((p) => p.isDay && dayKey(p.start) === key) ?? null;
    const nightP = periods.find((p) => !p.isDay && dayKey(p.start) === key) ?? null;
    const hs = hours.filter((x) => dayKey(x.ts) === key);
    return {
      key,
      label: i === 0 ? "Today" : fmtWeekday(anchor),
      dateLabel: fmtMonthDay(anchor),
      day: dayP,
      night: nightP,
      // Where hourly data covers the day, highs/lows come from it so every view agrees.
      highF: hs.filter((x) => x.isDay).length >= 6 ? Math.max(...hs.filter((x) => x.isDay).map((x) => x.tempF)) : Math.max(d.high, ...hs.map((x) => x.tempF)),
      lowF: d.low,
      popMax: Math.max(d.pop, ...hs.map((x) => x.pop)),
      condition: conditionFromText(dayP?.short ?? d.nightShort),
    };
  });

  const c = spec.current;
  const h0 = hours[0];
  const nowText = c.text
    .replace("{mfair}", isDaylight(now) ? "Mostly Sunny" : "Mostly Clear")
    .replace("{fair}", isDaylight(now) ? "Sunny" : "Clear")
    .replace("Partly Sunny", isDaylight(now) ? "Partly Sunny" : "Partly Cloudy");
  // Observation matches hour 0 of the timeline so "now" agrees everywhere.
  const current: Current = {
    stationId: "KMIA",
    stationName: "Miami International Airport (scenario)",
    observedAt: now - c.observedMinutesAgo * 60_000,
    text: nowText,
    tempF: h0.tempF,
    feelsF: h0.feelsF,
    dewpointF: h0.dewpointF,
    humidity: h0.humidity,
    windMph: c.windMph,
    windDir: c.windDir,
    gustMph: c.gustMph,
    visibilityMi: c.visibilityMi,
    pressureInHg: c.pressureInHg,
    condition: conditionFromText(nowText, isDaylight(now)),
  };

  const alerts: WeatherAlert[] = (spec.alerts ?? []).map((a, i) => ({
    id: `scenario-${id}-${i}`,
    event: a.event,
    severity: a.severity,
    urgency: a.urgency,
    certainty: a.certainty,
    headline: tt(a.headline),
    description: tt(a.description),
    instruction: tt(a.instruction),
    areaDesc: a.areaDesc,
    sender: "NWS Miami FL (scenario)",
    effective: now + a.onsetMin * 60_000,
    onset: now + a.onsetMin * 60_000,
    expires: now + a.endsMin * 60_000,
    ends: now + a.endsMin * 60_000,
    geometry: { type: "Polygon", coordinates: [a.polygon] },
    approach: a.approach,
  }));

  const file = `data/scenarios/${FILES[id]}`;
  const src = (sid: string, label: string) => ({ id: sid, label: `${label} — scenario ${FILES[id]}`, url: file, ok: true, updatedAt: now });

  return {
    location: {
      name: "Miami, FL",
      lat: 25.7617,
      lon: -80.1918,
      office: "MFL",
      grid: "MFL 110,50",
      timeZone: "America/New_York",
      radarStation: "KAMX",
    },
    fetchedAt: now,
    current,
    hours,
    periods,
    days,
    alerts,
    regionalAlerts: alerts,
    sources: [
      src("hourly", "Hourly forecast"),
      src("forecast", "7-day forecast"),
      src("grid", "Gridded values"),
      src("obs", "Observation"),
      src("alerts", "Alerts"),
    ],
    scenario: { id, label: spec.label, description: spec.description },
    calendar: spec.calendar?.map((e) => {
      const start = t0 + e.startOffsetH * HOUR;
      return { title: e.title, location: e.location, start, end: start + e.durationH * HOUR };
    }),
    route: spec.route && {
      from: spec.route.from,
      to: spec.route.to,
      depart: Math.ceil((now + spec.route.departInMin * 60_000) / (15 * 60_000)) * 15 * 60_000,
      durationMin: spec.route.durationMin,
      segments: spec.route.segments.map((s) => ({
        name: s.name,
        lat: s.lat,
        lon: s.lon,
        etaMin: s.etaMin,
        heavyFrom: s.heavyFromMin == null ? null : now + s.heavyFromMin * 60_000,
        heavyTo: s.heavyToMin == null ? null : now + s.heavyToMin * 60_000,
      })),
    },
    models: spec.models?.map((m) => ({
      name: m.name,
      pop: interp(m.pop, 24).map(Math.round),
      rainStart: m.rainStartH == null ? null : t0 + m.rainStartH * HOUR,
      totalIn: m.totalIn,
    })),
  };
}
