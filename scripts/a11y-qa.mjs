// Accessibility QA: axe-core (WCAG 2.2 A/AA) across pages × scenarios × themes × viewports,
// plus reflow at 320px, small-text legibility and open-overlay states.
// Usage: node scripts/a11y-qa.mjs [baseUrl]   (dev server must be running)
import AxeBuilder from "@axe-core/playwright";
import { writeFileSync } from "node:fs";
import { chromium } from "playwright-core";

const BASE = process.argv[2] ?? "http://localhost:3050";
const PAGES = ["/", "/hourly", "/daily", "/maps", "/alerts", "/debug"];
const SCENARIOS = ["live", "calm", "rain", "severe", "calendar", "route", "uncertain"];
const THEMES = ["light", "dark"];
const VIEWPORTS = { mobile: { width: 375, height: 812 }, tablet: { width: 768, height: 1024 }, desktop: { width: 1440, height: 900 } };
const TAGS = ["wcag2a", "wcag2aa", "wcag21a", "wcag21aa", "wcag22aa"];
const CONCURRENCY = 6;

const browser = await chromium.launch({ executablePath: "/Applications/Google Chrome.app/Contents/MacOS/Google Chrome", headless: true });

async function openPage(theme, vp) {
  const ctx = await browser.newContext({ viewport: vp, colorScheme: theme, reducedMotion: "reduce" });
  return { ctx, page: await ctx.newPage() };
}

async function ready(page) {
  await page.waitForSelector("main h1, main h2, main h3", { timeout: 20000 });
  await page.waitForFunction(() => !document.querySelector("main .skeleton"), null, { timeout: 20000 });
  await page.waitForTimeout(1200); // charts / layout settle
}

async function legibility(page) {
  return page.evaluate(() => {
    const out = [];
    const walker = document.createTreeWalker(document.querySelector("main") ?? document.body, NodeFilter.SHOW_TEXT);
    const seen = new Set();
    while (walker.nextNode()) {
      const n = walker.currentNode;
      const el = n.parentElement;
      if (!el || !n.textContent.trim() || seen.has(el)) continue;
      seen.add(el);
      if (el.closest("[aria-hidden=true], .sr-only, .maplibregl-map")) continue;
      const cs = getComputedStyle(el);
      const r = el.getBoundingClientRect();
      if (!r.width || cs.visibility === "hidden" || Number(cs.opacity) === 0) continue;
      const size = parseFloat(cs.fontSize);
      if (size < 11) out.push({ size, text: n.textContent.trim().slice(0, 30), tag: el.tagName.toLowerCase() });
    }
    return out;
  });
}

async function scan(page) {
  const res = await new AxeBuilder({ page }).withTags(TAGS).exclude(".maplibregl-canvas").analyze();
  return res.violations.map((v) => ({
    id: v.id,
    impact: v.impact,
    help: v.help,
    nodes: v.nodes.map((n) => ({ target: n.target.join(" "), summary: n.failureSummary?.split("\n").slice(1, 3).join(" ").trim(), html: n.html.slice(0, 140) })),
  }));
}

const jobs = [];
for (const theme of THEMES)
  for (const [vpName, vp] of Object.entries(VIEWPORTS))
    for (const scenario of SCENARIOS) for (const path of PAGES) jobs.push({ theme, vpName, vp, scenario, path });

const results = [];
let done = 0;
async function worker() {
  while (jobs.length) {
    const j = jobs.shift();
    const { ctx, page } = await openPage(j.theme, j.vp);
    const url = `${BASE}${j.path}?scenario=${j.scenario}`;
    try {
      await page.goto(url, { waitUntil: "domcontentloaded" });
      await ready(page);
      results.push({ ...j, vp: undefined, url, violations: await scan(page), small: await legibility(page) });
    } catch (e) {
      results.push({ ...j, vp: undefined, url, error: String(e.message).slice(0, 200) });
    } finally {
      await ctx.close();
      if (++done % 24 === 0) console.error(`  ${done} pages scanned…`);
    }
  }
}
await Promise.all(Array.from({ length: CONCURRENCY }, worker));

