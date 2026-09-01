"use client";

/** Fixed total count badge for list panel headers (all portal pages). */
export function PanelTotalCount({ count, label = "Total requests" }) {
  if (count == null) return null;

  return (
    <div className="inline-flex items-center gap-2.5 rounded-xl border border-[var(--border)] bg-[var(--panel-soft)] px-3 py-1.5">
      <span className="text-[11px] font-semibold uppercase tracking-wide text-[var(--muted)]">
        {label}
      </span>
      <span className="h-4 w-px shrink-0 bg-[var(--border)]" aria-hidden />
      <span className="min-w-[1.25rem] text-center text-[15px] font-bold tabular-nums leading-none text-[var(--violet)]">
        {count}
      </span>
    </div>
  );
}
