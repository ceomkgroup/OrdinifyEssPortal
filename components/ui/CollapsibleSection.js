"use client";

import { useState } from "react";
import { ChevronDown } from "lucide-react";

/**
 * Attendance Logs-style collapsible block (title + chevron).
 * Open by default for summary sections.
 */
export function CollapsibleSection({
  title,
  extra,
  defaultCollapsed = false,
  collapsed: collapsedControlled,
  onCollapsedChange,
  children,
  className = "",
  bodyClassName = "border-t border-[var(--border)] px-5 py-3",
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

  return (
    <section
      className={`shrink-0 rounded-2xl border border-[var(--border)] bg-[var(--surface)] shadow-[var(--card-shadow)] ${className}`}
    >
      <button
        type="button"
        onClick={() => setCollapsed(!collapsed)}
        className="flex w-full items-center justify-between gap-3 px-5 py-2.5 text-left"
        aria-expanded={!collapsed}
      >
        <div className="flex min-w-0 flex-wrap items-center gap-2.5">
          <h2 className="heading-section">{title}</h2>
          {extra}
        </div>
        <span className="inline-flex h-8 w-8 shrink-0 items-center justify-center rounded-lg text-[var(--muted)] hover:bg-[var(--panel-soft)]">
          <ChevronDown
            className={`h-4 w-4 transition ${collapsed ? "-rotate-90" : ""}`}
          />
        </span>
      </button>
      {!collapsed ? <div className={bodyClassName}>{children}</div> : null}
    </section>
  );
}
