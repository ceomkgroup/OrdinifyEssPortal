"use client";

import { useEffect, useRef, useState } from "react";
import { ChevronDown, Loader2, Search, X } from "lucide-react";

export const REQUEST_STATUS_OPTIONS = [
  { value: "all", label: "All statuses" },
  { value: "pending", label: "Pending" },
  { value: "approved", label: "Approved" },
  { value: "cancelled", label: "Cancelled / Rejected" },
];

const SEARCH_DEBOUNCE_MS = 500;

/**
 * Shared select used across list hubs (Requests, Leave, Attendance…).
 */
export function FilterSelect({
  label,
  value,
  onChange,
  options,
  className = "",
  clearable = false,
  defaultValue = "all",
}) {
  const canClear = clearable && value != null && value !== defaultValue;

  return (
    <label className={`flex min-w-0 flex-col gap-1 ${className}`}>
      <span className="text-[11px] font-semibold uppercase tracking-wide text-[var(--muted)]">
        {label}
      </span>
      <div className="relative">
        <select
          value={value}
          onChange={(e) => onChange(e.target.value)}
          className={`h-10 w-full appearance-none rounded-xl border border-[var(--border)] bg-[var(--surface)] py-2 pl-3 text-[13px] font-semibold text-[var(--text)] outline-none transition focus:border-[var(--violet)] focus:ring-2 focus:ring-[var(--lavender-soft)] ${
            canClear ? "pr-16" : "pr-9"
          }`}
        >
          {options.map((item) => (
            <option key={item.value} value={item.value}>
              {item.label}
              {typeof item.count === "number" ? ` (${item.count})` : ""}
            </option>
          ))}
        </select>
        {canClear ? (
          <button
            type="button"
            aria-label={`Clear ${label}`}
            onClick={(e) => {
              e.preventDefault();
              onChange?.(defaultValue);
            }}
            className="absolute right-8 top-1/2 inline-flex h-6 w-6 -translate-y-1/2 items-center justify-center rounded-lg text-[var(--muted)] transition hover:bg-[var(--panel-soft)] hover:text-[var(--text)]"
          >
            <X className="h-3.5 w-3.5" />
          </button>
        ) : null}
        <ChevronDown className="pointer-events-none absolute right-3 top-1/2 h-4 w-4 -translate-y-1/2 text-[var(--muted)]" />
      </div>
    </label>
  );
}

/**
 * Date input with optional clear ✕ (matches FilterSelect look).
 */
export function FilterDate({
  label,
  value,
  onChange,
  min,
  max,
  clearable = false,
  defaultValue = "",
  className = "",
}) {
  const canClear =
    clearable && value != null && value !== "" && value !== defaultValue;

  return (
    <label className={`flex min-w-0 flex-col gap-1 ${className}`}>
      <span className="text-[11px] font-semibold uppercase tracking-wide text-[var(--muted)]">
        {label}
      </span>
      <div className="relative">
        <input
          type="date"
          value={value || ""}
          min={min || undefined}
          max={max || undefined}
          onChange={(e) => onChange?.(e.target.value)}
          className={`h-10 w-full rounded-xl border border-[var(--border)] bg-[var(--surface)] py-2 pl-3 text-[13px] font-semibold text-[var(--text)] outline-none transition focus:border-[var(--violet)] focus:ring-2 focus:ring-[var(--lavender-soft)] ${
            canClear ? "pr-10" : "pr-3"
          }`}
        />
        {canClear ? (
          <button
            type="button"
            aria-label={`Clear ${label}`}
            onClick={(e) => {
              e.preventDefault();
              onChange?.(defaultValue);
            }}
            className="absolute right-2 top-1/2 inline-flex h-6 w-6 -translate-y-1/2 items-center justify-center rounded-lg text-[var(--muted)] transition hover:bg-[var(--panel-soft)] hover:text-[var(--text)]"
          >
            <X className="h-3.5 w-3.5" />
          </button>
        ) : null}
      </div>
    </label>
  );
}

/**
 * Standard list toolbar: optional From/To → Search → Status → optional Type.
 * - Search debounced 500ms
 * - Clear icons when search / filters applied
 * - Busy state while debouncing or parent `loading`
 */
