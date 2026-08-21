"use client";

import { resolveAttendanceTypeDisplay } from "@/lib/attendance-history";

/**
 * Shared attendance-type pill — uses live dropdown colors/labels.
 */
export function AttendanceTypeBadge({
  row,
  types = [],
  fallback = "—",
  className = "",
  showDot = true,
}) {
  const display = resolveAttendanceTypeDisplay(row, types);
  const label =
    display.label && display.label !== "—" ? display.label : fallback;
  const color = display.colorCode || "#a78af9";

  if (!label || label === "—") {
    return (
      <span className={`text-[12px] text-[var(--muted)] ${className}`}>—</span>
    );
  }

  return (
    <span
      className={`inline-flex w-fit items-center gap-1.5 rounded-full px-2.5 py-0.5 text-[11px] font-semibold capitalize ${className}`}
      style={{
        backgroundColor: `${color}22`,
        color,
      }}
    >
      {showDot ? (
        <span
          className="h-1.5 w-1.5 shrink-0 rounded-full"
          style={{ backgroundColor: color }}
          aria-hidden
        />
      ) : null}
      {label}
    </span>
  );
}
