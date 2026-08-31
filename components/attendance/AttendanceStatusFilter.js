"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import { Check, ChevronDown, Search, X } from "lucide-react";

/**
 * Simple searchable attendance status list for filter drawers.
 * Closed by default — opens via header click / search focus.
 */
export function AttendanceStatusFilter({
  label = "Attendance status",
  value = "all",
  onChange,
  options = [],
  defaultValue = "all",
  className = "",
}) {
  const [query, setQuery] = useState("");
  const [open, setOpen] = useState(false);
  const searchRef = useRef(null);
  const rootRef = useRef(null);

  const filtered = useMemo(() => {
    const q = query.trim().toLowerCase();
    if (!q) return options;
    return options.filter((opt) => {
      const hay = [opt.name, opt.label, opt.code, opt.value]
        .filter(Boolean)
        .join(" ")
        .toLowerCase();
      return hay.includes(q);
    });
  }, [options, query]);

  const selected = options.find((o) => o.value === value) || options[0];
  const canClear = value != null && value !== defaultValue;
  const selectedLabel = selected?.name || selected?.label || "All statuses";

  function openList() {
    setOpen(true);
    queueMicrotask(() => searchRef.current?.focus());
  }

  function closeList() {
    setOpen(false);
    setQuery("");
  }

  function pick(next) {
    onChange?.(next);
    closeList();
  }

  useEffect(() => {
    if (!open) return undefined;
    function onDoc(e) {
      if (!rootRef.current?.contains(e.target)) closeList();
    }
    function onKey(e) {
      if (e.key === "Escape") closeList();
    }
    document.addEventListener("mousedown", onDoc);
    window.addEventListener("keydown", onKey);
    return () => {
      document.removeEventListener("mousedown", onDoc);
      window.removeEventListener("keydown", onKey);
    };
  }, [open]);

  return (
    <div ref={rootRef} className={`space-y-2 ${className}`}>
      <div className="flex items-center justify-between gap-2">
        <p className="text-[11px] font-semibold uppercase tracking-wide text-[var(--muted)]">
          {label}
        </p>
        {canClear ? (
          <button
            type="button"
            onClick={() => {
              onChange?.(defaultValue);
              closeList();
            }}
            className="text-[11px] font-medium text-[var(--violet)] hover:underline"
          >
            Clear
          </button>
        ) : null}
      </div>

      <button
        type="button"
        onClick={() => (open ? closeList() : openList())}
        className="flex h-10 w-full items-center gap-2 rounded-xl border border-[var(--border)] bg-[var(--surface)] px-3 text-left transition hover:border-[var(--violet)]/40"
        aria-expanded={open}
      >
        <span className="min-w-0 flex-1 truncate text-[13px] font-medium text-[var(--text)]">
          {selectedLabel}
        </span>
        <ChevronDown
          className={`h-4 w-4 shrink-0 text-[var(--muted)] transition ${
            open ? "rotate-180" : ""
          }`}
        />
      </button>

      {open ? (
        <div className="overflow-hidden rounded-xl border border-[var(--border)] bg-[var(--surface)]">
          <div className="flex h-9 items-center gap-2 border-b border-[var(--border)] px-2.5">
            <Search className="h-3.5 w-3.5 shrink-0 text-[var(--muted)]" />
            <input
              ref={searchRef}
              value={query}
              onChange={(e) => setQuery(e.target.value)}
              placeholder="Search…"
              className="h-full min-w-0 flex-1 bg-transparent text-[12px] text-[var(--text)] outline-none placeholder:text-[var(--muted)]"
            />
            {query ? (
              <button
                type="button"
                aria-label="Clear search"
                onClick={() => setQuery("")}
                className="text-[var(--muted)] hover:text-[var(--text)]"
              >
                <X className="h-3.5 w-3.5" />
              </button>
            ) : null}
          </div>

          <ul className="max-h-[220px] overflow-y-auto py-1">
            {filtered.length === 0 ? (
              <li className="px-3 py-5 text-center text-[12px] text-[var(--muted)]">
                No matches
              </li>
            ) : (
              filtered.map((opt) => {
                const active = opt.value === value;
                const name = opt.name || opt.label;
                return (
                  <li key={opt.value}>
                    <button
                      type="button"
                      onClick={() => pick(opt.value)}
                      className={`flex w-full items-center gap-2 px-3 py-2 text-left text-[13px] transition ${
                        active
                          ? "bg-[var(--lavender-soft)] font-semibold text-[var(--violet)]"
                          : "text-[var(--text)] hover:bg-[var(--panel-soft)]"
                      }`}
                    >
                      <span className="min-w-0 flex-1 truncate">{name}</span>
                      {active ? <Check className="h-3.5 w-3.5 shrink-0" /> : null}
                    </button>
                  </li>
                );
              })
            )}
          </ul>
        </div>
      ) : null}
    </div>
  );
}
