// The intelligence layer. Pure functions over the normalized model — it decides
// what to say, what to promote and in which order, but never changes navigation.

import {
  type CalendarEvent,
  type Hour,
  type ModelRun,
  type RoutePlan,
  type WeatherAlert,
  type WeatherBundle,
  HOUR,
  dayKey,
  fmtClock,
  fmtHour,
} from "./weather-primitives";

export type ConfidenceLevel = "high" | "medium" | "low";
export type Confidence = { level: ConfidenceLevel; reason: string; evidence: string[] };

// ---------- confidence ----------

/** NWS does not publish forecast spread, so confidence is derived from
 *  how decisive the PoP signal is and how far out the event is. */
export function confidenceFrom(pop: number, leadHours: number, extra: string[] = []): Confidence {
  const decisiveness = Math.abs(pop - 50) / 50; // 0 = coin flip, 1 = certain either way
  const leadPenalty = Math.min(leadHours, 72) / 72; // 0 = now, 1 = 3 days out
  const score = decisiveness * 0.7 + (1 - leadPenalty) * 0.3;
  const level: ConfidenceLevel = score >= 0.62 ? "high" : score >= 0.38 ? "medium" : "low";
  const reason =
    level === "high"
      ? "Strong, consistent signal in the NWS forecast"
      : level === "medium"
        ? "Signal is clear but timing can shift"
        : "Forecast signal is weak or far out";
  return {
    level,
    reason,
    evidence: [
      `Peak chance of precipitation ${Math.round(pop)}%`,
      `Lead time ${leadHours < 1 ? "under 1 hour" : `~${Math.round(leadHours)} h`}`,
      ...extra,
      "Method: derived from NWS PoP decisiveness + lead time (NWS publishes no ensemble spread)",
    ],
  };
}

// ---------- precipitation arrival ----------

export type Intensity = "light" | "moderate" | "heavy";
export type PrecipEvent = {
  state: "ongoing" | "upcoming";
  possibleStart: number;
  likelyStart: number;
  likelyEnd: number;
  possibleEnd: number;
  durationH: number;
  peakPop: number;
  peakTs: number;
  intensity: Intensity;
  thunder: boolean;
  confidence: Confidence;
  hours: Hour[]; // window analysed
};

const POSSIBLE = 30;
const LIKELY = 50;

export function analyzePrecip(hours: Hour[], now = Date.now(), horizonH = 24): PrecipEvent | null {
  const win = hours.filter((h) => h.ts + HOUR > now && h.ts < now + horizonH * HOUR);
  if (!win.length) return null;
  const firstPossible = win.findIndex((h) => h.pop >= POSSIBLE);
  if (firstPossible < 0) return null;

  // Peak hour of the first event (stop once pop falls back below "possible").
  let endIdx = firstPossible;
  while (endIdx + 1 < win.length && win[endIdx + 1].pop >= POSSIBLE) endIdx++;
  const event = win.slice(firstPossible, endIdx + 1);
  const peak = event.reduce((a, b) => (b.pop > a.pop ? b : a));
  if (peak.pop < 40) return null; // not worth a decision module

  const likely = event.filter((h) => h.pop >= Math.max(LIKELY, peak.pop - 20));
  const likelyStart = likely[0]?.ts ?? peak.ts;
  const likelyEnd = (likely.at(-1)?.ts ?? peak.ts) + HOUR;
  const possibleStart = event[0].ts;
  const possibleEnd = event.at(-1)!.ts + HOUR;

  const maxQ = Math.max(0, ...event.map((h) => h.qpfMmPerHr ?? 0));
  const thunder = event.some((h) => (h.thunder ?? 0) >= 30 || h.condition === "storm");
  const intensity: Intensity = maxQ >= 4 || (thunder && peak.pop >= 70) ? "heavy" : maxQ >= 1 || peak.pop >= 60 ? "moderate" : "light";
  const state = possibleStart <= now ? "ongoing" : "upcoming";
  const lead = Math.max(0, (likelyStart - now) / HOUR);

  return {
    state,
    possibleStart,
    likelyStart,
    likelyEnd,
    possibleEnd,
    durationH: Math.max(1, Math.round((likelyEnd - likelyStart) / HOUR)),
    peakPop: peak.pop,
    peakTs: peak.ts,
    intensity,
    thunder,
    confidence: confidenceFrom(peak.pop, lead, [
      `Max hourly rainfall rate ~${maxQ.toFixed(1)} mm/h (NWS QPF)`,
      thunder ? `Thunder probability up to ${Math.max(0, ...event.map((h) => h.thunder ?? 0))}%` : "No thunder signal",
    ]),
    hours: win,
  };
}

