// Map layer catalogue + tile endpoints. All weather layers are NOAA/NWS sources.

export type LayerId = "radar" | "alerts" | "route";

export const LAYERS: { id: LayerId; label: string; description: string; source: string }[] = [
  { id: "radar", label: "Radar", description: "Base reflectivity mosaic (MRMS), ~2 min updates", source: "NOAA/NCEP MRMS via opengeo.ncep.noaa.gov" },
  { id: "alerts", label: "Warnings", description: "Active NWS warning & advisory polygons in Florida", source: "api.weather.gov/alerts" },
  { id: "route", label: "Route", description: "Your drive, coloured by rain risk at the time you pass", source: "Scenario route file" },
];

export const radarTiles = (time?: string) =>
  `https://opengeo.ncep.noaa.gov/geoserver/conus/conus_bref_qcd/ows?service=WMS&version=1.1.1&request=GetMap&layers=conus_bref_qcd&styles=&srs=EPSG:3857&bbox={bbox-epsg-3857}&width=256&height=256&format=image/png&transparent=true${
    time ? `&time=${encodeURIComponent(time)}` : ""
  }`;

// OpenFreeMap vector basemaps (no key). Weather layers are inserted beneath the first label layer.
export const basemapStyle = (dark: boolean) => `https://tiles.openfreemap.org/styles/${dark ? "dark" : "positron"}`;

// NWS reflectivity colour ramp (dBZ) for the legend.
export const DBZ_LEGEND = [
  { dbz: 5, color: "#04e9e7", label: "Light" },
  { dbz: 20, color: "#019ff4", label: "" },
  { dbz: 30, color: "#02fd02", label: "Moderate" },
  { dbz: 40, color: "#fdf802", label: "" },
  { dbz: 45, color: "#fd9500", label: "Heavy" },
  { dbz: 55, color: "#fd0000", label: "" },
  { dbz: 65, color: "#bc0000", label: "Extreme" },
];
