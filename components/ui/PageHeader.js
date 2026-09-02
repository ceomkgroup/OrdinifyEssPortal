"use client";

/**
 * Shared page title block — Attendance / requests / leave, etc.
 * Stacks on narrow widths so actions don't crush the title.
 */
export function PageHeader({ title, subtitle, actions, className = "" }) {
  return (
    <div
      className={`flex flex-col gap-2.5 sm:flex-row sm:items-start sm:justify-between sm:gap-3 ${className}`}
    >
      <div className="min-w-0 flex-1">
        <h1 className="heading-page">{title}</h1>
        {subtitle ? (
          <p className="heading-sub mt-0.5 max-w-2xl text-pretty">{subtitle}</p>
        ) : null}
      </div>
      {actions ? (
        <div className="flex shrink-0 flex-wrap items-center gap-2 sm:justify-end">
          {actions}
        </div>
      ) : null}
    </div>
  );
}