// ---------- best window ----------

export type BestWindow = {
  start: number;
  end: number;
  hours: Hour[];
  score: number;
  summary: string;
  why: string[];
};

export function hourComfort(h: Hour) {
  const feels = h.feelsF ?? h.tempF;
  let s = 100;
  s -= h.pop * 0.9;
  s -= (h.thunder ?? 0) * 0.6;
  s -= Math.max(0, feels - 92) * 3.2;
  s -= Math.max(0, 60 - feels) * 2;
  s -= Math.max(0, (h.gustMph ?? h.windMph) - 20) * 2.5;
  return Math.max(0, Math.round(s));
}

/** Longest high-comfort daylight block (>=2 h) in the given hours. */
export function findBestWindow(hours: Hour[], now = Date.now(), minScore = 55): BestWindow | null {
  const cand = hours.filter((h) => h.isDay && h.ts + HOUR > now);
  let best: Hour[] = [];
  let bestSum = 0;
  let run: Hour[] = [];
  const flush = () => {
    const sum = run.reduce((a, h) => a + hourComfort(h), 0);
    if (run.length >= 2 && sum > bestSum) {
      best = run;
      bestSum = sum;
    }
    run = [];
  };
  for (const h of cand) {
    const contiguous = run.length === 0 || h.ts - run.at(-1)!.ts === HOUR;
    if (!contiguous) flush();
    if (hourComfort(h) >= minScore) run.push(h);
    else flush();
  }
  flush();
  if (!best.length) return null;

  const pop = Math.max(...best.map((h) => h.pop));
  const feels = best.map((h) => h.feelsF ?? h.tempF);
  const why = [
    `Rain chance ${pop <= 10 ? "stays near zero" : `at or below ${pop}%`}`,
    `Feels like ${Math.min(...feels)}–${Math.max(...feels)}°`,
    `Wind ${Math.max(...best.map((h) => h.windMph))} mph or less`,
  ];
  return {
    start: best[0].ts,
    end: best.at(-1)!.ts + HOUR,
    hours: best,
    score: Math.round(bestSum / best.length),
    summary: `${fmtHour(best[0].ts)}–${fmtHour(best.at(-1)!.ts + HOUR)}`,
    why,
  };
}

// ---------- transitions (what the Hourly page highlights) ----------

export type TransitionKind = "precip-start" | "precip-end" | "temp-peak" | "temp-drop" | "wind-shift" | "risk-up" | "risk-down";
export type Transition = { ts: number; kind: TransitionKind; label: string; detail: string };

export function detectTransitions(hours: Hour[], horizonH = 24): Transition[] {
  const win = hours.slice(0, horizonH);
  const out: Transition[] = [];
  if (win.length < 2) return out;

  for (let i = 1; i < win.length; i++) {
    const a = win[i - 1];
    const b = win[i];
    if (a.pop < LIKELY && b.pop >= LIKELY)
      out.push({ ts: b.ts, kind: "precip-start", label: "Rain likely", detail: `Chance jumps to ${b.pop}%` });
    if (a.pop >= LIKELY && b.pop < LIKELY)
      out.push({ ts: b.ts, kind: "precip-end", label: "Drying out", detail: `Chance falls to ${b.pop}%` });
    const ta = a.thunder ?? 0;
    const tb = b.thunder ?? 0;
    if (ta < 30 && tb >= 30) out.push({ ts: b.ts, kind: "risk-up", label: "Lightning risk", detail: `Thunder chance ${tb}%` });
    if (ta >= 30 && tb < 30) out.push({ ts: b.ts, kind: "risk-down", label: "Lightning eases", detail: `Thunder chance ${tb}%` });
    if (a.windDeg != null && b.windDeg != null && b.windMph >= 8) {
      const d = Math.abs(((b.windDeg - a.windDeg + 540) % 360) - 180);
      if (d >= 90) out.push({ ts: b.ts, kind: "wind-shift", label: "Wind shift", detail: `${a.windDir} → ${b.windDir}, ${b.windMph} mph` });
    }
  }
  // Temperature peak and the sharpest 3-hour drop.
  const peak = win.reduce((x, y) => (y.tempF > x.tempF ? y : x));
  out.push({ ts: peak.ts, kind: "temp-peak", label: "Warmest", detail: `${peak.tempF}°${peak.feelsF ? `, feels ${peak.feelsF}°` : ""}` });
  let drop = { i: -1, d: 0 };
  for (let i = 3; i < win.length; i++) {
    const d = win[i - 3].tempF - win[i].tempF;
    if (d > drop.d) drop = { i, d };
  }
  if (drop.d >= 5) {
    const h = win[drop.i];
    out.push({ ts: h.ts, kind: "temp-drop", label: "Cooling", detail: `Down ${drop.d}° in 3 hours` });
  }
  // One highlight per hour, most important first.
  const rank: TransitionKind[] = ["risk-up", "precip-start", "precip-end", "temp-drop", "wind-shift", "risk-down", "temp-peak"];
  out.sort((x, y) => x.ts - y.ts || rank.indexOf(x.kind) - rank.indexOf(y.kind));
  const seen = new Set<number>();
  return out.filter((tr) => (seen.has(tr.ts) ? false : (seen.add(tr.ts), true)));
}

