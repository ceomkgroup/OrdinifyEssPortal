"use client";

import { ChevronLeft, ChevronRight } from "lucide-react";

export const TABLE_PAGE_SIZE = 10;
export const TABLE_PAGE_SIZE_OPTIONS = [10, 25, 50];

/**
 * Attendance Logs pagination footer — shared across all portal tables.
 */
export function TablePagination({
  page = 1,
  pageSize = TABLE_PAGE_SIZE,
  total = 0,
  totalPages,
  onPageChange,
  onPageSizeChange,
  loading = false,
  pageSizeOptions = TABLE_PAGE_SIZE_OPTIONS,
  className = "",
}) {
  const pages = Math.max(
    1,
    typeof totalPages === "number" ? totalPages : Math.ceil(total / pageSize) || 1
  );
  const current = Math.min(Math.max(1, page), pages);
  const fromRow = total === 0 ? 0 : (current - 1) * pageSize + 1;
  const toRow = Math.min(current * pageSize, total);
  const showSize = typeof onPageSizeChange === "function";

  return (
    <div
      className={`flex items-center justify-between gap-2 border-t border-[var(--border)] px-4 py-1.5 ${className}`}
    >
      {showSize ? (
        <label className="flex items-center gap-1.5 text-[11px] text-[var(--muted)]">
          Rows per page
          <select
            value={pageSize}
            disabled={loading}
            onChange={(e) => onPageSizeChange(Number(e.target.value))}
            className="h-7 rounded-md border border-[var(--border)] bg-[var(--surface)] px-1.5 text-[12px] font-medium text-[var(--text)] disabled:opacity-50"
          >
            {pageSizeOptions.map((n) => (
              <option key={n} value={n}>
                {n}
              </option>
            ))}
          </select>
        </label>
      ) : (
        <span />
      )}

      <div className="flex items-center gap-2">
        <p className="text-[11px] text-[var(--muted)]">
          <span className="font-medium text-[var(--text)]">{fromRow}</span>
          –
          <span className="font-medium text-[var(--text)]">{toRow}</span>
          {" of "}
          <span className="font-medium text-[var(--text)]">{total}</span>
        </p>
        <div className="flex items-center gap-1">
          <button
            type="button"
            disabled={current <= 1 || loading}
            onClick={() => onPageChange?.(Math.max(1, current - 1))}
            className="inline-flex h-7 w-7 items-center justify-center rounded-md border border-[var(--border)] text-[var(--text)] transition hover:bg-[var(--panel-soft)] disabled:opacity-40"
            aria-label="Previous page"
          >
            <ChevronLeft className="h-3.5 w-3.5" />
          </button>
          <button
            type="button"
            disabled={current >= pages || loading}
            onClick={() => onPageChange?.(Math.min(pages, current + 1))}
            className="inline-flex h-7 w-7 items-center justify-center rounded-md border border-[var(--border)] text-[var(--text)] transition hover:bg-[var(--panel-soft)] disabled:opacity-40"
            aria-label="Next page"
          >
            <ChevronRight className="h-3.5 w-3.5" />
          </button>
        </div>
      </div>
    </div>
  );
}
