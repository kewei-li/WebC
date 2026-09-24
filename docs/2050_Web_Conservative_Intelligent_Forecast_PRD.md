# 2050 Web Direction C — Conservative
## Intelligent Forecast — Responsive Web Prototype PRD

**Target:** Responsive Web  
**Implementation:** Next.js + React + TypeScript  
**Goal:** Upgrade the familiar weather-site model without replacing its information architecture.

## 1. Product thesis

Keep the recognizable structure:

**Home / Hourly / Daily / Maps**

but add intelligence exactly where it creates value.

> How intelligent can today's weather website become without asking users to learn a new product?

Users can still arrive expecting to check temperature, hourly forecast, daily forecast or radar and immediately know where to go. The upgrade is that each familiar surface becomes more editorial, contextual and decision-oriented.

## 2. Shared web stack

### Application / UI
- Next.js App Router
- React + TypeScript
- Tailwind CSS for responsive layout, tokens and states
- shadcn/ui as accessible open-code primitives; visually restyle everything to the 2050 language
- TanStack Query when moving from mock data to live APIs

### Visualization
- **Custom React + SVG/Canvas + D3 modules** for Weather Day Landscape, Precip Arrival Ribbon, Best Window and Confidence visuals
- **Apache ECharts** for conventional dense charts: temperature, wind, AQI, model comparison and analytical evidence
- **MapLibre GL JS** for interactive maps
- **deck.gl** for high-volume lightning, storm paths, route overlays, uncertainty polygons and GPU-heavy map layers
- **Motion for React** for card reprioritization, evidence expansion and state change; respect `prefers-reduced-motion`

### Prototype data
Do not build a backend initially. Use local scenario files:

```text
/data/scenarios/
  calm-day.json
  rain-arrival.json
  severe-weather.json
  calendar-activity.json
  route-weather.json
  forecast-uncertainty.json
```

Provide a development `ScenarioSwitcher`.

## 3. Responsive model

Use mobile-first CSS and container queries.

| Width | Behavior |
|---|---|
| `<640px` | Single-column compact web; secondary controls in drawer/sheet |
| `640–1023px` | Tablet/small window; 1–2 columns; evidence in modal/sheet |
| `1024–1439px` | Standard desktop; main content + contextual right rail |
| `>=1440px` | Wide desktop; 12-column canvas with persistent evidence/utility rail |

Do not simply make cards wider. Larger viewports should expose longer time horizons and parallel evidence.

## 4. Information architecture

Primary:

**Home / Hourly / Daily / Maps**

Utilities:
- Search/location
- Alerts
- Saved locations
- Settings
- Account/Premium

Desktop uses a top global nav and optional contextual right rail. Narrow web condenses utilities into a sheet while preserving primary destinations.

## 5. Home

Home remains recognizable, but gains an editorial first layer.

### Above the fold
1. **Current Conditions** — location, temperature, condition, high/low, freshness
2. **Weather Brief** — one meaningful summary
3. **Decision Module** — only when useful: Best Window, Rain Arrival, Lightning, Heat or AQI
4. **Familiar modules** — Hourly, Daily, Radar preview, Conditions

Example brief:

**Dry through early afternoon. Rain becomes likely after 3 PM.**

### Desktop layout

```text
┌────────────────────────────────────────────────────┐
│ Location + Current + Weather Brief                 │
├──────────────────────────────────┬─────────────────┤
│ Main forecast content            │ Context Rail    │
│ Hourly / Day Landscape           │ Best Window     │
│ Daily                            │ Alert / AQI      │
│ Radar preview                    │ Saved location  │
└──────────────────────────────────┴─────────────────┘
```

At wide desktop, allow a longer Weather Day Landscape and Radar/evidence to coexist without stretching reading text edge-to-edge.

## 6. Hourly

Retain the familiar destination but stop treating all hours equally.

Highlight:
- precipitation onset/end
- temperature peak/drop
- major wind shift
- risk transition