export function ListFiltersBar({
  search = "",
  onSearchChange,
  searchPlaceholder = "Search…",
  from,
  to,
  onFromChange,
  onToChange,
  fromDefault = "",
  toDefault = "",
  fromLabel = "From",
  toLabel = "To",
  range,
  onRangeChange,
  rangeOptions,
  rangeDefault = "30",
  rangeLabel = "Range",
  status,
  onStatusChange,
  statusOptions = REQUEST_STATUS_OPTIONS,
  statusDefault = "all",
  statusLabel = "Status",
  type,
  onTypeChange,
  typeOptions,
  typeLabel = "Type",
  typeDefault = "all",
  loading = false,
  onBusyChange,
  children,
  className = "",
}) {
  const hasDateRange =
    typeof onFromChange === "function" && typeof onToChange === "function";
  const hasRangePreset =
    Array.isArray(rangeOptions) && typeof onRangeChange === "function";
  const hasType =
    Array.isArray(typeOptions) && typeof onTypeChange === "function";
  const cols = hasDateRange
    ? "sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-6"
    : hasType
      ? "sm:grid-cols-2 lg:grid-cols-[minmax(0,1.4fr)_minmax(0,0.9fr)_minmax(0,0.9fr)]"
      : "sm:grid-cols-2";

  const [draft, setDraft] = useState(search || "");
  const [debouncing, setDebouncing] = useState(false);
  const [filterFlash, setFilterFlash] = useState(false);
  const flashTimer = useRef(null);
  const onSearchChangeRef = useRef(onSearchChange);
  onSearchChangeRef.current = onSearchChange;

  useEffect(() => {
    setDraft(search || "");
  }, [search]);

  useEffect(() => {
    const committed = search || "";
    if (draft === committed) {
      setDebouncing(false);
      return undefined;
    }
    setDebouncing(true);
    const timer = window.setTimeout(() => {
      onSearchChangeRef.current?.(draft);
      setDebouncing(false);
    }, SEARCH_DEBOUNCE_MS);
    return () => window.clearTimeout(timer);
  }, [draft, search]);

  const busy = Boolean(loading || debouncing || filterFlash);

  const onBusyChangeRef = useRef(onBusyChange);
  onBusyChangeRef.current = onBusyChange;

  useEffect(() => {
    onBusyChangeRef.current?.(busy);
  }, [busy]);

  useEffect(() => {
    return () => {
      if (flashTimer.current) window.clearTimeout(flashTimer.current);
    };
  }, []);

  function flashFilterBusy() {
    setFilterFlash(true);
    if (flashTimer.current) window.clearTimeout(flashTimer.current);
    flashTimer.current = window.setTimeout(() => {
      setFilterFlash(false);
    }, 350);
  }

  function handleStatusChange(next) {
    flashFilterBusy();
    onStatusChange?.(next);
  }

  function handleTypeChange(next) {
    flashFilterBusy();
    onTypeChange?.(next);
  }

  function handleFromChange(next) {
    flashFilterBusy();
    onFromChange?.(next);
  }

  function handleToChange(next) {
    flashFilterBusy();
    onToChange?.(next);
  }

  function handleRangeChange(next) {
    flashFilterBusy();
    onRangeChange?.(next);
  }

  const hasSearch = Boolean(String(draft || "").trim());
  const hasStatus =
    status != null && status !== statusDefault && typeof onStatusChange === "function";
  const hasTypeFilter =
    hasType && type != null && type !== typeDefault;
  const hasFromFilter =
    hasDateRange && from != null && from !== "" && from !== fromDefault;
  const hasToFilter =
    hasDateRange && to != null && to !== "" && to !== toDefault;
  const hasRangeFilter =
    hasRangePreset && range != null && range !== rangeDefault;
  const hasAnyFilter =
    hasSearch ||
    hasStatus ||
    hasTypeFilter ||
    hasFromFilter ||
    hasToFilter ||
    hasRangeFilter;

  function clearSearch() {
    setDraft("");
    onSearchChange?.("");
    setDebouncing(false);
  }

  function clearAllFilters() {
    flashFilterBusy();
    setDraft("");
    onSearchChange?.("");
    setDebouncing(false);
    if (hasStatus) onStatusChange?.(statusDefault);
    if (hasTypeFilter) onTypeChange?.(typeDefault);
    if (hasDateRange) {
      onFromChange?.(fromDefault);
      onToChange?.(toDefault);
    }
    if (hasRangePreset) onRangeChange?.(rangeDefault);
  }

  return (
    <div className={`flex flex-col gap-2 ${className}`}>
      <div className={`grid grid-cols-1 gap-3 ${cols}`}>
        {hasDateRange ? (
          <>
            <FilterDate
              label={fromLabel}
              value={from}
              onChange={handleFromChange}
              max={to || undefined}
              clearable
              defaultValue={fromDefault}
            />
            <FilterDate
              label={toLabel}
              value={to}
              onChange={handleToChange}
              min={from || undefined}
              clearable
              defaultValue={toDefault}
            />
          </>
        ) : null}

        {hasRangePreset ? (
          <FilterSelect
            label={rangeLabel}
            value={range}
            onChange={handleRangeChange}
            options={rangeOptions}
            clearable
            defaultValue={rangeDefault}
          />
        ) : null}

        <label className="flex min-w-0 flex-col gap-1">
          <span className="text-[11px] font-semibold uppercase tracking-wide text-[var(--muted)]">
            Search
          </span>
          <div className="relative">
            <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-[var(--muted)]" />
            <input
              type="search"
              value={draft}
              onChange={(e) => setDraft(e.target.value)}
              placeholder={searchPlaceholder}
              className="h-10 w-full rounded-xl border border-[var(--border)] bg-[var(--surface)] py-2 pl-9 pr-10 text-[13px] text-[var(--text)] outline-none transition placeholder:text-[var(--muted)] focus:border-[var(--violet)] focus:ring-2 focus:ring-[var(--lavender-soft)] [&::-webkit-search-cancel-button]:hidden"
            />
            {debouncing || loading ? (
              <Loader2 className="absolute right-3 top-1/2 h-4 w-4 -translate-y-1/2 animate-spin text-[var(--violet)]" />
            ) : hasSearch ? (
              <button
                type="button"
                aria-label="Clear search"
                onClick={clearSearch}
                className="absolute right-2.5 top-1/2 inline-flex h-6 w-6 -translate-y-1/2 items-center justify-center rounded-lg text-[var(--muted)] transition hover:bg-[var(--panel-soft)] hover:text-[var(--text)]"
              >
                <X className="h-3.5 w-3.5" />
              </button>
            ) : null}
          </div>
        </label>

        {status != null && onStatusChange ? (
          <FilterSelect
            label={statusLabel}
            value={status}
            onChange={handleStatusChange}
            options={statusOptions}
            clearable
            defaultValue={statusDefault}
          />
        ) : null}

        {hasType ? (
          <FilterSelect
            label={typeLabel}
            value={type}
            onChange={handleTypeChange}
            options={typeOptions}
            clearable
            defaultValue={typeDefault}
          />
        ) : null}

        {children}
      </div>

      {hasAnyFilter || busy ? (
        <div className="flex flex-wrap items-center justify-between gap-2">
          <div className="flex min-h-[20px] items-center gap-2 text-[11px] text-[var(--muted)]">
            {busy ? (
              <>
                <Loader2 className="h-3.5 w-3.5 animate-spin text-[var(--violet)]" />
                <span>Updating results…</span>
              </>
            ) : hasAnyFilter ? (
              <span>Filters applied</span>
            ) : null}
          </div>
          {hasAnyFilter ? (
            <button
              type="button"
              onClick={clearAllFilters}
              className="inline-flex h-8 items-center gap-1.5 rounded-lg border border-[var(--border)] bg-[var(--surface)] px-2.5 text-[12px] font-semibold text-[var(--violet)] transition hover:bg-[var(--lavender-soft)]"
            >
              <X className="h-3.5 w-3.5" />
              Clear filters
            </button>
          ) : null}
        </div>
      ) : null}
    </div>
  );
}
