"use client";

import { MuiDateRangeFields } from "@/components/ui/MuiDateField";
import { useCompanySettings } from "@/hooks/useCompanySettings";

/** Attendance-style date range block for filter drawers. */
export function FilterDrawerDateRange({
  from,
  to,
  onFromChange,
  onToChange,
  title = "Date range",
  hint = "Apply uses these dates for the list.",
  clearable = true,
  dateFormat,
  className = "",
}) {
  const { settings } = useCompanySettings();
  const pickerFormat = dateFormat || settings.dateFormat || "DD/MM/YYYY";
  const hasDates = Boolean(from || to);

  return (
    <div
      className={`space-y-2.5 rounded-xl border border-[var(--border)] bg-[var(--panel-soft)]/60 p-3 ${className}`}
    >
      <div className="flex items-center justify-between gap-2">
        <p className="text-[11px] font-semibold uppercase tracking-wide text-[var(--muted)]">
          {title}
        </p>
        {hasDates && clearable ? (
          <button
            type="button"
            onClick={() => {
              onFromChange?.("");
              onToChange?.("");
            }}
            className="text-[11px] font-medium text-[var(--violet)] hover:underline"
          >
            Clear dates
          </button>
        ) : null}
      </div>
      <MuiDateRangeFields
        from={from}
        to={to}
        onFromChange={onFromChange}
        onToChange={onToChange}
        clearable={clearable}
        dateFormat={pickerFormat}
      />
      {hint ? (
        <p className="text-[11px] leading-relaxed text-[var(--muted)]">{hint}</p>
      ) : null}
    </div>
  );
}
