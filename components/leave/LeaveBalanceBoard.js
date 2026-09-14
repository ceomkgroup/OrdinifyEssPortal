"use client";

import { SearchX, Wallet } from "lucide-react";
import { ListToolbar } from "@/components/ui/ListToolbar";
import { PageLoader } from "@/components/ui/Spinner";
import { PanelTotalCount } from "@/components/ui/PanelTotalCount";
import { SearchableFilter } from "@/components/attendance/AttendanceStatusFilter";

function num(v, digits = 1) {
  const n = Number(v);
  if (!Number.isFinite(n)) return "—";
  return n.toFixed(digits);
}

function usageParts(row) {
  const allocated = Math.max(0, Number(row.allocated) || 0);
  const used = Math.max(0, Number(row.used) || 0);
  const pending = Math.max(0, Number(row.pending) || 0);
  const remaining = Number(row.remaining);
  const rem = Number.isFinite(remaining) ? remaining : allocated - used;
  const base = Math.max(allocated, used + pending + Math.max(rem, 0), 0.01);
  const usedPct = Math.min(100, (used / base) * 100);
  const pendingPct = Math.min(100 - usedPct, (pending / base) * 100);
  const remainPct = Math.max(0, 100 - usedPct - pendingPct);
  return {
    allocated,
    used,
    pending,
    remaining: rem,
    usedPct,
    pendingPct,
    remainPct,
  };
}

function LeaveBalanceCard({ row, name }) {
  const color = row.colorCode || "#7b39ec";
  const { allocated, used, pending, remaining, usedPct, pendingPct, remainPct } =
    usageParts(row);
  const remainTone =
    remaining < 0
      ? "text-[var(--danger)]"
      : remaining === 0
        ? "text-[var(--muted)]"
        : "text-[var(--success)]";

  return (
    <article
      className="group relative overflow-hidden rounded-2xl border border-[var(--border)] bg-[var(--surface)] p-4 shadow-[var(--card-shadow)] transition duration-200 hover:-translate-y-0.5 hover:border-[var(--lavender)] hover:shadow-[0_12px_28px_rgba(15,23,42,0.08)]"
    >
      <div
        className="pointer-events-none absolute inset-x-0 top-0 h-1"
        style={{ background: color }}
        aria-hidden
      />
      <div
        className="pointer-events-none absolute -right-8 -top-10 h-28 w-28 rounded-full opacity-[0.12]"
        style={{ background: color }}
        aria-hidden
      />

      <div className="relative flex items-start justify-between gap-3">
        <div className="min-w-0">
          <div className="flex items-center gap-2">
            <span
              className="inline-flex h-8 w-8 shrink-0 items-center justify-center rounded-xl"
              style={{ background: `${color}22`, color }}
            >
              <span
                className="h-2.5 w-2.5 rounded-full"
                style={{ background: color }}
              />
            </span>
            <div className="min-w-0">
              <p className="truncate text-[14px] font-semibold text-[var(--text)]">
                {name}
              </p>
              <p className="text-[11px] text-[var(--muted)]">
                {num(allocated)} days allocated
              </p>
            </div>
          </div>
        </div>
        <div className="text-right">
          <p className={`text-[22px] font-bold tabular-nums leading-none ${remainTone}`}>
            {num(remaining)}
          </p>
          <p className="mt-1 text-[10px] font-semibold uppercase tracking-wide text-[var(--muted)]">
            Remaining
          </p>
        </div>
      </div>

      <div className="relative mt-4">
        <div className="flex h-2.5 overflow-hidden rounded-full bg-[var(--panel-soft)]">
          <span
            className="h-full bg-[var(--lavender)] transition-all duration-500"
            style={{ width: `${usedPct}%` }}
            title={`Used ${num(used)}`}
          />
          <span
            className="h-full bg-amber-400/80 transition-all duration-500"
            style={{ width: `${pendingPct}%` }}
            title={`Pending ${num(pending)}`}
          />
          <span
            className="h-full transition-all duration-500"
            style={{
              width: `${remainPct}%`,
              background:
                remaining < 0 ? "var(--danger-soft)" : `${color}55`,
            }}
            title={`Remaining ${num(remaining)}`}
          />
        </div>
        <div className="mt-2 flex flex-wrap gap-x-3 gap-y-1 text-[10px] font-medium text-[var(--muted)]">
          <span className="inline-flex items-center gap-1">
            <span className="h-1.5 w-1.5 rounded-full bg-[var(--lavender)]" />
            Used {num(used)}
          </span>
          <span className="inline-flex items-center gap-1">
            <span className="h-1.5 w-1.5 rounded-full bg-amber-400" />
            Pending {num(pending)}
          </span>
          <span className="inline-flex items-center gap-1">
            <span
              className="h-1.5 w-1.5 rounded-full"
              style={{ background: color }}
            />
            Left {num(Math.max(remaining, 0))}
          </span>
        </div>
      </div>

      <div className="relative mt-4 grid grid-cols-3 gap-2">
        <div className="rounded-xl border border-[var(--border)] bg-[var(--panel-soft)]/80 px-2.5 py-2 text-center">
          <p className="text-[10px] font-semibold uppercase tracking-wide text-[var(--muted)]">
            Allocated
          </p>
          <p className="mt-0.5 text-[13px] font-bold tabular-nums text-[var(--text)]">
            {num(allocated)}
          </p>
        </div>
        <div className="rounded-xl border border-[var(--border)] bg-[var(--panel-soft)]/80 px-2.5 py-2 text-center">
          <p className="text-[10px] font-semibold uppercase tracking-wide text-[var(--muted)]">
            Used
          </p>
          <p className="mt-0.5 text-[13px] font-bold tabular-nums text-[var(--violet)]">
            {num(used)}
          </p>
        </div>
        <div className="rounded-xl border border-[var(--border)] bg-[var(--panel-soft)]/80 px-2.5 py-2 text-center">
          <p className="text-[10px] font-semibold uppercase tracking-wide text-[var(--muted)]">
            Pending
          </p>
          <p className="mt-0.5 text-[13px] font-bold tabular-nums text-amber-600">
            {num(pending)}
          </p>
        </div>
      </div>
    </article>
  );
}