// Overlay states: utility sheet, evidence drawer, map layer sheet, hour detail sheet.
const overlays = [];
for (const theme of THEMES)
  for (const [vpName, vp] of Object.entries(VIEWPORTS)) {
    const cases = [
      { name: "settings sheet", path: "/?scenario=rain", open: async (p) => p.getByRole("button", { name: vpName === "desktop" ? "Settings" : "Open menu" }).click() },
      { name: "evidence drawer", path: "/?scenario=rain", open: async (p) => p.getByRole("button", { name: /confidence/i }).first().click() },
      { name: "alerts evidence", path: "/alerts?scenario=severe", open: async (p) => p.getByRole("button", { name: /confidence/i }).first().click() },
      ...(vpName !== "desktop" ? [{ name: "map layers sheet", path: "/maps?scenario=route", open: async (p) => p.getByRole("button", { name: /Layers & info/ }).click() }] : []),
    ];
    for (const c of cases) {
      const { ctx, page } = await openPage(theme, vp);
      try {
        await page.goto(`${BASE}${c.path}`, { waitUntil: "domcontentloaded" });
        await ready(page);
        await c.open(page);
        await page.waitForSelector("dialog[open]", { timeout: 5000 });
        await page.waitForTimeout(400);
        const res = await new AxeBuilder({ page }).withTags(TAGS).include("dialog[open]").analyze();
        overlays.push({ theme, vpName, name: c.name, violations: res.violations.map((v) => ({ id: v.id, impact: v.impact, nodes: v.nodes.map((n) => n.target.join(" ")) })) });
      } catch (e) {
        overlays.push({ theme, vpName, name: c.name, error: String(e.message).slice(0, 160) });
      }
      await ctx.close();
    }
  }

// Reflow (WCAG 1.4.10): no horizontal scrolling at 320 CSS px.
const reflow = [];
for (const theme of ["light"])
  for (const path of PAGES) {
    const { ctx, page } = await openPage(theme, { width: 320, height: 640 });
    await page.goto(`${BASE}${path}?scenario=route`, { waitUntil: "domcontentloaded" });
    await ready(page).catch(() => {});
    const o = await page.evaluate(() => ({ sw: document.documentElement.scrollWidth, cw: document.documentElement.clientWidth }));
    reflow.push({ path, ...o, overflow: o.sw > o.cw + 1 });
    await ctx.close();
  }

await browser.close();

// ---------- summary ----------
const byRule = new Map();
for (const r of results)
  for (const v of r.violations ?? []) {
    const k = v.id;
    const e = byRule.get(k) ?? { id: k, impact: v.impact, help: v.help, pages: 0, samples: new Map() };
    e.pages++;
    for (const n of v.nodes) {
      const key = `${n.target}`;
      if (!e.samples.has(key)) e.samples.set(key, { where: `${r.theme}/${r.vpName}/${r.scenario}${r.path}`, ...n });
    }
    byRule.set(k, e);
  }
const small = new Map();
for (const r of results) for (const s of r.small ?? []) small.set(`${s.size}px ${s.tag} "${s.text}"`, (small.get(`${s.size}px ${s.tag} "${s.text}"`) ?? 0) + 1);

const summary = {
  scanned: results.length,
  errors: results.filter((r) => r.error).map((r) => `${r.url} [${r.theme}/${r.vpName}] ${r.error}`),
  cleanPages: results.filter((r) => !r.error && !r.violations.length).length,
  rules: [...byRule.values()].map((e) => ({ ...e, samples: [...e.samples.values()].slice(0, 8), uniqueNodes: e.samples.size })),
  overlays,
  reflow,
  smallText: [...small.entries()].sort((a, b) => b[1] - a[1]).slice(0, 40),
};
const out = process.env.QA_OUT ?? "a11y-report.json";
writeFileSync(out, JSON.stringify({ summary, results }, null, 2));
console.log(JSON.stringify(summary, null, 2));
