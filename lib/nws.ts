import "server-only";
import {
  type Current,
  type Day,
  type Hour,
  type Period,
  type SourceStatus,
  type WeatherAlert,
  type WeatherBundle,
  HOUR,
  cToF,
  cardinalToDeg,
  conditionFromText,
  dayKey,
  degToCardinal,
  fmtMonthDay,
  fmtWeekday,
  kmhToMph,
} from "./weather-primitives";

// Miami, FL — resolved once from https://api.weather.gov/points/25.7617,-80.1918
export const MIAMI = {
  name: "Miami, FL",
  lat: 25.7617,
  lon: -80.1918,
  office: "MFL",
  gridX: 110,
  gridY: 50,
  timeZone: "America/New_York",
  radarStation: "KAMX",
  stations: ["KMIA", "KOPF", "KTMB"],
  state: "FL",
};

const API = "https://api.weather.gov";
const UA = "(2050-conservative-forecast-prototype, local-dev)";

async function nws<T>(path: string): Promise<T> {
  const res = await fetch(`${API}${path}`, {
    headers: { "User-Agent": UA, Accept: "application/geo+json" },
    cache: "no-store",
    signal: AbortSignal.timeout(12_000),
  });
  if (!res.ok) throw new Error(`${res.status} ${res.statusText} — ${path}`);
  return res.json() as Promise<T>;
}

// ---------- raw NWS shapes (only fields we use) ----------

type Q = { value: number | null; unitCode?: string } | null;
type RawHourly = {
  properties: {
    updateTime: string;
    periods: {
      startTime: string;
      isDaytime: boolean;
      temperature: number;
      probabilityOfPrecipitation: Q;
      dewpoint: Q;
      relativeHumidity: Q;
      windSpeed: string;
      windDirection: string;
      shortForecast: string;
    }[];
  };
};
type RawForecast = {
  properties: {
    updateTime: string;
    periods: {
      name: string;
      startTime: string;
      endTime: string;
      isDaytime: boolean;
      temperature: number;
      probabilityOfPrecipitation: Q;
      windSpeed: string;
      windDirection: string;
      shortForecast: string;
      detailedForecast: string;
    }[];
  };
};
type Series = { uom?: string; values: { validTime: string; value: number | null }[] };
type RawGrid = { properties: Record<string, Series | unknown> & { updateTime: string } };
type RawObs = {
  properties: {
    timestamp: string;
    textDescription: string;
    temperature: Q;
    dewpoint: Q;
    relativeHumidity: Q;
    windSpeed: Q;
    windGust: Q;
    windDirection: Q;
    heatIndex: Q;
    windChill: Q;
    visibility: Q;
    barometricPressure: Q;
  };
};
type RawAlerts = {
  features: {
    id: string;
    geometry: GeoJSON.Geometry | null;
    properties: {
      event: string;
      severity: string;
      urgency: string;
      certainty: string;
      headline: string | null;
      description: string | null;
      instruction: string | null;
      areaDesc: string;
      senderName: string;
      effective: string | null;
      onset: string | null;
      expires: string | null;
      ends: string | null;
    };
  }[];
};

// ---------- helpers ----------

const t = (iso: string | null | undefined) => (iso ? Date.parse(iso) : null);
const mph = (s: string) => {
  const nums = s.match(/\d+/g)?.map(Number) ?? [0];
  return Math.max(...nums);
};

/** ISO-8601 "2026-09-23T12:00:00+00:00/PT6H" → [startMs, hours] */
function parseValidTime(v: string): [number, number] {
  const [start, dur] = v.split("/");
  const m = dur.match(/P(?:(\d+)D)?(?:T(?:(\d+)H)?(?:(\d+)M)?)?/);
  const hours = (Number(m?.[1] ?? 0) * 24) + Number(m?.[2] ?? 0) + Math.ceil(Number(m?.[3] ?? 0) / 60);
  return [Date.parse(start), Math.max(1, hours)];
}

/** Expand a grid series into an hour-keyed map. `spread` divides accumulations evenly. */
function expand(series: unknown, spread = false): Map<number, number> {
  const out = new Map<number, number>();
  const s = series as Series | undefined;
  if (!s?.values) return out;
  for (const { validTime, value } of s.values) {
    if (value == null) continue;
    const [start, hours] = parseValidTime(validTime);
    for (let i = 0; i < hours; i++) out.set(start + i * HOUR, spread ? value / hours : value);
  }
  return out;
}

function toAlert(f: RawAlerts["features"][number]): WeatherAlert {
  const p = f.properties;
  return {
    id: f.id,
    event: p.event,
    severity: p.severity,
    urgency: p.urgency,
    certainty: p.certainty,
    headline: p.headline ?? p.event,
    description: p.description ?? "",
    instruction: p.instruction ?? "",
    areaDesc: p.areaDesc,
    sender: p.senderName,
    effective: t(p.effective),
    onset: t(p.onset),
    expires: t(p.expires),
    ends: t(p.ends),
    geometry: f.geometry,
  };
}

