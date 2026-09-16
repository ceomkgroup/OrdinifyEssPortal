"use client";

import { SearchableFilter } from "@/components/attendance/AttendanceStatusFilter";
import { FilterDrawerDateRange } from "@/components/ui/FilterDrawerDateRange";

export function KpiPeriodFilterFields({
  periodOptions = [],
  periodValue = "",
  onPeriodChange,
  defaultPeriodId = "",
  from = "",
  to = "",
  onFromChange,
  onToChange,
}) {
  return (
    <div className="space-y-5">
      {periodOptions.length ? (
        <SearchableFilter
          label="Month"
          value={periodValue}
          onChange={onPeriodChange}
          options={periodOptions}
          defaultValue={defaultPeriodId || periodOptions[0]?.value || ""}
        />
      ) : null}
      <FilterDrawerDateRange
        from={from}
        to={to}
        onFromChange={onFromChange}
        onToChange={onToChange}
        hint="Apply loads the KPI period covering these dates."
      />
    </div>
  );
}
