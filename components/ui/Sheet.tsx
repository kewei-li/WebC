"use client";

import { X } from "lucide-react";
import { useEffect, useRef } from "react";

/** Accessible sheet built on <dialog>: right panel on desktop, bottom sheet on narrow web. */
export function Sheet({
  open,
  onClose,
  title,
  children,
  side = "right",
}: {
  open: boolean;
  onClose: () => void;
  title: string;
  children: React.ReactNode;
  side?: "right" | "left";
}) {
  const ref = useRef<HTMLDialogElement>(null);
  useEffect(() => {
    const d = ref.current;
    if (!d) return;
    if (open && !d.open) d.showModal();
    if (!open && d.open) d.close();
  }, [open]);
  return (
    <dialog
      ref={ref}
      onClose={onClose}
      onClick={(e) => e.target === ref.current && onClose()}
      aria-label={title}
      className={`m-0 mt-auto w-full max-w-none max-h-[85vh] rounded-t-3xl border border-line bg-surface p-0 text-ink shadow-2xl
        sm:mt-0 sm:h-full sm:max-h-none sm:w-[420px] sm:rounded-none ${side === "right" ? "sm:ml-auto" : "sm:mr-auto"}`}
    >
      <div className="sticky top-0 z-10 flex items-center justify-between border-b border-line bg-surface px-5 py-4">
        <h2 className="text-base font-semibold">{title}</h2>
        <button onClick={onClose} className="grid size-9 place-items-center rounded-full hover:bg-surface-2" aria-label="Close">
          <X size={18} />
        </button>
      </div>
      <div className="px-5 py-5">{children}</div>
    </dialog>
  );
}