// ---------- normalizers ----------

function buildHours(raw: RawHourly, grid: RawGrid | null): Hour[] {
  const g: Record<string, unknown> = grid?.properties ?? {};
  const feels = expand(g.apparentTemperature);
  const thunder = expand(g.probabilityOfThunder);
  const qpf = expand(g.quantitativePrecipitation, true);
  const gust = expand(g.windGust);
  const sky = expand(g.skyCover);
  const wdeg = expand(g.windDirection);

  return raw.properties.periods.map((p) => {
    const ts = Date.parse(p.startTime);
    const f = feels.get(ts);
    const gu = gust.get(ts);
    return {
      ts,
      tempF: p.temperature,
      feelsF: f != null ? Math.round(cToF(f)) : null,
      pop: p.probabilityOfPrecipitation?.value ?? 0,
      thunder: thunder.get(ts) ?? null,
      qpfMmPerHr: qpf.get(ts) ?? null,
      windMph: mph(p.windSpeed),
      gustMph: gu != null ? Math.round(kmhToMph(gu)) : null,
      windDir: p.windDirection,
      windDeg: wdeg.get(ts) ?? cardinalToDeg(p.windDirection),
      humidity: p.relativeHumidity?.value ?? null,
      dewpointF: p.dewpoint?.value != null ? Math.round(cToF(p.dewpoint.value)) : null,
      sky: sky.get(ts) ?? null,
      short: p.shortForecast,
      isDay: p.isDaytime,
      condition: conditionFromText(p.shortForecast, p.isDaytime),
    };
  });
}

function buildPeriods(raw: RawForecast): Period[] {
  return raw.properties.periods.map((p) => ({
    name: p.name,
    start: Date.parse(p.startTime),
    end: Date.parse(p.endTime),
    isDay: p.isDaytime,
    tempF: p.temperature,
    pop: p.probabilityOfPrecipitation?.value ?? 0,
    wind: `${p.windDirection} ${p.windSpeed}`,
    short: p.shortForecast,
    detailed: p.detailedForecast,
    condition: conditionFromText(p.shortForecast, p.isDaytime),
  }));
}

function buildDays(periods: Period[], hours: Hour[]): Day[] {
  const byKey = new Map<string, Day>();
  const todayKey = dayKey(Date.now());
  for (const p of periods) {
    // A night period belongs to the calendar day on which it starts.
    const key = dayKey(p.start);
    let d = byKey.get(key);
    if (!d) {
      d = {
        key,
        label: key === todayKey ? "Today" : fmtWeekday(p.start),
        dateLabel: fmtMonthDay(p.start),
        day: null,
        night: null,
        highF: null,
        lowF: null,
        popMax: 0,
        condition: p.condition,
      };
      byKey.set(key, d);
    }
    if (p.isDay) {
      d.day = p;
      d.highF = p.tempF;
      d.condition = p.condition;
    } else {
      d.night = p;
      d.lowF = p.tempF;
      if (!d.day) d.condition = p.condition;
    }
    d.popMax = Math.max(d.popMax, p.pop);
  }
  const days = [...byKey.values()];
  // Today may have only "This Afternoon"/"Tonight" — fill missing high from hourly.
  for (const d of days) {
    const hs = hours.filter((h) => dayKey(h.ts) === d.key);
    if (d.highF == null && hs.length) d.highF = Math.max(...hs.map((h) => h.tempF));
    if (hs.length) d.popMax = Math.max(d.popMax, ...hs.map((h) => h.pop));
  }
  return days;
}

function buildCurrent(raw: RawObs, stationId: string, stationName: string): Current {
  const p = raw.properties;
  const c = (q: Q) => (q?.value != null ? Math.round(cToF(q.value)) : null);
  const tempF = c(p.temperature);
  return {
    stationId,
    stationName,
    observedAt: Date.parse(p.timestamp),
    text: p.textDescription || "—",
    tempF,
    feelsF: c(p.heatIndex) ?? c(p.windChill) ?? tempF,
    dewpointF: c(p.dewpoint),
    humidity: p.relativeHumidity?.value != null ? Math.round(p.relativeHumidity.value) : null,
    windMph: p.windSpeed?.value != null ? Math.round(kmhToMph(p.windSpeed.value)) : null,
    windDir: degToCardinal(p.windDirection?.value),
    gustMph: p.windGust?.value != null ? Math.round(kmhToMph(p.windGust.value)) : null,
    visibilityMi: p.visibility?.value != null ? Math.round((p.visibility.value / 1609.34) * 10) / 10 : null,
    pressureInHg: p.barometricPressure?.value != null ? Math.round((p.barometricPressure.value / 3386.39) * 100) / 100 : null,
    condition: conditionFromText(p.textDescription || ""),
  };
}