// ---------- heat ----------

export type HeatRisk = { peakFeels: number; peakTs: number; level: "caution" | "danger" | "extreme"; hoursAbove: number };
export function analyzeHeat(hours: Hour[], horizonH = 18): HeatRisk | null {
  const win = hours.slice(0, horizonH).filter((h) => h.feelsF != null);
  if (!win.length) return null;
  const peak = win.reduce((a, b) => ((b.feelsF ?? 0) > (a.feelsF ?? 0) ? b : a));
  const f = peak.feelsF ?? 0;
  if (f < 100) return null;
  return {
    peakFeels: f,
    peakTs: peak.ts,
    level: f >= 112 ? "extreme" : f >= 105 ? "danger" : "caution",
    hoursAbove: win.filter((h) => (h.feelsF ?? 0) >= 100).length,
  };
}

// ---------- lightning ----------

export type LightningRisk = { peak: number; start: number; end: number };
export function analyzeLightning(hours: Hour[], horizonH = 12): LightningRisk | null {
  const win = hours.slice(0, horizonH).filter((h) => (h.thunder ?? 0) >= 25 || h.condition === "storm");
  if (!win.length) return null;
  return {
    peak: Math.max(...win.map((h) => h.thunder ?? 40)),
    start: win[0].ts,
    end: win.at(-1)!.ts + HOUR,
  };
}

// ---------- alerts ----------

const SEVERITY_RANK: Record<string, number> = { Extreme: 4, Severe: 3, Moderate: 2, Minor: 1, Unknown: 0 };
export const sortAlerts = (a: WeatherAlert[]) =>
  [...a].sort((x, y) => (SEVERITY_RANK[y.severity] ?? 0) - (SEVERITY_RANK[x.severity] ?? 0));
export const isWarning = (a: WeatherAlert) => /warning/i.test(a.event);

export function alertConfidence(a: WeatherAlert): Confidence {
  const level: ConfidenceLevel = a.certainty === "Observed" ? "high" : a.certainty === "Likely" ? "medium" : "low";
  return {
    level,
    reason: `NWS certainty: ${a.certainty}`,
    evidence: [`Severity ${a.severity}`, `Urgency ${a.urgency}`, `Certainty ${a.certainty}`, `Issued by ${a.sender}`],
  };
}

// ---------- calendar ----------

export type CalendarVerdict = "clear" | "watch" | "at-risk";
export type CalendarImpact = {
  event: CalendarEvent;
  verdict: CalendarVerdict;
  summary: string;
  detail: string;
  wetFrom: number | null;
  maxPop: number;
  maxThunder: number;
  maxFeels: number;
  alternative: { start: number; end: number } | null;
};

