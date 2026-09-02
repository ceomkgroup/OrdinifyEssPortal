"use client";

import { useEffect, useRef, useState } from "react";
import { Download, Filter, RefreshCw, Search, X } from "lucide-react";
import { Button } from "@/components/ui/Button";
import { SlideOver } from "@/components/ui/SlideOver";
import { FilterSelect } from "@/components/ui/ListFilters";
import { REQUEST_STATUS_OPTIONS } from "@/components/ui/ListFilters";

/**
 * Attendance-style list toolbar:
 * left = tabs · right = count + search + export + filter + refresh
 */
export function ListToolbar({
  tabs,
  tab,
  onTabChange,
  recordCount,
  search = "",
  onSearchChange,
  searchPlaceholder = "Search…",
  /** Extra fields inside the filters drawer (type select, dates, etc.) */
  drawerFields,
  /** When true, filter icon stays highlighted */
  filterActive = false,
  /** Number of applied drawer filters — Clear shows when >= 1 */
  activeFilterCount,
  filterTitle = "Filters",
  filterSubtitle = "Narrow your list",
  onApplyFilters,
  onResetFilters,
  onRefresh,
  onExport,
  exporting = false,
  className = "",
  children,
}) {
  const [searchOpen, setSearchOpen] = useState(false);
  const [filterOpen, setFilterOpen] = useState(false);
  const [draft, setDraft] = useState(search || "");
  const inputRef = useRef(null);

  useEffect(() => {
    setDraft(search || "");
  }, [search]);

  useEffect(() => {
    if (searchOpen) {
      inputRef.current?.focus();
    }
  }, [searchOpen]);

  const tabItems = Array.isArray(tabs) && tabs.length > 0 ? tabs : [];
  const showTabs = tabItems.length > 0;

  const hasSearch = Boolean(String(draft || "").trim());
  const showSearch = typeof onSearchChange === "function";
  const showFilterBtn = typeof drawerFields !== "undefined" || filterActive;
  const showExport = typeof onExport === "function";
  const showRefresh = typeof onRefresh === "function";

  const filterCount =
    typeof activeFilterCount === "number"
      ? Math.max(0, activeFilterCount)
      : filterActive
        ? 1
        : 0;
  const canClearFilters =
    filterCount >= 1 && typeof onResetFilters === "function";

  function commitSearch(next) {
    setDraft(next);
    onSearchChange?.(next);
  }

  function applyDrawer() {
    onApplyFilters?.();
    setFilterOpen(false);
  }

  function clearFilters() {
    onResetFilters?.();
    setFilterOpen(false);
  }

  const iconBtn =
    "inline-flex h-7 w-7 shrink-0 items-center justify-center rounded-md border transition";
  const iconBtnIdle =
    "border-[var(--border)] text-[var(--muted)] hover:bg-[var(--panel-soft)] hover:text-[var(--violet)]";
  const iconBtnOn =
    "border-[var(--violet)] bg-[var(--lavender-soft)] text-[var(--violet)]";

  return (
    <>
      <div
        className={`flex min-w-0 items-center gap-2 border-b border-[var(--border)] px-4 py-1.5 ${className}`}
      >
        <div className="flex min-w-0 flex-1 items-center gap-1.5 overflow-x-auto [scrollbar-width:none] [&::-webkit-scrollbar]:hidden">
          {showTabs
            ? tabItems.map((item) => {
                const active = tab === item.value;
                return (
                  <button
                    key={item.value}
                    type="button"
                    onClick={() => onTabChange?.(item.value)}
                    className={`shrink-0 whitespace-nowrap rounded-md border px-2.5 py-1 text-[12px] font-medium leading-none transition ${
                      active
                        ? "border-[var(--violet)] bg-[var(--lavender-soft)] text-[var(--violet)]"
                        : "border-[var(--border)] bg-[var(--surface)] text-[var(--muted)] hover:border-[var(--violet)]/40 hover:text-[var(--text)]"
                    }`}
                  >
                    {item.label}
                  </button>
                );
              })
            : null}
        </div>

        <div className="flex shrink-0 items-center gap-1.5">
          {recordCount != null ? (
            <span className="hidden whitespace-nowrap text-[11px] text-[var(--muted)] sm:inline">
              {recordCount} records
            </span>
          ) : null}

          {showSearch ? (
            searchOpen ? (
              <div className="flex h-7 items-center gap-1 rounded-md border border-[var(--border)] bg-[var(--background)] px-1.5">
                <Search className="h-3.5 w-3.5 text-[var(--muted)]" />
                <input
                  ref={inputRef}
                  value={draft}
                  onChange={(e) => commitSearch(e.target.value)}
                  placeholder={searchPlaceholder}
                  className="h-7 w-32 bg-transparent text-[12px] text-[var(--text)] outline-none sm:w-44"
                />
                <button
                  type="button"
                  className="text-[var(--muted)] hover:text-[var(--text)]"
                  onClick={() => {
                    commitSearch("");
                    setSearchOpen(false);
                  }}
                  aria-label="Close search"
                >
                  <X className="h-3.5 w-3.5" />
                </button>
              </div>
            ) : (
              <button
                type="button"
                onClick={() => setSearchOpen(true)}
                className={`${iconBtn} ${hasSearch ? iconBtnOn : iconBtnIdle}`}
                aria-label="Search"
                title="Search"
              >
                <Search className="h-3.5 w-3.5" />
              </button>
            )
          ) : null}

          {showExport ? (
            <button
              type="button"
              disabled={exporting}
              onClick={onExport}
              className={`${iconBtn} ${iconBtnIdle} disabled:opacity-50`}
              aria-label="Export CSV"
              title="Export CSV"
            >
              <Download className="h-3.5 w-3.5" />
            </button>
          ) : null}

          {showFilterBtn ? (
            <button
              type="button"
              onClick={() => setFilterOpen(true)}
              className={`relative ${iconBtn} ${
                filterCount >= 1 ? iconBtnOn : iconBtnIdle
              }`}
              aria-label="Filters"
              title="Filters"
            >
              <Filter className="h-3.5 w-3.5" />
              {filterCount >= 1 ? (
                <span className="absolute -right-1 -top-1 flex h-3.5 min-w-3.5 items-center justify-center rounded-full bg-[var(--violet)] px-0.5 text-[8px] font-bold text-white">
                  {filterCount > 9 ? "9+" : filterCount}
                </span>
              ) : null}
            </button>
          ) : null}

          {canClearFilters ? (
            <button
              type="button"
              onClick={clearFilters}
              className="inline-flex h-7 items-center gap-1 rounded-md border border-[var(--border)] px-2 text-[11px] font-medium text-[var(--violet)] transition hover:bg-[var(--lavender-soft)]"
              title="Clear filters"
            >
              <X className="h-3 w-3" />
              Clear
              {filterCount > 1 ? (
                <span className="text-[var(--muted)]">({filterCount})</span>
              ) : null}
            </button>
          ) : null}

          {showRefresh ? (
            <button
              type="button"
              onClick={onRefresh}
              disabled={exporting}
              className="inline-flex h-7 items-center gap-1 rounded-md border border-[var(--border)] px-2 text-[11px] font-medium text-[var(--text)] transition hover:bg-[var(--panel-soft)] disabled:opacity-50"
            >
              <RefreshCw className="h-3.5 w-3.5" />
              Refresh
            </button>
          ) : null}

          {children}
        </div>
      </div>

      {showFilterBtn ? (
        <SlideOver
          open={filterOpen}
          onClose={() => setFilterOpen(false)}
          title={filterTitle}
          subtitle={
            filterCount >= 1
              ? `${filterCount} filter${filterCount === 1 ? "" : "s"} applied`
              : filterSubtitle
          }
          footer={
            <div className="grid grid-cols-2 gap-2.5">
              <button
                type="button"
                onClick={() => setFilterOpen(false)}
                className="inline-flex h-10 w-full items-center justify-center rounded-xl border border-[var(--border)] bg-[var(--surface)] text-[13px] font-semibold text-[var(--text)] transition hover:bg-[var(--panel-soft)]"
              >
                Cancel
              </button>
              <Button
                type="button"
                className="h-10 w-full rounded-xl px-4 text-[13px]"
                onClick={applyDrawer}
              >
                Apply
              </Button>
            </div>
          }
        >
          <div className="space-y-5">{drawerFields}</div>
        </SlideOver>
      ) : null}
    </>
  );
}

/** Convenience: status select field for filter drawers */
export function ListToolbarStatusField({
  label = "Status",
  value,
  onChange,
  options = REQUEST_STATUS_OPTIONS,
}) {
  return (
    <FilterSelect
      label={label}
      value={value}
      onChange={onChange}
      options={options}
      clearable
      defaultValue="all"
    />
  );
}

export { REQUEST_STATUS_OPTIONS };
