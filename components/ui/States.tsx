"use client";

import { AlertTriangle, RefreshCw } from "lucide-react";

export function LoadingBlock({ className = "h-40" }: { className?: string }) {
  return <div className={`skeleton ${className}`} aria-hidden />;
}

export function PageLoading() {
  return (
    <div className="space-y-4" role="status" aria-live="polite">
      <span className="sr-only">Loading National Weather Service data…</span>
      <LoadingBlock className="h-44" />
      <div className="grid gap-4 lg:grid-cols-3">
        <LoadingBlock className="h-64 lg:col-span-2" />
        <LoadingBlock className="h-64" />
      </div>
    </div>
  );
}

export function Unavailable({ message, onRetry }: { message: string; onRetry?: () => void }) {
  return (
    <div role="alert" className="card flex flex-col items-start gap-3 p-6">
      <div className="flex items-center gap-2 font-semibold">
        <AlertTriangle size={18} className="text-warn" /> Weather data unavailable
      </div>
      <p className="text-sm text-ink-2">
        The National Weather Service could not be reached ({message}). Nothing shown here is a guess — try again in a moment.
      </p>
      {onRetry && (
        <button onClick={onRetry} className="inline-flex items-center gap-2 rounded-full border border-line-strong px-4 py-2 text-sm hover:bg-surface-2">
          <RefreshCw size={14} /> Retry
        </button>
      )}
    </div>
  );
}

export function StaleNotice({ fetchedAt }: { fetchedAt: number }) {
  return (
    <div role="status" className="flex items-center gap-2 rounded-xl border border-heat/40 bg-heat-soft px-3 py-2 text-sm text-heat">
      <AlertTriangle size={14} /> Showing data from {new Date(fetchedAt).toLocaleTimeString([], { hour: "numeric", minute: "2-digit" })} — refresh pending.
    </div>
  );
}
