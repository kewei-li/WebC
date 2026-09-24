import type { Confidence } from "@/lib/editorial-rules";

const STYLE = {
  high: { cls: "bg-ok-soft text-ok", bars: 3, label: "High confidence" },
  medium: { cls: "bg-surface-2 text-ink-2", bars: 2, label: "Medium confidence" },
  low: { cls: "bg-heat-soft text-heat", bars: 1, label: "Low confidence" },
};

/** Level is conveyed by text + bar count, never by color alone. */
export function ConfidenceBadge({ confidence, onClick }: { confidence: Confidence; onClick?: () => void }) {
  const s = STYLE[confidence.level];
  const inner = (
    <>
      <span className="flex items-end gap-[2px]" aria-hidden>
        {[1, 2, 3].map((i) => (
          <span key={i} className={`w-[3px] rounded-sm ${i <= s.bars ? "bg-current" : "bg-current opacity-25"}`} style={{ height: 4 + i * 3 }} />
        ))}
      </span>
      {s.label}
    </>
  );
  const cls = `inline-flex items-center gap-1.5 rounded-full px-2.5 py-1 text-xs font-medium ${s.cls}`;
  return onClick ? (
    <button onClick={onClick} className={`${cls} hover:ring-1 hover:ring-current`} title={confidence.reason}>
      {inner}
      <span className="sr-only">. {confidence.reason}. Show evidence</span>
    </button>
  ) : (
    <span className={cls} title={confidence.reason}>
      {inner}
    </span>
  );
}
