"use client";

import { Bell, Crown, FlaskConical, MapPin, Menu, Search, Settings, Star, X } from "lucide-react";
import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import { useEffect, useRef, useState } from "react";
import { useUnits } from "@/components/providers";
import { setStoredScenario, useScenario } from "@/lib/scenario";
import { useWeather } from "@/lib/use-weather";
import { ThemeToggle } from "./ThemeToggle";
import { UtilitySheet, type UtilityTab } from "./UtilitySheet";

export const PRIMARY_NAV = [
  { href: "/", label: "Home" },
  { href: "/hourly", label: "Hourly" },
  { href: "/daily", label: "Daily" },
  { href: "/maps", label: "Maps" },
] as const;

export function SiteHeader() {
  const path = usePathname();
  const { data } = useWeather();
  const { temp } = useUnits();
  const [sheet, setSheet] = useState<UtilityTab | null>(null);
  const scenario = useScenario();
  const router = useRouter();
  const alertCount = data?.alerts.length ?? 0;
  // Keep the scenario visible in shareable URLs for primary destinations.
  const withScenario = (href: string) => (scenario ? `${href}?scenario=${scenario}` : href);
  const headerRef = useRef<HTMLElement>(null);
  // Publish the header height so full-bleed pages (Maps) can fill exactly the remaining viewport.
  useEffect(() => {
    const el = headerRef.current;
    if (!el) return;
    const publish = () => document.documentElement.style.setProperty("--header-h", `${el.offsetHeight}px`);
    publish();
    const ro = new ResizeObserver(publish);
    ro.observe(el);
    return () => ro.disconnect();
  }, [scenario, data?.scenario]);
  const active = (href: string) => (href === "/" ? path === "/" : path.startsWith(href));

  const iconBtn = "grid size-10 place-items-center rounded-full text-ink-2 hover:bg-surface-2 hover:text-ink";

  return (
    <header ref={headerRef} className="sticky top-0 z-40 border-b border-line bg-paper/90 backdrop-blur supports-[backdrop-filter]:bg-paper/75">
      <div className="mx-auto flex h-16 max-w-[1600px] items-center gap-3 px-4 sm:px-6 wide:px-10">
        <Link href="/" className="flex items-baseline gap-1.5 font-serif text-[1.35rem] leading-none tracking-tight">
          Forecast<span className="text-accent">.</span>
        </Link>
        <button
          onClick={() => setSheet("search")}
          className="ml-1 hidden items-center gap-1.5 rounded-full border border-line bg-surface px-3 py-1.5 text-sm text-ink-2 hover:border-line-strong sm:inline-flex"
        >
          <MapPin size={14} className="text-accent" />
          {data?.location.name ?? "Miami, FL"}
          {data?.current && <span className="tnum text-ink">· {temp(data.current.tempF)}</span>}
        </button>

        <nav aria-label="Primary" className="mx-auto hidden md:block">
          <ul className="flex items-center gap-1 rounded-full border border-line bg-surface p-1">
            {PRIMARY_NAV.map((n) => (
              <li key={n.href}>
                <Link
                  href={withScenario(n.href)}
                  aria-current={active(n.href) ? "page" : undefined}
                  className={`block rounded-full px-4 py-1.5 text-sm font-medium transition-colors ${
                    active(n.href) ? "bg-ink text-paper" : "text-ink-2 hover:text-ink"
                  }`}
                >
                  {n.label}
                </Link>
              </li>
            ))}
          </ul>
        </nav>

        <div className="ml-auto flex items-center gap-0.5 md:ml-0">
          <button className={`${iconBtn} hidden lg:grid`} aria-label="Search locations" onClick={() => setSheet("search")}>
            <Search size={18} />
          </button>
          <Link href="/alerts" className={`${iconBtn} relative`} aria-label={`Alerts, ${alertCount} active for your location`}>
            <Bell size={18} />
            {alertCount > 0 && (
              <span className="absolute right-1.5 top-1.5 grid min-w-4 place-items-center rounded-full bg-warn px-1 text-[11px] font-bold text-paper">
                {alertCount}
              </span>
            )}
          </Link>
          <button className={`${iconBtn} hidden lg:grid`} aria-label="Saved locations" onClick={() => setSheet("saved")}>
            <Star size={18} />
          </button>
          <ThemeToggle className={iconBtn} />
          <button className={`${iconBtn} hidden lg:grid`} aria-label="Settings" onClick={() => setSheet("settings")}>
            <Settings size={18} />
          </button>
          <button
            onClick={() => setSheet("account")}
            className="ml-1 hidden items-center gap-1.5 rounded-full bg-ink px-3.5 py-1.5 text-sm font-medium text-paper lg:inline-flex"
          >
            <Crown size={14} /> Premium
          </button>
          <button className={`${iconBtn} lg:hidden`} aria-label="Open menu" onClick={() => setSheet("search")}>
            <Menu size={20} />
          </button>
        </div>
      </div>

      {/* Narrow web keeps all four primary destinations visible. */}
      <nav aria-label="Primary" className="border-t border-line px-3 pb-2 pt-2 md:hidden">
        <ul className="grid grid-cols-4 gap-1 rounded-full border border-line bg-surface p-1">
          {PRIMARY_NAV.map((n) => (
            <li key={n.href}>
              <Link
                href={withScenario(n.href)}
                aria-current={active(n.href) ? "page" : undefined}
                className={`block rounded-full py-2 text-center text-sm font-medium ${active(n.href) ? "bg-ink text-paper" : "text-ink-2"}`}
              >
                {n.label}
              </Link>
            </li>
          ))}
        </ul>
      </nav>

      {scenario && data?.scenario && (
        <div role="status" className="border-t border-storm/30 bg-storm-soft text-storm">
          <div className="mx-auto flex max-w-[1600px] items-center gap-2 px-4 py-1.5 text-xs sm:px-6 sm:text-sm wide:px-10">
            <FlaskConical size={14} aria-hidden />
            <span className="min-w-0 flex-1 truncate">
              <b>Scenario: {data.scenario.label}</b>
              <span className="hidden sm:inline"> — simulated data, not a real forecast. {data.scenario.description}</span>
            </span>
            <button
              onClick={() => {
                setStoredScenario(null);
                router.replace(`${path}?scenario=live`, { scroll: false });
              }}
              className="inline-flex shrink-0 items-center gap-1 rounded-full border border-storm/40 px-2.5 py-0.5 font-medium hover:bg-surface"
            >
              <X size={12} aria-hidden /> Back to live
            </button>
          </div>
        </div>
      )}

      <UtilitySheet tab={sheet} onTab={setSheet} onClose={() => setSheet(null)} />
    </header>
  );
}