export function analyzeCalendar(e: CalendarEvent, hours: Hour[], now = Date.now()): CalendarImpact {
  const during = hours.filter((h) => h.ts + HOUR > e.start && h.ts < e.end);
  const maxPop = Math.max(0, ...during.map((h) => h.pop));
  const maxThunder = Math.max(0, ...during.map((h) => h.thunder ?? 0));
  const maxFeels = Math.max(0, ...during.map((h) => h.feelsF ?? h.tempF));
  const wet = during.find((h) => h.pop >= 50 || (h.thunder ?? 0) >= 30);
  const verdict: CalendarVerdict = wet ? "at-risk" : maxPop >= 30 || maxThunder >= 15 || maxFeels >= 103 ? "watch" : "clear";

  // Same-length slot today, as close to the original as possible, that stays dry.
  const len = Math.round((e.end - e.start) / HOUR);
  let alternative: CalendarImpact["alternative"] = null;
  if (verdict !== "clear") {
    const slots: number[] = [];
    for (let k = -4; k <= 6; k++) if (k) slots.push(e.start + k * HOUR);
    slots.sort((a, b) => Math.abs(a - e.start) - Math.abs(b - e.start));
    for (const start of slots) {
      const hs = hours.filter((h) => h.ts >= start && h.ts < start + len * HOUR);
      if (start < now || hs.length < len || dayKey(start) !== dayKey(e.start)) continue;
      if (hs.every((h) => h.isDay && h.pop < 30 && (h.thunder ?? 0) < 15)) {
        alternative = { start, end: start + len * HOUR };
        break;
      }
    }
  }
  const when = `${fmtHour(e.start)}–${fmtHour(e.end)}`;
  const summary =
    verdict === "at-risk"
      ? `${maxThunder >= 30 ? "Storms" : "Rain"} likely during ${e.title.toLowerCase()} from ${fmtHour(wet!.ts)}`
      : verdict === "watch"
        ? `${e.title} ${when}: mostly fine, keep an eye on the sky`
        : `${e.title} ${when} looks dry`;
  const detail =
    verdict === "at-risk"
      ? `Rain chance reaches ${maxPop}%${maxThunder >= 30 ? ` with ${maxThunder}% thunder — lightning means stopping play` : ""}.`
      : `Rain chance stays at or below ${maxPop}%, feels like up to ${maxFeels}°.`;
  return { event: e, verdict, summary, detail, wetFrom: wet?.ts ?? null, maxPop, maxThunder, maxFeels, alternative };
}

// ---------- route ----------

export type SegmentRisk = "clear" | "near" | "heavy";
export type RouteImpact = {
  route: RoutePlan;
  plannedDepart: number;
  segments: { name: string; lat: number; lon: number; at: number; risk: SegmentRisk }[];
  firstHeavy: { name: string; at: number } | null;
  suggestion: { depart: number; note: string } | null;
};

const NEAR_MIN = 20;

function evaluateRoute(route: RoutePlan, depart: number) {
  return route.segments.map((s) => {
    const at = depart + s.etaMin * 60_000;
    let risk: SegmentRisk = "clear";
    if (s.heavyFrom != null && s.heavyTo != null) {
      if (at >= s.heavyFrom && at <= s.heavyTo) risk = "heavy";
      else if (at >= s.heavyFrom - NEAR_MIN * 60_000 && at <= s.heavyTo + NEAR_MIN * 60_000) risk = "near";
    }
    return { name: s.name, lat: s.lat, lon: s.lon, at, risk };
  });
}

export function analyzeRoute(route: RoutePlan, now = Date.now()): RouteImpact {
  const segments = evaluateRoute(route, route.depart);
  const heavy = segments.find((s) => s.risk === "heavy");
  let suggestion: RouteImpact["suggestion"] = null;
  if (heavy) {
    const step = 15 * 60_000;
    const options: number[] = [];
    for (let d = Math.ceil(now / step) * step; d <= route.depart + 5 * HOUR; d += step) options.push(d);
    options.sort((a, b) => Math.abs(a - route.depart) - Math.abs(b - route.depart));
    const clean = options.find((d) => evaluateRoute(route, d).every((s) => s.risk !== "heavy"));
    if (clean != null) {
      const shift = Math.round((clean - route.depart) / 60_000);
      suggestion = {
        depart: clean,
        note: shift > 0 ? `Leave at ${fmtClock(clean)} (${shift} min later) to stay behind the heaviest rain.` : `Leave by ${fmtClock(clean)} (${-shift} min earlier) to get ahead of the heaviest rain.`,
      };
    }
  }
  return { route, plannedDepart: route.depart, segments, firstHeavy: heavy ? { name: heavy.name, at: heavy.at } : null, suggestion };
}

// ---------- model disagreement ----------

export type ModelSpread = { models: ModelRun[]; startSpreadH: number; dryModels: number; minIn: number; maxIn: number; confidence: Confidence };

