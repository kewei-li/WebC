"use client";

import { Sheet } from "@/components/ui/Sheet";
import type { Confidence } from "@/lib/editorial-rules";
import { ConfidenceBadge } from "./ConfidenceBadge";

export type Evidence = {
  title: string;
  confidence?: Confidence;
  facts?: { label: string; value: string }[];
  sources?: { label: string; url?: string; updatedAt?: number | null }[];
  note?: string;
};

export function EvidenceDrawer({ evidence, onClose }: { evidence: Evidence | null; onClose: () => void }) {
  return (
    <Sheet open={!!evidence} onClose={onClose} title={evidence?.title ?? "Evidence"}>
      {evidence && (
        <div className="space-y-6 text-sm">
          {evidence.confidence && (
            <section className="space-y-3">
              <ConfidenceBadge confidence={evidence.confidence} />
              <p className="text-ink-2">{evidence.confidence.reason}.</p>
              <ul className="space-y-1.5">
                {evidence.confidence.evidence.map((e) => (
                  <li key={e} className="flex gap-2 text-ink-2">
                    <span className="mt-2 size-1 shrink-0 rounded-full bg-ink-3" />
                    {e}
                  </li>
                ))}
              </ul>
            </section>
          )}
          {evidence.facts && (
            <section>
              <h3 className="eyebrow mb-2">Values used</h3>
              <dl className="divide-y divide-line rounded-xl border border-line">
                {evidence.facts.map((f) => (
                  <div key={f.label} className="flex justify-between gap-4 px-3 py-2">
                    <dt className="text-ink-2">{f.label}</dt>
                    <dd className="tnum text-right font-medium">{f.value}</dd>
                  </div>
                ))}
              </dl>
            </section>
          )}
          {evidence.sources && (
            <section>
              <h3 className="eyebrow mb-2">Sources</h3>
              <ul className="space-y-2">
                {evidence.sources.map((s) => (
                  <li key={s.label} className="text-ink-2">
                    {s.url ? (
                      <a className="underline decoration-line-strong underline-offset-2 hover:text-accent" href={s.url} target="_blank" rel="noreferrer">
                        {s.label}
                      </a>
                    ) : (
                      s.label
                    )}
                    {s.updatedAt && <span className="text-ink-3"> · updated {new Date(s.updatedAt).toLocaleTimeString([], { hour: "numeric", minute: "2-digit" })}</span>}
                  </li>
                ))}
              </ul>
            </section>
          )}
          {evidence.note && <p className="rounded-xl bg-surface-2 p-3 text-xs text-ink-2">{evidence.note}</p>}
        </div>
      )}
    </Sheet>
  );
}
