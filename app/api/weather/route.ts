import { getMiamiWeather } from "@/lib/nws";
import { buildScenario, isScenarioId } from "@/lib/scenario-data";

export const dynamic = "force-dynamic";

export async function GET(request: Request) {
  const params = new URL(request.url).searchParams;
  const scenario = params.get("scenario");
  // Scenario files are rebuilt per request so their timeline stays anchored to "now".
  if (isScenarioId(scenario)) return Response.json(buildScenario(scenario), { headers: { "Cache-Control": "no-store" } });
  try {
    const data = await getMiamiWeather(params.has("refresh"));
    return Response.json(data, { headers: { "Cache-Control": "no-store" } });
  } catch (e) {
    return Response.json(
      { error: "NWS data unavailable", detail: String((e as Error)?.message ?? e) },
      { status: 502 },
    );
  }
}
