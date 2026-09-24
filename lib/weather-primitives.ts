// Shared, normalized weather model. Every data source (live NWS today,
// local scenario files later) is mapped into these shapes before the UI sees it.

export type ConditionKey =
  | "clear"
  | "partly"
  | "cloudy"
  | "rain"
  | "storm"
  | "fog"
  | "wind";

export type Hour = {
  ts: number;
  tempF: number;
  feelsF: number | null;
  pop: number;
  thunder: number | null;
  qpfMmPerHr: number | null;
  windMph: number;
  gustMph: number | null;
  windDir: string;
  windDeg: number | null;
  humidity: number | null;
  dewpointF: number | null;
  sky: number | null;
  short: string;
  isDay: boolean;
  condition: ConditionKey;
};

export type Period = {
  name: string;
  start: number;
  end: number;
  isDay: boolean;
  tempF: number;
  pop: number;
  wind: string;
  short: string;
  detailed: string;
  condition: ConditionKey;
};

export type Day = {
  key: string; // YYYY-MM-DD in location time zone
  label: string; // Today / Thu
  dateLabel: string; // Sep 24
  day: Period | null;
  night: Period | null;
  highF: number | null;
  lowF: number | null;
  popMax: number;
  condition: ConditionKey;
};

export type Current = {
  stationId: string;
  stationName: string;
  observedAt: number;
  text: string;
  tempF: number | null;
  feelsF: number | null;
  dewpointF: number | null;
  humidity: number | null;
  windMph: number | null;
  windDir: string;
  gustMph: number | null;
  visibilityMi: number | null;
  pressureInHg: number | null;
  condition: ConditionKey;
};

export type WeatherAlert = {
  id: string;
  event: string;
  severity: string;
  urgency: string;
  certainty: string;
  headline: string;
  description: string;
  instruction: string;
  areaDesc: string;
  sender: string;
  effective: number | null;
  onset: number | null;
  expires: number | null;
  ends: number | null;
  geometry: GeoJSON.Geometry | null;
  /** Scenario-only: storm-motion estimate for the personal interpretation. */
  approach?: { minMinutes: number; maxMinutes: number; hazard: string };
};

export type SourceStatus = {
  id: string;
  label: string;
  url: string;
  ok: boolean;
  updatedAt: number | null;
  error?: string;
};

export type WeatherBundle = {
  location: {
    name: string;
    lat: number;
    lon: number;
    office: string;
    grid: string;
    timeZone: string;
    radarStation: string;
  };
  fetchedAt: number;
  current: Current | null;
  hours: Hour[];
  periods: Period[];
  days: Day[];
  alerts: WeatherAlert[]; // affecting this point
  regionalAlerts: WeatherAlert[]; // state-wide, used by Maps / Alerts
  sources: SourceStatus[];
  /** Present only when the bundle comes from a local scenario file, never for live NWS. */
  scenario?: { id: ScenarioId; label: string; description: string };
  calendar?: CalendarEvent[];
  route?: RoutePlan;
  models?: ModelRun[];
};

export type ScenarioId = "calm" | "rain" | "severe" | "calendar" | "route" | "uncertain";

export type CalendarEvent = { title: string; location: string; start: number; end: number };

export type RouteSegment = { name: string; lat: number; lon: number; etaMin: number; heavyFrom: number | null; heavyTo: number | null };
export type RoutePlan = { from: string; to: string; depart: number; durationMin: number; segments: RouteSegment[] };

/** One model's forecast of rain chance by hour — used to show disagreement. */
export type ModelRun = { name: string; pop: number[]; rainStart: number | null; totalIn: number };

// ---------- units ----------

export const cToF = (c: number) => (c * 9) / 5 + 32;
export const fToC = (f: number) => ((f - 32) * 5) / 9;
export const kmhToMph = (k: number) => k * 0.621371;

const CARDINALS = ["N", "NNE", "NE", "ENE", "E", "ESE", "SE", "SSE", "S", "SSW", "SW", "WSW", "W", "WNW", "NW", "NNW"];
export const degToCardinal = (deg: number | null | undefined) =>
  deg == null ? "—" : CARDINALS[Math.round(((deg % 360) + 360) % 360 / 22.5) % 16];
export const cardinalToDeg = (dir: string) => {
  const i = CARDINALS.indexOf(dir);
  return i < 0 ? null : i * 22.5;
};

export function conditionFromText(text: string, isDay = true): ConditionKey {
  const t = text.toLowerCase();
  if (/thunder|t-storm|tstorm/.test(t)) return "storm";
  if (/rain|shower|drizzle/.test(t)) return "rain";
  if (/fog|haze|smoke|mist/.test(t)) return "fog";
  if (/wind|breezy|blustery/.test(t)) return "wind";
  if (/mostly cloudy|overcast|^cloudy/.test(t)) return "cloudy";
  if (/partly|mostly sunny|mostly clear|few clouds|scattered clouds/.test(t)) return "partly";
  if (/sunny|clear|fair/.test(t)) return "clear";
  return isDay ? "partly" : "partly";
}

// ---------- time (always rendered in the location's zone) ----------

export const LOCATION_TZ = "America/New_York";

const fmtCache = new Map<string, Intl.DateTimeFormat>();
function fmt(opts: Intl.DateTimeFormatOptions) {
  const key = JSON.stringify(opts);
  let f = fmtCache.get(key);
  if (!f) {
    f = new Intl.DateTimeFormat("en-US", { timeZone: LOCATION_TZ, ...opts });
    fmtCache.set(key, f);
  }
  return f;
}

export const fmtHour = (ts: number) => fmt({ hour: "numeric" }).format(ts).replace(" ", " ");
export const fmtClock = (ts: number) => fmt({ hour: "numeric", minute: "2-digit" }).format(ts).replace(" ", " ");
export const fmtWeekday = (ts: number) => fmt({ weekday: "short" }).format(ts);
export const fmtLongDay = (ts: number) => fmt({ weekday: "long", month: "short", day: "numeric" }).format(ts);
export const fmtMonthDay = (ts: number) => fmt({ month: "short", day: "numeric" }).format(ts);
export const hourOfDay = (ts: number) => Number(fmt({ hour: "numeric", hourCycle: "h23" }).format(ts));
export function dayKey(ts: number) {
  const parts = fmt({ year: "numeric", month: "2-digit", day: "2-digit" }).formatToParts(ts);
  const get = (t: string) => parts.find((p) => p.type === t)?.value;
  return `${get("year")}-${get("month")}-${get("day")}`;
}

export function relativeMinutes(ts: number, now = Date.now()) {
  const m = Math.round((now - ts) / 60000);
  if (m < 1) return "just now";
  if (m < 60) return `${m} min ago`;
  const h = Math.round(m / 60);
  return `${h} hr ago`;
}

export const HOUR = 3600_000;
