// Lists recent NOAA/NWS MRMS base-reflectivity frames (WMS time dimension)
// so the Maps timeline can play back the last ~2 hours.
export const dynamic = "force-dynamic";

const CAPS =
  "https://opengeo.ncep.noaa.gov/geoserver/conus/conus_bref_qcd/ows?service=WMS&version=1.3.0&request=GetCapabilities";

let cache: { at: number; frames: string[] } | null = null;

export async function GET() {
  if (cache && Date.now() - cache.at < 2 * 60_000) return Response.json({ frames: cache.frames });
  try {
    const xml = await fetch(CAPS, { cache: "no-store", signal: AbortSignal.timeout(10_000) }).then((r) => r.text());
    const dim = xml.match(/<Dimension name="time"[^>]*>([^<]+)<\/Dimension>/)?.[1] ?? "";
    const all = dim.split(",").map((s) => s.trim()).filter(Boolean);
    // Keep roughly one frame every 10 minutes over the last 2 hours.
    const picked: string[] = [];
    let last = Infinity;
    for (let i = all.length - 1; i >= 0 && picked.length < 12; i--) {
      const ts = Date.parse(all[i]);
      if (last - ts >= 9.5 * 60_000) {
        picked.unshift(all[i]);
        last = ts;
      }
    }
    cache = { at: Date.now(), frames: picked };
    return Response.json({ frames: picked });
  } catch (e) {
    return Response.json({ frames: [], error: String((e as Error).message) }, { status: 502 });
  }
}
