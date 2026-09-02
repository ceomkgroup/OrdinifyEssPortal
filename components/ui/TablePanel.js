"use client";

import { useState } from "react";
import { ChevronDown } from "lucide-react";
import {
  DataTable,
  DataTableEmpty,
  DataTableHead,
  DataTableRow,
  DataTd,
  DataTh,
} from "@/components/ui/DataTable";
import { FlashBanner } from "@/components/ui/FlashBanner";
import { ListToolbar } from "@/components/ui/ListToolbar";
import { PageLoader } from "@/components/ui/Spinner";
import { TablePagination } from "@/components/ui/TablePagination";
import { PanelTotalCount } from "@/components/ui/PanelTotalCount";

/**
 * One Attendance-style table panel for the whole portal.
 * Screens only pass title / tabs / columns / rows / pagination — layout stays identical.
 *
 * columns: [{ id, header, headerClassName?, cellClassName?, cell(row, { index, page, pageSize }) }]
 */
export function TablePanel({
  title,
  subtitle,
  titleCount,
  titleCountLabel = "Total requests",
  headerExtra,
  collapsible = false,
  defaultCollapsed = false,
  collapsed: collapsedControlled,
  onCollapsedChange,

  tabs,
  tab,
  onTabChange,
  recordCount,
  search,
  onSearchChange,
  searchPlaceholder,
  drawerFields,
  filterActive,
  activeFilterCount,
  filterTitle,
  filterSubtitle,
  onApplyFilters,
  onResetFilters,
  onRefresh,
  onExport,
  exporting = false,
  toolbarExtra,

  columns = [],
  rows = [],
  getRowKey,
  minWidth = "900px",
  maxHeight = "min(48vh,440px)",
  fill = true,

  loading = false,
  loadingLabel = "Loading",
  loadingHint = "Fetching records…",
  error,
  emptyTitle = "No records",
  emptyHint,
  emptyAction,
  emptyIcon: EmptyIcon,

  page = 1,
  pageSize = 10,
  total,
  totalPages,
  onPageChange,
  onPageSizeChange,
  showPagination = true,

  className = "",
}) {
  const [collapsedInternal, setCollapsedInternal] = useState(defaultCollapsed);
  const collapsed =
    typeof collapsedControlled === "boolean"
      ? collapsedControlled
      : collapsedInternal;

  function setCollapsed(next) {
    if (typeof onCollapsedChange === "function") onCollapsedChange(next);
    else setCollapsedInternal(next);
  }

  const list = Array.isArray(rows) ? rows : [];
  const colCount = Math.max(1, columns.length);
  const entryTotal =
    typeof total === "number" ? total : list.length;
  const displayCount =
    recordCount != null ? recordCount : entryTotal;
  const toolbarRecordCount =
    titleCount != null ? undefined : displayCount;

  const showToolbar =
    (Array.isArray(tabs) && tabs.length > 0) ||
    typeof onSearchChange === "function" ||
    drawerFields != null ||
    typeof onRefresh === "function" ||
    typeof onExport === "function" ||
    toolbarExtra != null;

  return (
    <section
      data-fill-panel=""
      className={`flex min-h-[180px] flex-col overflow-hidden rounded-2xl border border-[var(--border)] bg-[var(--surface)] shadow-[var(--card-shadow)] ${
        fill ? "flex-1" : ""
      } ${className}`}
    >
      {(title || titleCount != null || headerExtra || collapsible) && (
        <div className="flex shrink-0 flex-wrap items-center justify-between gap-2 border-b border-[var(--border)] px-3 py-2 sm:gap-3 sm:px-5 sm:py-2.5">
          <div className="flex min-w-0 flex-wrap items-center gap-2 sm:gap-2.5">
            {title ? (
              <div className="min-w-0">
                <h2 className="heading-section">
                  {title}
                </h2>
                {subtitle ? (
                  <p className="heading-sub mt-0.5">
                    {subtitle}
                  </p>
                ) : null}
              </div>
            ) : null}
            {headerExtra}
          </div>
          <div className="flex shrink-0 items-center gap-2">
            {titleCount != null ? (
              <PanelTotalCount count={titleCount} label={titleCountLabel} />
            ) : null}
            {collapsible ? (
            <button
              type="button"
              onClick={() => setCollapsed(!collapsed)}
              className="inline-flex h-8 w-8 items-center justify-center rounded-lg text-[var(--muted)] hover:bg-[var(--panel-soft)]"
              aria-label={collapsed ? "Expand" : "Collapse"}
            >
              <ChevronDown
                className={`h-4 w-4 transition ${collapsed ? "-rotate-90" : ""}`}
              />
            </button>
          ) : null}
          </div>
        </div>
      )}

      {!collapsed ? (
        <>
          {showToolbar ? (
            <div className="shrink-0">
              <ListToolbar
                tabs={tabs}
                tab={tab}
                onTabChange={onTabChange}
                recordCount={toolbarRecordCount}
                search={search}
                onSearchChange={onSearchChange}
                searchPlaceholder={searchPlaceholder}
                drawerFields={drawerFields}
                filterActive={filterActive}
                activeFilterCount={activeFilterCount}
                filterTitle={filterTitle}
                filterSubtitle={filterSubtitle}
                onApplyFilters={onApplyFilters}
                onResetFilters={onResetFilters}
                onRefresh={onRefresh}
                onExport={onExport}
                exporting={exporting || loading}
              >
                {toolbarExtra}
              </ListToolbar>
            </div>
          ) : null}

          {error ? (
            <FlashBanner
              message={error}
              tone="danger"
              className="mx-5 mt-3 shrink-0"
              duration={5000}
              autoDismiss={false}
            />
          ) : null}

          <div className={fill ? "min-h-0 flex-1 overflow-hidden" : ""}>
            {loading ? (
              <div className="px-5 py-8">
                <PageLoader
                  compact
                  label={loadingLabel}
                  hint={loadingHint}
                />
              </div>
            ) : (
              <DataTable
                minWidth={minWidth}
                maxHeight={maxHeight}
                fill={fill}
              >
                <DataTableHead>
                  {columns.map((col) => (
                    <DataTh
                      key={col.id}
                      className={col.headerClassName || ""}
                    >
                      {col.header}
                    </DataTh>
                  ))}
                </DataTableHead>
                <tbody>
                  {list.length === 0 ? (
                    <DataTableEmpty colSpan={colCount}>
                      <div className="flex flex-col items-center justify-center gap-2 py-2">
                        {EmptyIcon ? (
                          <span className="inline-flex h-12 w-12 items-center justify-center rounded-2xl bg-[var(--lavender-soft)] text-[var(--violet)]">
                            <EmptyIcon className="h-6 w-6" />
                          </span>
                        ) : null}
                        <p className="text-[14px] font-semibold text-[var(--text)]">
                          {emptyTitle}
                        </p>
                        {emptyHint ? (
                          <p className="max-w-sm text-[12px] text-[var(--muted)]">
                            {emptyHint}
                          </p>
                        ) : null}
                        {emptyAction ? (
                          <div className="mt-2">{emptyAction}</div>
                        ) : null}
                      </div>
                    </DataTableEmpty>
                  ) : (
                    list.map((row, index) => {
                      const key = getRowKey
                        ? getRowKey(row, index)
                        : row?.id ?? row?.requestId ?? index;
                      const ctx = { index, page, pageSize };
                      return (
                        <DataTableRow key={key}>
                          {columns.map((col) => {
                            const cellClass =
                              typeof col.cellClassName === "function"
                                ? col.cellClassName(row, ctx)
                                : col.cellClassName || "";
                            return (
                              <DataTd key={col.id} className={cellClass}>
                                {col.cell
                                  ? col.cell(row, ctx)
                                  : row?.[col.id] ?? "—"}
                              </DataTd>
                            );
                          })}
                        </DataTableRow>
                      );
                    })
                  )}
                </tbody>
              </DataTable>
            )}
          </div>

          {showPagination && typeof onPageChange === "function" ? (
            <TablePagination
              className="shrink-0"
              page={page}
              pageSize={pageSize}
              total={entryTotal}
              totalPages={totalPages}
              onPageChange={onPageChange}
              onPageSizeChange={onPageSizeChange}
              loading={loading}
            />
          ) : null}
        </>
      ) : null}
    </section>
  );
}
