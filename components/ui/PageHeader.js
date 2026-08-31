"use client";

/**
 * Shared page title block — Attendance / requests / leave, etc.
 */
export function PageHeader({ title, subtitle, actions, className = "" }) {
  return (
    <div
      className={`flex flex-wrap items-center justify-between gap-2.5 ${className}`}
    >
      <div className="min-w-0">
        <h1 className="heading-page">{title}</h1>
        {subtitle ? (
          <p className="heading-sub mt-0.5">{subtitle}</p>
        ) : null}
      </div>
      {actions ? (
        <div className="flex flex-wrap items-center gap-2">{actions}</div>
      ) : null}
    </div>
  );
}
