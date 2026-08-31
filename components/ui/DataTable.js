"use client";

/**
 * Shared data table chrome (Attendance Logs style):
 * sticky header, scroll body, compact cells.
 */

const TH =
  "sticky top-0 z-10 whitespace-nowrap border-b border-[var(--border)] bg-[var(--panel-soft)] px-2 py-1.5 text-left font-semibold";
const TD = "border-b border-[var(--border)] px-2 py-1";

export function DataTable({
  children,
  minWidth = "900px",
  maxHeight = "min(48vh,440px)",
  fill = false,
  className = "",
}) {
  return (
    <div
      className={`overflow-auto ${fill ? "h-full min-h-0" : ""} ${className}`}
      style={fill ? undefined : { maxHeight }}
    >
      <table
        className="w-full border-separate border-spacing-0 text-left text-[12px]"
        style={{ minWidth }}
      >
        {children}
      </table>
    </div>
  );
}

export function DataTableHead({ children }) {
  return (
    <thead className="sticky top-0 z-10">
      <tr className="bg-[var(--panel-soft)] text-[10px] font-semibold uppercase tracking-wide text-[var(--muted)]">
        {children}
      </tr>
    </thead>
  );
}

export function DataTh({ children, className = "", ...props }) {
  return (
    <th className={`${TH} ${className}`} {...props}>
      {children}
    </th>
  );
}

export function DataTd({ children, className = "", ...props }) {
  return (
    <td className={`${TD} ${className}`} {...props}>
      {children}
    </td>
  );
}

export function DataTableRow({ children, className = "", ...props }) {
  return (
    <tr className={`hover:bg-[var(--panel-soft)]/50 ${className}`} {...props}>
      {children}
    </tr>
  );
}

/** Empty / loading cell spanning all columns */
export function DataTableEmpty({ colSpan, children }) {
  return (
    <tr>
      <td
        colSpan={colSpan}
        className="border-b border-[var(--border)] px-4 py-10 text-center text-[var(--muted)]"
      >
        {children}
      </td>
    </tr>
  );
}