/**
 * Leave Balance board — card grid with usage bars (same toolbar pattern as tables).
 */
export function LeaveBalanceBoard({
  rows = [],
  resolveName,
  loading = false,
  search = "",
  onSearchChange,
  fiscalYear,
  draftFiscalYear,
  onDraftFiscalYearChange,
  fiscalYearOptions = [],
  currentYear,
  filterActive = false,
  activeFilterCount = 0,
  onApplyFilters,
  onResetFilters,
  onRefresh,
  emptyTitle,
  emptyHint,
  emptyAction,
  emptyFiltered = false,
}) {
  return (
    <div className="flex min-h-0 flex-1 flex-col overflow-hidden">
      <div className="flex shrink-0 items-center justify-between gap-3 border-b border-[var(--border)] px-4 py-3 sm:px-5">
        <div className="min-w-0">
          <h2 className="heading-section">Leave Balance</h2>
          <p className="heading-sub mt-0.5">
            Usage by leave type for FY {fiscalYear || currentYear}
          </p>
        </div>
        <PanelTotalCount label="Leave types" count={rows.length} />
      </div>

      <div className="shrink-0">
        <ListToolbar
          recordCount={rows.length}
          search={search}
          onSearchChange={onSearchChange}
          searchPlaceholder="Search leave type…"
          filterTitle="Filters"
          filterSubtitle="Fiscal year"
          filterActive={filterActive}
          activeFilterCount={activeFilterCount}
          drawerFields={
            <div className="space-y-5">
              <SearchableFilter
                label="Fiscal year"
                value={draftFiscalYear}
                onChange={onDraftFiscalYearChange}
                options={fiscalYearOptions}
                defaultValue={String(currentYear)}
              />
            </div>
          }
          onApplyFilters={onApplyFilters}
          onResetFilters={onResetFilters}
          onRefresh={onRefresh}
        />
      </div>

      <div className="min-h-0 flex-1 overflow-y-auto bg-[var(--panel-soft)]/35 p-4 sm:p-5">
        {loading && !rows.length ? (
          <PageLoader
            compact
            label="Loading balance"
            hint="Fetching leave balances…"
          />
        ) : rows.length === 0 ? (
          <div className="flex min-h-[280px] flex-col items-center justify-center gap-2 rounded-2xl border border-dashed border-[var(--border)] bg-[var(--surface)] px-4 py-12 text-center">
            <span className="inline-flex h-12 w-12 items-center justify-center rounded-2xl bg-[var(--lavender-soft)] text-[var(--violet)]">
              {emptyFiltered ? (
                <SearchX className="h-6 w-6" />
              ) : (
                <Wallet className="h-6 w-6" />
              )}
            </span>
            <p className="text-[14px] font-semibold text-[var(--text)]">
              {emptyTitle}
            </p>
            {emptyHint ? (
              <p className="max-w-sm text-[12px] text-[var(--muted)]">
                {emptyHint}
              </p>
            ) : null}
            {emptyAction ? <div className="mt-2">{emptyAction}</div> : null}
          </div>
        ) : (
          <div className="grid grid-cols-1 gap-3 sm:grid-cols-2 xl:grid-cols-3">
            {rows.map((row) => {
              const key = row.leaveTypeId || row.id;
              const name =
                resolveName?.(row) ||
                row.leaveTypeName ||
                "Leave type";
              return (
                <LeaveBalanceCard key={key} row={row} name={name} />
              );
            })}
          </div>
        )}
      </div>
    </div>
  );
}