export function analyzeModels(models: ModelRun[], now = Date.now()): ModelSpread {
  const starts = models.map((m) => m.rainStart).filter((s): s is number => s != null);
  const startSpreadH = starts.length ? Math.round((Math.max(...starts) - Math.min(...starts)) / HOUR) : 0;
  const dryModels = models.length - starts.length;
  const totals = models.map((m) => m.totalIn);
  const minIn = Math.min(...totals);
  const maxIn = Math.max(...totals);
  const level: ConfidenceLevel = startSpreadH >= 4 || dryModels > 0 ? "low" : startSpreadH >= 2 ? "medium" : "high";
  return {
    models,
    startSpreadH,
    dryModels,
    minIn,
    maxIn,
    confidence: {
      level,
      reason: level === "low" ? "Models disagree on whether and when it rains" : "Models broadly agree",
      evidence: [
        ...models.map((m) => `${m.name}: ${m.rainStart ? `rain from ${fmtHour(m.rainStart)}` : "stays mostly dry"}, ${m.totalIn.toFixed(2)} in`),
        `Start-time spread ${startSpreadH} h${dryModels ? `; ${dryModels} model${dryModels > 1 ? "s" : ""} keep it dry` : ""}`,
        `Totals range ${minIn.toFixed(2)}–${maxIn.toFixed(2)} in`,
        `Lead time to earliest start ${starts.length ? Math.max(0, Math.round((Math.min(...starts) - now) / HOUR)) : "—"} h`,
      ],
    },
  };
}

// ---------- brief + home ordering ----------

export type ModuleId = "alert" | "lightning" | "rain" | "heat" | "best-window" | "calendar" | "route" | "uncertainty";
export type Editorial = {
  headline: string;
  subline: string;
  modules: ModuleId[]; // every decision module shown, most important first
  main: ModuleId[]; // modules placed in the main column (above Hourly)
  rail: ModuleId[]; // modules placed in the context rail
  promoteRadar: boolean;
  precip: PrecipEvent | null;
  best: BestWindow | null;
  heat: HeatRisk | null;
  lightning: LightningRisk | null;
  calendar: CalendarImpact[];
  route: RouteImpact | null;
  spread: ModelSpread | null;
  transitions: Transition[];
  alerts: WeatherAlert[];
  rationale: string[]; // why the layout looks the way it does (surfaced in /debug)
};

