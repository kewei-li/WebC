# Conservative Weather — 2050 Web Direction C

Responsive weather web prototype built from [`docs/2050_Web_Conservative_Intelligent_Forecast_PRD.md`](docs/2050_Web_Conservative_Intelligent_Forecast_PRD.md).
Familiar **Home / Hourly / Daily / Maps** structure with an intelligence layer that decides what to say and promote.

- **Live data:** National Weather Service (api.weather.gov) for Miami, FL — hourly, 7-day, gridded data, observations, alerts. Radar: NOAA/NCEP MRMS.
- **Scenarios:** six PRD test cases in `data/scenarios/*.json`, anchored to "now". Switch with `?scenario=calm|rain|severe|calendar|route|uncertain` (or `live`), or from Settings / `/debug`.
- **Stack:** Next.js (App Router) · React · TypeScript · Tailwind · TanStack Query · D3 (Day Landscape, Precip Ribbon) · ECharts · MapLibre GL · Motion.
- **Themes:** System / Light / Dark.

## Run

```bash
npm install        # postinstall copies the MapLibre ESM build into public/maplibre
npm run dev -- --port 3050
```

Routes: `/`, `/hourly`, `/daily`, `/maps`, `/alerts`, `/debug`.

## Accessibility QA

With the dev server running:

```bash
npm run qa:a11y
```

Runs axe-core (WCAG 2.2 A/AA) over 6 pages × 7 data cases × light/dark × 375/768/1440 px, plus open sheets/drawers, 320 px reflow and a minimum text-size check (uses the locally installed Google Chrome).

## Where things live

- `lib/nws.ts` — NWS fetch + normalization
- `lib/scenario-data.ts` — scenario files → the same data model
- `lib/editorial-rules.ts` — brief, decision modules, card order, confidence, calendar/route/model-spread rules
- `components/weather`, `components/maps` — UI modules
