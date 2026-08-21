"use client";

import {
  Check,
  ChevronDown,
  Clock3,
  Moon,
  Search,
  Sun,
  Sunset,
} from "lucide-react";
import { useEffect, useId, useMemo, useRef, useState } from "react";
import { formatTime } from "@/lib/format";

function parseMins(time24) {
  if (!time24) return null;
  const match = String(time24).trim().match(/^(\d{1,2}):(\d{2})/);
  if (!match) return null;
  return Number(match[1]) * 60 + Number(match[2]);
}

function shiftTone(shift) {
  const type = String(shift?.shiftType || shift?.shiftTypeRaw || "").toLowerCase();
  if (type.includes("night") || type.includes("grave")) {
    return {
      Icon: Moon,
      bar: "bg-slate-700",
      soft: "bg-slate-100",
      text: "text-slate-700",
      ring: "ring-slate-200",
    };
  }
  const start = parseMins(shift?.startTime);
  if (start != null && (start >= 16 * 60 || start < 5 * 60)) {
    return {
      Icon: Sunset,
      bar: "bg-amber-500",
      soft: "bg-amber-50",
      text: "text-amber-700",
      ring: "ring-amber-200",
    };
  }
  return {
    Icon: Sun,
    bar: "bg-[var(--violet)]",
    soft: "bg-[var(--lavender-soft)]",
    text: "text-[var(--violet)]",
    ring: "ring-[var(--lavender)]",
  };
}

function durationLabel(shift) {
  const start = parseMins(shift?.startTime);
  const end = parseMins(shift?.endTime);
  if (start == null || end == null) return null;
  let mins = end - start;
  if (mins <= 0) mins += 24 * 60;
  const h = Math.floor(mins / 60);
  const m = mins % 60;
  if (m === 0) return `${h}h`;
  return `${h}h ${m}m`;
}

function ShiftOptionCard({
  shift,
  timeFormat,
  selected,
  isCurrent,
  disabled,
  onSelect,
}) {
  const tone = shiftTone(shift);
  const Icon = tone.Icon;
  const start = shift.startTime
    ? formatTime(shift.startTime, timeFormat)
    : null;
  const end = shift.endTime ? formatTime(shift.endTime, timeFormat) : null;
  const duration = durationLabel(shift);
  const typeLabel = String(shift.shiftType || shift.shiftTypeRaw || "")
    .replace(/_/g, " ")
    .trim();

  return (
    <button
      type="button"
      disabled={disabled}
      onClick={() => onSelect?.(shift.shiftId)}
      className={`group flex w-full items-stretch gap-0 overflow-hidden rounded-xl border text-left transition ${
        selected
          ? "border-[var(--violet)] bg-[var(--lavender-soft)]/60 ring-2 ring-[var(--lavender-soft)]"
          : disabled
            ? "cursor-not-allowed border-[var(--border)] bg-[var(--panel-soft)] opacity-60"
            : "border-[var(--border)] bg-[var(--surface)] hover:border-[var(--violet)]/40 hover:bg-[var(--panel-soft)]"
      }`}
    >
      <span className={`w-1.5 shrink-0 ${tone.bar}`} aria-hidden />
      <span className="flex min-w-0 flex-1 items-start gap-3 px-3 py-2.5">
        <span
          className={`mt-0.5 inline-flex h-9 w-9 shrink-0 items-center justify-center rounded-xl ${tone.soft} ${tone.text}`}
        >
          <Icon className="h-4 w-4" />
        </span>
        <span className="min-w-0 flex-1">
          <span className="flex flex-wrap items-center gap-1.5">
            <span className="truncate text-[13px] font-semibold text-[var(--text)]">
              {shift.shiftName || "Shift"}
            </span>
            {isCurrent ? (
              <span className="rounded-full bg-[var(--success-soft)] px-2 py-0.5 text-[10px] font-bold uppercase tracking-wide text-[var(--success)]">
                Current
              </span>
            ) : null}
            {typeLabel ? (
              <span className="rounded-md bg-[var(--panel-soft)] px-1.5 py-0.5 text-[10px] font-semibold uppercase tracking-wide text-[var(--muted)]">
                {typeLabel}
              </span>
            ) : null}
          </span>
          <span className="mt-1.5 flex flex-wrap items-center gap-x-3 gap-y-1 text-[12px] text-[var(--muted)]">
            {start && end ? (
              <span className="inline-flex items-center gap-1 font-medium tabular-nums text-[var(--text)]">
                <Clock3 className="h-3.5 w-3.5 text-[var(--violet)]" />
                {start}
                <span className="text-[var(--muted)]">→</span>
                {end}
              </span>
            ) : (
              <span className="inline-flex items-center gap-1 font-medium text-[var(--muted)]">
                <Clock3 className="h-3.5 w-3.5 text-[var(--violet)]" />
                No fixed timings
              </span>
            )}
            {duration ? (
              <span className="rounded-full bg-[var(--panel-soft)] px-2 py-0.5 text-[11px] font-semibold text-[var(--muted)]">
                {duration}
              </span>
            ) : null}
          </span>
        </span>
        <span
          className={`mt-1 inline-flex h-5 w-5 shrink-0 items-center justify-center rounded-full border transition ${
            selected
              ? "border-[var(--violet)] bg-[var(--violet)] text-white"
              : "border-[var(--border)] bg-[var(--surface)] text-transparent group-hover:border-[var(--violet)]/40"
          }`}
        >
          <Check className="h-3 w-3" strokeWidth={3} />
        </span>
      </span>
    </button>
  );
}

