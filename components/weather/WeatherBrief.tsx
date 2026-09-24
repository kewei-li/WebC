import type { Editorial } from "@/lib/editorial-rules";

export function WeatherBrief({ editorial }: { editorial: Editorial }) {
  return (
    <div className="flex flex-col justify-end">
      <p className="eyebrow mb-2">Weather brief</p>
      <h1 className="font-serif text-[1.9rem] leading-[1.12] tracking-tight text-balance sm:text-[2.35rem]">{editorial.headline}</h1>
      {editorial.subline && <p className="mt-3 max-w-[60ch] text-[0.95rem] leading-relaxed text-ink-2 text-pretty">{editorial.subline}</p>}
    </div>
  );
}