export function buildEditorial(b: WeatherBundle, now = Date.now()): Editorial {
  const hours = b.hours.filter((h) => h.ts + HOUR > now);
  const precip = analyzePrecip(hours, now);
  const todayHours = hours.filter((h) => dayKey(h.ts) === dayKey(now));
  const best = findBestWindow(todayHours.length >= 3 ? todayHours : hours.slice(0, 24), now);
  const heat = analyzeHeat(hours);
  const lightning = analyzeLightning(hours);
  const alerts = sortAlerts(b.alerts);
  const calendar = (b.calendar ?? []).filter((e) => e.end > now).map((e) => analyzeCalendar(e, hours, now));
  const route = b.route ? analyzeRoute(b.route, now) : null;
  const spread = b.models?.length ? analyzeModels(b.models, now) : null;
  const rationale: string[] = [];

  // Model disagreement outranks the PoP-derived confidence.
  if (precip && spread) {
    precip.confidence = spread.confidence;
    rationale.push(`Precip confidence overridden by model spread (${spread.startSpreadH} h start spread)`);
  }
  const atRisk = calendar.find((c) => c.verdict === "at-risk");

  // Headline — one meaningful sentence pair. Precedence: warning > personal plans > weather.
  let headline: string;
  let subline = b.periods[0]?.detailed ?? "";
  const warning = alerts.find(isWarning);
  if (warning) {
    headline = warning.approach
      ? `${warning.event.replace(/ Warning$/, "")} approaching Miami — strongest part in about ${warning.approach.minMinutes}–${warning.approach.maxMinutes} minutes.`
      : `${warning.event} in effect for Miami.`;
    subline = "Official NWS warning in effect. Move indoors before it arrives.";
    rationale.push(`Headline led by active ${warning.event}`);
  } else if (atRisk) {
    headline = `${atRisk.summary}.${atRisk.alternative ? ` ${fmtHour(atRisk.alternative.start)}–${fmtHour(atRisk.alternative.end)} stays dry.` : ""}`;
    rationale.push(`Headline led by calendar conflict: ${atRisk.event.title}`);
  } else if (route?.firstHeavy) {
    headline = `Heavy rain on your drive near ${route.firstHeavy.name} around ${fmtClock(route.firstHeavy.at)}.`;
    if (route.suggestion) subline = route.suggestion.note;
    rationale.push(`Headline led by route conflict at ${route.firstHeavy.name}`);
  } else if (spread && precip && spread.confidence.level === "low") {
    headline = `Rain possible from ${fmtHour(precip.possibleStart)}, but timing is uncertain.`;
    subline = `Forecast models disagree by ${spread.startSpreadH} hours on when rain starts, and on totals from ${spread.minIn.toFixed(2)} to ${spread.maxIn.toFixed(2)} in. Plan for rain after ${fmtHour(precip.possibleStart)}, but don't cancel yet.`;
    rationale.push("Headline acknowledges model disagreement");
  } else if (precip?.state === "ongoing") {
    // Only say "now" when the station actually reports rain; otherwise it is a forecast chance.
    const wetNow = /rain|shower|thunder|drizzle|storm/i.test(b.current?.text ?? "");
    const kind = precip.thunder ? "Storms" : "Rain";
    const lead = wetNow ? `${kind} around Miami now.` : `${kind} likely around Miami ${precip.likelyEnd - now > 12 * HOUR ? "today" : "this afternoon"}.`;
    headline =
      precip.likelyEnd - now > 12 * HOUR ? `${lead} Unsettled through tonight.` : `${lead} Drying out after ${fmtHour(precip.likelyEnd)}.`;
    rationale.push(`Precipitation window already open (PoP ≥30% this hour); station reports "${b.current?.text ?? "n/a"}"`);
  } else if (precip) {
    const kind = precip.thunder ? "Storms become likely" : "Rain becomes likely";
    headline = `Dry until about ${fmtHour(precip.possibleStart)}. ${kind} after ${fmtHour(precip.likelyStart)}.`;
    rationale.push(`Rain arrival detected, peak PoP ${precip.peakPop}%`);
  } else if (heat && heat.level !== "caution") {
    headline = `Dry and dangerously hot — feels like ${heat.peakFeels}° by ${fmtHour(heat.peakTs)}.`;
    rationale.push(`Heat index peaks at ${heat.peakFeels}°`);
  } else {
    const hi = Math.max(...hours.slice(0, 12).map((h) => h.tempF));
    headline = `A dry day. High near ${hi}°${heat ? `, feeling like ${heat.peakFeels}°` : ""}.`;
    rationale.push("No precipitation, alert or heat trigger — calm brief");
  }
  if (subline.length > 220) subline = subline.split(". ").slice(0, 2).join(". ") + ".";

  // Decision modules — only when useful. Personal plans lead, then timing, then context.
  const main: ModuleId[] = [];
  const rail: ModuleId[] = [];
  if (warning) main.push("alert");
  if (calendar.length) (atRisk || calendar.some((c) => c.verdict === "watch") ? main : rail).push("calendar");
  if (route) (route.firstHeavy ? main : rail).push("route");
  if (spread && precip) main.push("uncertainty");
  if (precip && precip.likelyStart - now < 18 * HOUR) main.push("rain");
  if (lightning && lightning.start - now < 6 * HOUR && lightning.peak >= 30) {
    (main.includes("rain") ? rail : main).push("lightning");
    rationale.push(`Lightning promoted: thunder ${lightning.peak}% within 6 h`);
  }
  if (heat) {
    (heat.level !== "caution" && !main.includes("rain") ? main : rail).push("heat");
    rationale.push(`Heat module shown: feels-like ≥100° for ${heat.hoursAbove} h`);
  }
  if (best) rail.push("best-window");
  else rationale.push("Best Window hidden: no ≥2 h comfortable daylight block remaining today");
  if (calendar.length) rationale.push(`Calendar: ${calendar.map((c) => `${c.event.title} → ${c.verdict}`).join(", ")}`);
  if (route) rationale.push(`Route: ${route.firstHeavy ? `heavy rain at ${route.firstHeavy.name}` : "clear"}${route.suggestion ? `; ${route.suggestion.note}` : ""}`);

  const promoteRadar = !!warning || (!!precip && (precip.state === "ongoing" || precip.likelyStart - now < 3 * HOUR));
  if (promoteRadar) rationale.push("Radar promoted above Daily: warning or precipitation within 3 h");

  return {
    headline,
    subline,
    modules: [...main, ...rail],
    main,
    rail,
    promoteRadar,
    precip,
    best,
    heat,
    lightning,
    calendar,
    route,
    spread,
    transitions: detectTransitions(hours),
    alerts,
    rationale,
  };
}
