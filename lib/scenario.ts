"use client";

import { useSearchParams } from "next/navigation";
import { useEffect, useSyncExternalStore } from "react";
import type { ScenarioId } from "./weather-primitives";

const IDS: ScenarioId[] = ["calm", "rain", "severe", "calendar", "route", "uncertain"];
const KEY = "scenario";
const EVENT = "scenario-change";
let memory: ScenarioId | null = null; // fallback when sessionStorage is blocked

export const asScenario = (v: string | null | undefined): ScenarioId | null => (v && (IDS as string[]).includes(v) ? (v as ScenarioId) : null);

function read(): ScenarioId | null {
  try {
    return asScenario(sessionStorage.getItem(KEY));
  } catch {
    return memory;
  }
}

export function setStoredScenario(id: ScenarioId | null) {
  memory = id;
  try {
    if (id) sessionStorage.setItem(KEY, id);
    else sessionStorage.removeItem(KEY);
  } catch {}
  window.dispatchEvent(new Event(EVENT));
}

/**
 * Active scenario: `?scenario=` wins and is remembered for this tab, so it carries across
 * pages without every link needing the parameter. `?scenario=live` returns to NWS data.
 */
export function useScenario(): ScenarioId | null {
  const params = useSearchParams();
  const fromUrl = params.get("scenario");
  const stored = useSyncExternalStore(
    (cb) => {
      window.addEventListener(EVENT, cb);
      return () => window.removeEventListener(EVENT, cb);
    },
    read,
    () => null,
  );
  useEffect(() => {
    if (fromUrl === "live") setStoredScenario(null);
    else if (asScenario(fromUrl) && fromUrl !== stored) setStoredScenario(asScenario(fromUrl));
  }, [fromUrl, stored]);
  if (fromUrl === "live") return null;
  return asScenario(fromUrl) ?? stored;
}