/**
 * Visual shift picker — card list with timings, type, current badge.
 */
export function ShiftSelect({
  shifts = [],
  value = "",
  onChange,
  currentShiftId = null,
  timeFormat = "12h",
  loading = false,
  placeholder = "Select a shift…",
  disabled = false,
}) {
  const listId = useId();
  const rootRef = useRef(null);
  const [open, setOpen] = useState(false);
  const [query, setQuery] = useState("");

  const selected = useMemo(
    () => shifts.find((s) => s.shiftId === value) || null,
    [shifts, value]
  );

  const selectable = useMemo(
    () =>
      (shifts || []).filter((s) => s?.shiftId && s.shiftId !== currentShiftId),
    [shifts, currentShiftId]
  );

  const filtered = useMemo(() => {
    const q = query.trim().toLowerCase();
    if (!q) return selectable;
    return selectable.filter((s) => {
      const hay = [
        s.shiftName,
        s.shiftType,
        s.shiftTypeRaw,
        s.startTime,
        s.endTime,
      ]
        .filter(Boolean)
        .join(" ")
        .toLowerCase();
      return hay.includes(q);
    });
  }, [selectable, query]);

  useEffect(() => {
    if (!open) return undefined;

    function onDoc(e) {
      if (rootRef.current?.contains(e.target)) return;
      setOpen(false);
    }
    function onKey(e) {
      if (e.key === "Escape") setOpen(false);
    }
    document.addEventListener("mousedown", onDoc);
    window.addEventListener("keydown", onKey);
    return () => {
      document.removeEventListener("mousedown", onDoc);
      window.removeEventListener("keydown", onKey);
    };
  }, [open]);

  useEffect(() => {
    if (!open) setQuery("");
  }, [open]);

  const selectedTone = shiftTone(selected);
  const SelectedIcon = selectedTone.Icon;

  return (
    <div ref={rootRef} className="relative mt-1.5">
      <button
        type="button"
        disabled={disabled || loading}
        aria-haspopup="listbox"
        aria-expanded={open}
        aria-controls={listId}
        onClick={() => setOpen((v) => !v)}
        className={`flex w-full items-center gap-3 rounded-xl border bg-[var(--surface)] px-3 py-2.5 text-left outline-none transition focus:border-[var(--violet)] focus:ring-2 focus:ring-[var(--lavender-soft)] ${
          open
            ? "border-[var(--violet)] ring-2 ring-[var(--lavender-soft)]"
            : "border-[var(--border)] hover:border-[var(--violet)]/35"
        } ${disabled || loading ? "cursor-not-allowed opacity-60" : ""}`}
      >
        {selected ? (
          <>
            <span
              className={`inline-flex h-10 w-10 shrink-0 items-center justify-center rounded-xl ${selectedTone.soft} ${selectedTone.text}`}
            >
              <SelectedIcon className="h-4 w-4" />
            </span>
            <span className="min-w-0 flex-1">
              <span className="block truncate text-[13px] font-semibold text-[var(--text)]">
                {selected.shiftName || "Shift"}
              </span>
              <span className="mt-0.5 flex items-center gap-1 text-[12px] tabular-nums text-[var(--muted)]">
                <Clock3 className="h-3.5 w-3.5 text-[var(--violet)]" />
                {selected.startTime && selected.endTime ? (
                  <>
                    {formatTime(selected.startTime, timeFormat)}
                    <span>→</span>
                    {formatTime(selected.endTime, timeFormat)}
                  </>
                ) : (
                  <span>No fixed timings</span>
                )}
              </span>
            </span>
          </>
        ) : (
          <>
            <span className="inline-flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-[var(--panel-soft)] text-[var(--muted)]">
              <Clock3 className="h-4 w-4" />
            </span>
            <span className="min-w-0 flex-1">
              <span className="block text-[13px] font-medium text-[var(--muted)]">
                {loading ? "Loading shifts…" : placeholder}
              </span>
              <span className="mt-0.5 block text-[11px] text-[var(--muted)]">
                {selectable.length
                  ? `${selectable.length} shift${selectable.length === 1 ? "" : "s"} available`
                  : "Pick timings that work for you"}
              </span>
            </span>
          </>
        )}
        <ChevronDown
          className={`h-4 w-4 shrink-0 text-[var(--muted)] transition ${
            open ? "rotate-180 text-[var(--violet)]" : ""
          }`}
        />
      </button>

      {open ? (
        <div
          id={listId}
          role="listbox"
          className="absolute left-0 right-0 z-40 mt-2 overflow-hidden rounded-2xl border border-[var(--border)] bg-[var(--surface)] shadow-[0_16px_40px_rgba(15,23,42,0.14)]"
        >
          <div className="border-b border-[var(--border)] bg-gradient-to-br from-[var(--lavender-soft)]/80 to-[var(--surface)] px-3 py-2.5">
            <p className="text-[11px] font-semibold uppercase tracking-wide text-[var(--violet)]">
              Available shifts
            </p>
            {selectable.length > 4 ? (
              <label className="relative mt-2 block">
                <Search className="pointer-events-none absolute left-3 top-1/2 h-3.5 w-3.5 -translate-y-1/2 text-[var(--muted)]" />
                <input
                  autoFocus
                  type="search"
                  value={query}
                  onChange={(e) => setQuery(e.target.value)}
                  placeholder="Search by name or type…"
                  className="h-9 w-full rounded-lg border border-[var(--border)] bg-[var(--surface)] pl-9 pr-3 text-[12px] text-[var(--text)] outline-none focus:border-[var(--violet)] focus:ring-2 focus:ring-[var(--lavender-soft)]"
                />
              </label>
            ) : null}
          </div>

          <div className="max-h-[280px] space-y-2 overflow-y-auto p-2.5">
            {filtered.length === 0 ? (
              <div className="rounded-xl border border-dashed border-[var(--border)] bg-[var(--panel-soft)] px-3 py-6 text-center">
                <p className="text-[13px] font-semibold text-[var(--text)]">
                  No shifts to show
                </p>
                <p className="mt-1 text-[11px] text-[var(--muted)]">
                  {query.trim()
                    ? "Try a different search."
                    : "No other shifts are available right now."}
                </p>
              </div>
            ) : (
              filtered.map((shift) => (
                <ShiftOptionCard
                  key={shift.shiftId}
                  shift={shift}
                  timeFormat={timeFormat}
                  selected={shift.shiftId === value}
                  isCurrent={false}
                  onSelect={(id) => {
                    onChange?.(id);
                    setOpen(false);
                  }}
                />
              ))
            )}
          </div>

          {currentShiftId ? (
            <div className="border-t border-[var(--border)] bg-[var(--panel-soft)]/80 px-3 py-2">
              <p className="text-[11px] text-[var(--muted)]">
                Your current shift is hidden from this list so you can only pick
                a different one.
              </p>
            </div>
          ) : null}
        </div>
      ) : null}
    </div>
  );
}
