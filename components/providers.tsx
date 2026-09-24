"use client";

import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { createContext, useContext, useState, useSyncExternalStore } from "react";
import { fToC } from "@/lib/weather-primitives";

type Units = "F" | "C";
let memoryUnits: Units = "F"; // fallback when storage is blocked
function readUnits(): Units {
  try {
    const u = localStorage.getItem("units");
    if (u === "C" || u === "F") return u;
  } catch {}
  return memoryUnits;
}
const UnitsCtx = createContext<{ units: Units; setUnits: (u: Units) => void }>({ units: "F", setUnits: () => {} });

export function Providers({ children }: { children: React.ReactNode }) {
  const [client] = useState(
    () => new QueryClient({ defaultOptions: { queries: { refetchOnWindowFocus: true, retry: 1 } } }),
  );
  const units = useSyncExternalStore(
    (cb) => {
      window.addEventListener("units-change", cb);
      window.addEventListener("storage", cb);
      return () => {
        window.removeEventListener("units-change", cb);
        window.removeEventListener("storage", cb);
      };
    },
    readUnits,
    () => "F" as Units,
  );
  const setUnits = (u: Units) => {
    try {
      localStorage.setItem("units", u);
    } catch {}
    memoryUnits = u;
    window.dispatchEvent(new Event("units-change"));
  };
  return (
    <QueryClientProvider client={client}>
      <UnitsCtx.Provider value={{ units, setUnits }}>{children}</UnitsCtx.Provider>
    </QueryClientProvider>
  );
}

export function useUnits() {
  const { units, setUnits } = useContext(UnitsCtx);
  const temp = (f: number | null | undefined) => (f == null ? "—" : `${Math.round(units === "F" ? f : fToC(f))}°`);
  return { units, setUnits, temp };
}
