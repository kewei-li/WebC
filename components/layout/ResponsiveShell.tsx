import { SiteHeader } from "./SiteHeader";

export function ResponsiveShell({ children }: { children: React.ReactNode }) {
  return (
    <>
      <a href="#main" className="sr-only focus:not-sr-only focus:fixed focus:left-4 focus:top-4 focus:z-50 focus:rounded-lg focus:bg-ink focus:px-3 focus:py-2 focus:text-paper">
        Skip to content
      </a>
      <SiteHeader />
      <main id="main" className="mx-auto w-full max-w-[1600px] flex-1 px-4 py-5 sm:px-6 sm:py-7 wide:px-10">
        {children}
      </main>
      <footer className="mx-auto w-full max-w-[1600px] px-4 pb-8 text-xs text-ink-3 sm:px-6 wide:px-10">
        Data: National Weather Service (api.weather.gov) · Radar: NOAA/NCEP MRMS · Basemap © OpenFreeMap, © OpenMapTiles, © OpenStreetMap contributors. Prototype — interpretations are derived, official NWS language is authoritative.
      </footer>
    </>
  );
}