async function latestObservation(): Promise<{ raw: RawObs; id: string }> {
  let lastErr: unknown;
  for (const id of MIAMI.stations) {
    try {
      const raw = await nws<RawObs>(`/stations/${id}/observations/latest`);
      if (raw.properties.temperature?.value != null) return { raw, id };
    } catch (e) {
      lastErr = e;
    }
  }
  throw lastErr ?? new Error("No station reported a temperature");
}

const STATION_NAMES: Record<string, string> = {
  KMIA: "Miami International Airport",
  KOPF: "Opa-locka Airport",
  KTMB: "Kendall-Tamiami Airport",
};

// ---------- public ----------

let cache: { at: number; data: WeatherBundle } | null = null;
const TTL = 5 * 60_000;

export async function getMiamiWeather(force = false): Promise<WeatherBundle> {
  if (!force && cache && Date.now() - cache.at < TTL) return cache.data;

  const grid = `/gridpoints/${MIAMI.office}/${MIAMI.gridX},${MIAMI.gridY}`;
  const [hourlyR, forecastR, gridR, obsR, alertsR, regionalR] = await Promise.allSettled([
    nws<RawHourly>(`${grid}/forecast/hourly`),
    nws<RawForecast>(`${grid}/forecast`),
    nws<RawGrid>(grid),
    latestObservation(),
    nws<RawAlerts>(`/alerts/active?point=${MIAMI.lat},${MIAMI.lon}`),
    nws<RawAlerts>(`/alerts/active?area=${MIAMI.state}`),
  ]);

  if (hourlyR.status === "rejected") {
    if (cache) return cache.data; // serve last good bundle; UI flags it as stale
    throw hourlyR.reason;
  }

  const val = <T,>(r: PromiseSettledResult<T>) => (r.status === "fulfilled" ? r.value : null);
  const err = (r: PromiseSettledResult<unknown>) => (r.status === "rejected" ? String(r.reason?.message ?? r.reason) : undefined);

  const gridData = val(gridR);
  const hours = buildHours(hourlyR.value, gridData).filter((h) => h.ts + HOUR > Date.now());
  const periods = forecastR.status === "fulfilled" ? buildPeriods(forecastR.value) : [];
  const obs = val(obsR);

  const sources: SourceStatus[] = [
    { id: "hourly", label: "NWS hourly forecast", url: `${API}${grid}/forecast/hourly`, ok: true, updatedAt: t(hourlyR.value.properties.updateTime) },
    { id: "forecast", label: "NWS 7-day forecast", url: `${API}${grid}/forecast`, ok: forecastR.status === "fulfilled", updatedAt: forecastR.status === "fulfilled" ? t(forecastR.value.properties.updateTime) : null, error: err(forecastR) },
    { id: "grid", label: "NWS gridded data (feels-like, thunder, QPF, gusts)", url: `${API}${grid}`, ok: !!gridData, updatedAt: gridData ? t(gridData.properties.updateTime) : null, error: err(gridR) },
    { id: "obs", label: `Observation ${obs?.id ?? "KMIA"}`, url: `${API}/stations/${obs?.id ?? "KMIA"}/observations/latest`, ok: !!obs, updatedAt: obs ? t(obs.raw.properties.timestamp) : null, error: err(obsR) },
    { id: "alerts", label: "NWS active alerts (point)", url: `${API}/alerts/active?point=${MIAMI.lat},${MIAMI.lon}`, ok: alertsR.status === "fulfilled", updatedAt: Date.now(), error: err(alertsR) },
    { id: "regional", label: "NWS active alerts (Florida)", url: `${API}/alerts/active?area=FL`, ok: regionalR.status === "fulfilled", updatedAt: Date.now(), error: err(regionalR) },
  ];

  const data: WeatherBundle = {
    location: {
      name: MIAMI.name,
      lat: MIAMI.lat,
      lon: MIAMI.lon,
      office: MIAMI.office,
      grid: `${MIAMI.office} ${MIAMI.gridX},${MIAMI.gridY}`,
      timeZone: MIAMI.timeZone,
      radarStation: MIAMI.radarStation,
    },
    fetchedAt: Date.now(),
    current: obs ? buildCurrent(obs.raw, obs.id, STATION_NAMES[obs.id] ?? obs.id) : null,
    hours,
    periods,
    days: buildDays(periods, hours),
    alerts: val(alertsR)?.features.map(toAlert) ?? [],
    regionalAlerts: val(regionalR)?.features.map(toAlert) ?? [],
    sources,
  };
  cache = { at: Date.now(), data };
  return data;
}
