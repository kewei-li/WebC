/** Contextual right rail. Stacks under main content below 1024px. */
export function DesktopRail({ children, label = "Context" }: { children: React.ReactNode; label?: string }) {
  return (
    <aside aria-label={label} className="flex flex-col gap-4 lg:sticky lg:top-24 lg:self-start">
      {children}
    </aside>
  );
}
