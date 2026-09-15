"use client";

/**
 * Shared page title block — Attendance / requests / leave, etc.
 * Stacks on narrow widths so actions don't crush the title.
 */
export function PageHeader({ title, subtitle, actions, className = "" }) {
  return (
    <div
      className={`flex flex-col gap-1.5 sm:flex-row sm:items-center sm:justify-between sm:gap-2 ${className}`}
    >
      <div className="min-w-0 flex-1">
        <h1 className="heading-page">{title}</h1>
        {subtitle ? (
          <p className="heading-sub mt-px max-w-2xl leading-snug text-pretty">
            {subtitle}
          </p>
        ) : null}
      </div>
      {actions ? (
        <div className="flex shrink-0 flex-wrap items-center gap-1.5 sm:justify-end [&_button]:h-8! [&_button]:rounded-lg [&_button]:px-3 [&_button]:text-[12.5px]">
          {actions}
        </div>
      ) : null}
    </div>
  );
}
