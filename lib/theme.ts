"use client";

import { useSyncExternalStore } from "react";

export type ThemePref = "system" | "light" | "dark";
const KEY = "theme";
const EVENT = "theme-change";
const MQ = "(prefers-color-scheme: dark)";

/** Runs in <head> before first paint (see app/layout.tsx) so there is no theme flash. */
export const THEME_BOOT_SCRIPT = `(function(){try{var t=localStorage.getItem("${KEY}");if(t==="light"||t==="dark")document.documentElement.setAttribute("data-theme",t)}catch(e){}})()`;

function readPref(): ThemePref {
  const t = document.documentElement.getAttribute("data-theme");
  return t === "light" || t === "dark" ? t : "system";
}

function subscribe(cb: () => void) {
  const m = window.matchMedia(MQ);
  m.addEventListener("change", cb);
  window.addEventListener(EVENT, cb);
  return () => {
    m.removeEventListener("change", cb);
    window.removeEventListener(EVENT, cb);
  };
}

export function setThemePref(pref: ThemePref) {
  const root = document.documentElement;
  if (pref === "system") root.removeAttribute("data-theme");
  else root.setAttribute("data-theme", pref);
  try {
    if (pref === "system") localStorage.removeItem(KEY);
    else localStorage.setItem(KEY, pref);
  } catch {}
  window.dispatchEvent(new Event(EVENT));
}

export function useThemePref(): ThemePref {
  return useSyncExternalStore(subscribe, readPref, () => "system");
}

/** The theme actually on screen — use this for canvas/WebGL content (charts, map basemap). */
export function useResolvedTheme(): "light" | "dark" {
  return useSyncExternalStore(
    subscribe,
    () => {
      const p = readPref();
      return p === "system" ? (window.matchMedia(MQ).matches ? "dark" : "light") : p;
    },
    () => "light",
  );
}
