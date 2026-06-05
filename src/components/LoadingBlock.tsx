/**
 * Shared loading fallback for lazily-loaded (code-split) components. Used as the
 * `loading` state for next/dynamic imports across the suite so every deferred
 * view fades in behind the same branded spinner.
 */
export default function LoadingBlock({ label }: { label?: string }) {
  return (
    <div
      role="status"
      aria-live="polite"
      className="flex flex-col items-center justify-center gap-4 py-24 text-center"
    >
      <div className="h-10 w-10 animate-spin rounded-full border-2 border-[var(--line)] border-t-gold" />
      <p className="text-sm text-muted">{label ?? "Loading…"}</p>
    </div>
  );
}
