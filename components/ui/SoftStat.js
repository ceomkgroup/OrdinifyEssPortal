"use client";

/** Compact stat tile used in page summary sections (Attendance-style). */
export function SoftStat({ label, value, color }) {
  return (
    <div
      className="rounded-xl border border-[var(--border)] bg-[var(--panel-soft)] px-3 py-3"
      style={
        color
          ? {
              borderColor: `${color}33`,
              backgroundColor: `${color}14`,
            }
          : undefined
      }
    >
      <p className="text-[10px] font-semibold uppercase tracking-wide text-[var(--muted)]">
        {label}
      </p>
      <p
        className="mt-1 truncate text-[16px] font-bold tabular-nums leading-tight text-[var(--text)]"
        style={color ? { color } : undefined}
        title={value != null ? String(value) : undefined}
      >
        {value ?? "—"}
      </p>
    </div>
  );
}

export const SUMMARY_GRID_CLASS =
  "grid grid-cols-2 gap-2.5 sm:grid-cols-4 lg:grid-cols-5";