When precipitation matters, show **Precip Arrival Ribbon** above hourly detail with:
- possible arrival range
- most likely interval
- duration
- intensity
- confidence

Responsive behavior:
- desktop: 12–24 hour glance range, side inspection panel
- tablet: 8–12 hours, horizontal scroll allowed
- narrow: 5–7 hour glance plus list detail

## 7. Daily

Retain Daily, but each day can expand into:
- day narrative
- Weather Day Landscape
- precipitation timing
- high/low
- wind
- risk
- confidence
- best activity window

Desktop split pattern:

```text
Daily list        Selected day detail
Today             Day Landscape
Thu               Narrative
Fri        →      Best Window
Sat               Evidence
```

Narrow layouts stack detail beneath the selected day.

## 8. Maps

Maps remains first-class.

Desktop:

```text
┌─────────────────────────────────────────────────────┐
│ Map canvas                         Layer / Info Rail │
│                                                     │
│                                                     │
│ Timeline / playback                                 │
└─────────────────────────────────────────────────────┘
```

The rail contains layer selection, legend, selected-location detail, insight, confidence/source. On tablet/narrow web it becomes a sheet/drawer.

Editorial modules can deep-link directly into the correct layer, time, zoom and location.

Example:

**Rain approaching — View radar**

opens Radar already focused on the relevant event.

## 9. Alerts / Personal Risk

Official warning language remains authoritative. A separated interpretation may add personal context when supported:

**Severe Thunderstorm Warning**  
Official until 5:45 PM

**For your location**  
The strongest part of the storm may approach in approximately 20–40 minutes.

Interpretation must expose confidence and evidence.

## 10. Editorial boundaries

The intelligence layer may control:
- Home card order
- whether a decision module appears
- which transition is highlighted
- when Radar is promoted
- when Lightning/AQI/Heat become prominent

It does **not** radically change global navigation.

Target feeling:

> The weather website I already understand, but it now notices what matters.

## 11. Shared test scenarios

1. Calm Day
2. Rain Arrival
3. Severe Weather
4. Calendar Activity — soccer 3–5 PM
5. Route Weather — two-hour drive intersects heavy rain
6. Forecast Uncertainty — meaningful model disagreement

## 12. Prototype routes

```text
/
/hourly
/daily
/maps
/alerts
/debug
```

Scenario control:

```text
?scenario=calm
?scenario=rain
?scenario=severe
?scenario=calendar
?scenario=route
?scenario=uncertain
```

## 13. Suggested component structure

```text
app/
components/
  layout/
    SiteHeader.tsx
    DesktopRail.tsx
    ResponsiveShell.tsx
  weather/
    CurrentConditions.tsx
    WeatherBrief.tsx
    HourlyForecast.tsx
    DailyForecast.tsx
    WeatherDayLandscape.tsx
    PrecipArrivalRibbon.tsx
    BestWindowCard.tsx
    ConfidenceBadge.tsx
    EvidenceDrawer.tsx
    RiskBanner.tsx
  maps/
    WeatherMap.tsx
    MapTimeline.tsx
    LayerSelector.tsx
    MapInfoRail.tsx
lib/
  scenario-data.ts
  editorial-rules.ts
  weather-primitives.ts
  visualization/
  maps/
```

## 14. Accessibility

- keyboard-accessible navigation and controls
- visible focus
- no color-only critical meaning
- screen-reader summaries for visualizations
- reduced motion
- touch-safe tablet controls
- browser zoom-safe layouts
- explicit stale/unavailable states

## 15. Success criteria

Within five seconds, users should answer:
- What is happening?
- When will it matter?
- Should I do anything differently?
- How certain is it?
- Where do I go for more detail?

**Direction C ceiling:** approximately **9.3–9.6** as a product model. Familiarity and feasibility are strengths; the structural limitation is that users still navigate weather categories and may still integrate evidence themselves.
