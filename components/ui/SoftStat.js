"use client";

/** Compact stat tile used in page summary sections (Attendance-style). */
export function SoftStat({ label, value, color }) {
  return (
    <div
      className="rounded-lg border border-[var(--border)] bg-[var(--panel-soft)] px-2.5 py-1.5"
      style={
        color
          ? {
              borderColor: `${color}33`,
              backgroundColor: `${color}14`,
            }
          : undefined
      }
    >
      <p className="text-[9px] font-semibold uppercase tracking-wide text-[var(--muted)]">
        {label}
      </p>
      <p
        className="mt-0.5 truncate text-[15px] font-bold tabular-nums leading-tight text-[var(--text)]"
        style={color ? { color } : undefined}
        title={value != null ? String(value) : undefined}
      >
        {value ?? "—"}
      </p>
    </div>
  );
}

export const SUMMARY_GRID_CLASS =
  "grid grid-cols-2 gap-1.5 sm:grid-cols-3 lg:grid-cols-4 xl:grid-cols-5";
