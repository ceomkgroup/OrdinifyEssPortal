"use client";

import { CalendarDays } from "lucide-react";

/**
 * Attendance-style header pill (date range, FY, calendar year).
 */
export function MetaBadge({
  icon: Icon = CalendarDays,
  children,
  className = "",
}) {
  if (children == null || children === false) return null;
  return (
    <span
      className={`inline-flex items-center gap-1.5 rounded-full border border-[var(--violet)]/15 bg-[var(--lavender-soft)] px-2.5 py-1 text-[12px] font-semibold tabular-nums text-[var(--violet)] ${className}`}
    >
      {Icon ? (
        <Icon className="h-3.5 w-3.5 shrink-0 opacity-80" strokeWidth={2} />
      ) : null}
      {children}
    </span>
  );
}
