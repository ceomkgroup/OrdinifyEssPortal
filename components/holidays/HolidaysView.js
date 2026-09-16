"use client";

import {
  CalendarDays,
  ChevronLeft,
  ChevronRight,
  Inbox,
  RefreshCw,
  Sparkles,
} from "lucide-react";
import { useEffect, useMemo, useRef, useState } from "react";
import { createPortal } from "react-dom";
import { Button } from "@/components/ui/Button";
import { Card } from "@/components/ui/Card";
import { ListToolbar } from "@/components/ui/ListToolbar";
import { SearchableFilter } from "@/components/attendance/AttendanceStatusFilter";
import { MetaBadge } from "@/components/ui/MetaBadge";
import { CollapsibleSection } from "@/components/ui/CollapsibleSection";
import { SoftStat, SUMMARY_GRID_CLASS } from "@/components/ui/SoftStat";
import { PanelTotalCount } from "@/components/ui/PanelTotalCount";
import { PortalPage } from "@/components/ui/PortalPage";
import { PageLoader } from "@/components/ui/Spinner";
import { useHolidays } from "@/hooks/useHolidays";
import {
  readQueryInt,
  readQueryString,
  usePersistListQuery,
  usePortalQuery,
} from "@/hooks/usePortalQuery";
import { formatDate } from "@/lib/format";

const WEEKDAYS = ["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"];
const MONTHS = [
  "January",
  "February",
  "March",
  "April",
  "May",
  "June",
  "July",
  "August",
  "September",
  "October",
  "November",
  "December",
];

function parseLocalDate(value) {
  if (!value) return null;
  const match = String(value).match(/^(\d{4})-(\d{2})-(\d{2})/);
  if (match) {
    return new Date(
      Number(match[1]),
      Number(match[2]) - 1,
      Number(match[3]),
      12,
      0,
      0
    );
  }
  const d = new Date(value);
  return Number.isNaN(d.getTime()) ? null : d;
}

function toDateKey(d) {
  if (!d || Number.isNaN(d.getTime())) return null;
  const y = d.getFullYear();
  const m = String(d.getMonth() + 1).padStart(2, "0");
  const day = String(d.getDate()).padStart(2, "0");
  return `${y}-${m}-${day}`;
}

function daysUntil(fromDate) {
  const start = parseLocalDate(fromDate);
  if (!start) return null;
  const today = new Date();
  today.setHours(12, 0, 0, 0);
  return Math.round((start.getTime() - today.getTime()) / 86400000);
}

function formatCountdown(days) {
  if (days == null) return null;
  if (days < 0) return "Passed";
  if (days === 0) return "Today";
  if (days === 1) return "Tomorrow";
  return `In ${days} days`;
}

function formatDateWithWeekday(value, dateFormat) {
  const d = parseLocalDate(value);
  if (!d) return formatDate(value, dateFormat) || "—";
  return `${formatDate(value, dateFormat)} · ${WEEKDAYS[d.getDay()]}`;
}

function formatPeriod(fromDate, toDate, dateFormat) {
  if (!fromDate && !toDate) return "—";
  if (!toDate || toDate === fromDate) {
    return formatDateWithWeekday(fromDate, dateFormat);
  }
  return `${formatDate(fromDate, dateFormat)} – ${formatDate(toDate, dateFormat)}`;
}


function buildHolidaysByDate(rows) {
  const map = new Map();
  for (const row of rows) {
    const start = parseLocalDate(row.fromDate);
    const end = parseLocalDate(row.toDate || row.fromDate);
    if (!start) continue;
    const endDate = end && end.getTime() >= start.getTime() ? end : start;
    const cursor = new Date(start);
    while (cursor.getTime() <= endDate.getTime()) {
      const key = toDateKey(cursor);
      if (key) {
        if (!map.has(key)) map.set(key, []);
        const list = map.get(key);
        if (!list.some((h) => h.occurrenceId === row.occurrenceId && h.holidayId === row.holidayId && h.fromDate === row.fromDate)) {
          list.push(row);
        }
      }
      cursor.setDate(cursor.getDate() + 1);
    }
  }
  return map;
}

function holidayMetaLine(holiday, dateFormat) {
  const parts = [
    formatPeriod(holiday.fromDate, holiday.toDate, dateFormat),
    holiday.isOptional ? "Optional" : "Mandatory",
    holiday.typeName || holiday.holidayTypeLabel,
  ].filter(Boolean);
  return parts.join(" · ");
}

function NextHolidayBanner({ holiday, dateFormat }) {
  if (!holiday) return null;
  const days = daysUntil(holiday.fromDate);
  return (
    <div className="mb-4 flex flex-wrap items-center gap-3 rounded-2xl border border-[var(--violet)]/20 bg-gradient-to-br from-[var(--lavender-soft)]/80 via-[var(--surface)] to-[var(--surface)] px-4 py-3.5">
      <span className="inline-flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-[var(--surface)] text-[var(--violet)] shadow-sm">
        <Sparkles className="h-4 w-4" />
      </span>
      <div className="min-w-0 flex-1">
        <p className="text-[11px] font-semibold uppercase tracking-wide text-[var(--muted)]">
          Next holiday
        </p>
        <p className="mt-0.5 text-[14px] font-semibold text-[var(--text)]">
          {holiday.title}
        </p>
        <p className="mt-0.5 text-[12px] text-[var(--muted)]">
          {holidayMetaLine(holiday, dateFormat)}
        </p>
      </div>
      <span className="shrink-0 rounded-full bg-[var(--violet)] px-3 py-1 text-[11px] font-semibold text-white">
        {formatCountdown(days)}
      </span>
    </div>
  );
}

function CalendarSelect({ label, value, onChange, options, className = "" }) {
  return (
    <label className={`block min-w-0 ${className}`}>
      <span className="mb-1 block text-[10px] font-semibold uppercase tracking-wide text-[var(--muted)]">
        {label}
      </span>
      <select
        value={value}
        onChange={(e) => onChange(e.target.value)}
        className="h-10 w-full rounded-xl border border-[var(--border)] bg-[var(--surface)] px-3 text-[13px] font-semibold text-[var(--text)] outline-none transition focus:border-[var(--violet)]/50"
      >
        {options.map((opt) => (
          <option key={opt.value} value={opt.value}>
            {opt.label}
          </option>
        ))}
      </select>
    </label>
  );
}

function HolidayLogItem({
  holiday,
  index,
  nextHoliday,
  dateFormat,
}) {
  const days = daysUntil(holiday.fromDate);
  const countdown = formatCountdown(days);
  const isToday = days === 0;
  const isUpcoming = days != null && days >= 0;
  const isPassed = days != null && days < 0;
  const isNext =
    nextHoliday &&
    (nextHoliday.occurrenceId
      ? nextHoliday.occurrenceId === holiday.occurrenceId
      : nextHoliday.holidayId === holiday.holidayId &&
        nextHoliday.fromDate === holiday.fromDate);

  return (
    <li
      className={`flex items-start gap-3 rounded-xl border px-3 py-3 ${
        isNext || isToday
          ? "border-[var(--violet)]/30 bg-gradient-to-r from-[var(--lavender-soft)]/80 to-[var(--surface)]"
          : isUpcoming
            ? "border-[var(--violet)]/15 bg-[var(--lavender-soft)]/35"
            : isPassed
              ? "border-[var(--border)] bg-[var(--panel-soft)]/60 opacity-90"
              : "border-[var(--border)] bg-[var(--surface)]"
      }`}
    >
      <span
        className="mt-0.5 flex h-10 w-10 shrink-0 items-center justify-center rounded-xl"
        style={{
          backgroundColor: `${holiday.colorCode || "#7c3aed"}22`,
          color: holiday.colorCode || "#7c3aed",
        }}
      >
        <CalendarDays className="h-4 w-4" />
      </span>

      <div className="min-w-0 flex-1">
        <div className="flex flex-wrap items-center gap-1.5">
          <p className="truncate text-[13px] font-semibold text-[var(--text)]">
            {holiday.title}
          </p>
          {holiday.isOptional ? (
            <span className="rounded-full bg-[var(--warning-soft)] px-2 py-0.5 text-[10px] font-semibold text-[var(--warning)]">
              Optional
            </span>
          ) : (
            <span className="rounded-full bg-[var(--success-soft)] px-2 py-0.5 text-[10px] font-semibold text-[var(--success)]">
              Mandatory
            </span>
          )}
          {holiday.isRecurring ? (
            <span className="rounded-full bg-[var(--panel-soft)] px-2 py-0.5 text-[10px] font-semibold text-[var(--muted)]">
              Recurring
            </span>
          ) : null}
          {isNext ? (
            <span className="rounded-full bg-[var(--violet)] px-2 py-0.5 text-[10px] font-semibold text-white">
              Next
            </span>
          ) : null}
          {isToday ? (
            <span className="rounded-full bg-[var(--violet)] px-2 py-0.5 text-[10px] font-semibold text-white">
              Today
            </span>
          ) : null}
        </div>
        <div className="mt-1 flex flex-wrap items-center gap-1.5">
          {holiday.typeName ? (
            <span className="rounded-full bg-[var(--panel-soft)] px-2 py-0.5 text-[10px] font-semibold capitalize text-[var(--muted)]">
              {holiday.typeName}
            </span>
          ) : null}
          <span className="text-[12px] text-[var(--muted)]">
            {formatPeriod(holiday.fromDate, holiday.toDate, dateFormat)}
          </span>
        </div>
        {holiday.description ? (
          <p className="mt-1 text-[12px] text-[var(--muted)]">
            {holiday.description}
          </p>
        ) : null}
      </div>

      {countdown ? (
        <span
          className={`shrink-0 rounded-full px-2.5 py-1 text-[10px] font-semibold tabular-nums ${
            isToday
              ? "bg-[var(--violet)] text-white"
              : isUpcoming
                ? "bg-[var(--lavender-soft)] text-[var(--violet)]"
                : "bg-[var(--panel-soft)] text-[var(--muted)]"
          }`}
        >
          {countdown}
        </span>
      ) : null}
    </li>
  );
}

function HolidayHoverCard({ holidays, dateFormat, tipRef, coords }) {
  if (typeof document === "undefined") return null;
  return createPortal(
    <div
      ref={tipRef}
      role="tooltip"
      className="pointer-events-none fixed z-[9999] w-64 max-w-[calc(100vw-24px)] rounded-xl border border-[var(--border)] bg-[var(--surface)] p-3 text-left shadow-[0_16px_40px_rgba(15,23,42,0.18)]"
      style={{
        top: coords.top,
        left: coords.left,
        visibility: coords.ready ? "visible" : "hidden",
      }}
    >
      {holidays.map((h, hi) => {
        const hDays = daysUntil(h.fromDate);
        const hPassed = hDays != null && hDays < 0;
        return (
          <div
            key={`${h.occurrenceId || h.holidayId || h.title}-${hi}`}
            className={hi > 0 ? "mt-2.5 border-t border-[var(--border)] pt-2.5" : ""}
          >
            <p className="text-[12px] font-semibold leading-snug text-[var(--text)]">
              {h.title}
            </p>
            <p className="mt-1 text-[11px] leading-relaxed text-[var(--muted)]">
              {holidayMetaLine(h, dateFormat)}
            </p>
            {h.description ? (
              <p className="mt-1 text-[11px] leading-relaxed text-[var(--muted)]">
                {h.description}
              </p>
            ) : null}
            <p
              className={`mt-1.5 text-[10px] font-semibold ${
                hPassed ? "text-[var(--muted)]" : "text-[var(--violet)]"
              }`}
            >
              {formatCountdown(hDays) || "—"}
            </p>
          </div>
        );
      })}
    </div>,
    document.body
  );
}

function CalendarDayButton({
  cell,
  todayKey,
  selectedDateKey,
  dateFormat,
  onSelectDate,
}) {
  const buttonRef = useRef(null);
  const tipRef = useRef(null);
  const [open, setOpen] = useState(false);
  const [coords, setCoords] = useState({ top: 0, left: 0, ready: false });

  const hasHoliday = cell.holidays.length > 0;
  const isToday = cell.key === todayKey;
  const primary = cell.holidays[0];
  const color = primary?.colorCode || "#7b39ec";
  const days = hasHoliday ? daysUntil(primary.fromDate) : null;
  const isPassed = days != null && days < 0;
  const isUpcoming = days != null && days >= 0;
  const isSelected = cell.key === selectedDateKey;

  useEffect(() => {
    if (!open || !hasHoliday) return undefined;

    function placeTip() {
      const rect = buttonRef.current?.getBoundingClientRect();
      const tip = tipRef.current;
      if (!rect) return;
      const width = tip?.offsetWidth || 256;
      const height = tip?.offsetHeight || 120;
      const pad = 12;
      const maxLeft = Math.max(pad, window.innerWidth - width - pad);
      let left = rect.left + rect.width / 2 - width / 2;
      left = Math.min(Math.max(pad, left), maxLeft);
      const spaceBelow = window.innerHeight - rect.bottom - pad;
      const showAbove = spaceBelow < height + 8 && rect.top > height + pad;
      const top = showAbove
        ? Math.max(pad, rect.top - height - 8)
        : rect.bottom + 8;
      setCoords({ top, left, ready: true });
    }

    const frame = requestAnimationFrame(() => {
      placeTip();
      requestAnimationFrame(placeTip);
    });
    window.addEventListener("resize", placeTip);
    window.addEventListener("scroll", placeTip, true);
    return () => {
      cancelAnimationFrame(frame);
      window.removeEventListener("resize", placeTip);
      window.removeEventListener("scroll", placeTip, true);
    };
  }, [open, hasHoliday, cell.key, cell.holidays.length]);

  function showTip() {
    if (hasHoliday) setOpen(true);
  }

  return (
    <button
      type="button"
      ref={buttonRef}
      onClick={() => onSelectDate?.(cell.key)}
      onMouseEnter={showTip}
      onMouseLeave={() => {
        setOpen(false);
        setCoords({ top: 0, left: 0, ready: false });
      }}
      onFocus={showTip}
      onBlur={() => {
        setOpen(false);
        setCoords({ top: 0, left: 0, ready: false });
      }}
      className={`relative min-h-12 overflow-visible rounded-xl border p-1.5 text-left transition ${
        isSelected
          ? "border-[var(--violet)] bg-[var(--lavender-soft)]/60 ring-2 ring-[var(--violet)]/25"
          : hasHoliday
            ? isPassed
              ? "border-[var(--border)] bg-[var(--panel-soft)]/80 opacity-80"
              : "border-transparent"
            : isToday
              ? "border-[var(--violet)]/30 bg-[var(--lavender-soft)]/40"
              : "border-transparent bg-[var(--panel-soft)]/40"
      }`}
      style={
        hasHoliday && !isPassed
          ? {
              backgroundColor: `${color}18`,
              boxShadow: `inset 0 0 0 1px ${color}55`,
            }
          : hasHoliday && isPassed
            ? { boxShadow: "inset 0 0 0 1px var(--border)" }
            : undefined
      }
    >
      <div className="flex items-start justify-between gap-0.5">
        <p
          className={`text-[11px] font-semibold tabular-nums ${
            isToday
              ? "text-[var(--violet)]"
              : hasHoliday && isUpcoming
                ? "text-[var(--text)]"
                : "text-[var(--muted)]"
          }`}
        >
          {cell.day}
        </p>
        {hasHoliday ? (
          <span
            className="mt-0.5 h-2 w-2 shrink-0 rounded-full ring-2 ring-[var(--surface)]"
            style={{
              backgroundColor: isPassed ? "var(--muted)" : color,
            }}
            title="Holiday"
          />
        ) : null}
      </div>
      {hasHoliday ? (
        <p
          className={`mt-0.5 truncate text-[10px] font-semibold leading-tight ${
            isPassed
              ? "text-[var(--muted)] line-through decoration-[var(--muted)]/40"
              : ""
          }`}
          style={isPassed ? undefined : { color }}
        >
          {primary.title}
        </p>
      ) : null}
      {open && hasHoliday ? (
        <HolidayHoverCard
          holidays={cell.holidays}
          dateFormat={dateFormat}
          tipRef={tipRef}
          coords={coords}
        />
      ) : null}
    </button>
  );
}

function MonthCalendar({
  year,
  month,
  holidaysByDate,
  dateFormat,
  selectedDateKey,
  onSelectDate,
  onMonthChange,
  onYearChange,
  yearOptions,
  onPrevMonth,
  onNextMonth,
}) {
  const first = new Date(year, month, 1);
  const daysInMonth = new Date(year, month + 1, 0).getDate();
  const startWeekday = first.getDay();
  const todayKey = toDateKey(new Date());

  const monthOptions = useMemo(
    () => MONTHS.map((label, index) => ({ value: String(index), label })),
    []
  );

  const cells = [];
  for (let i = 0; i < startWeekday; i += 1) cells.push(null);
  for (let day = 1; day <= daysInMonth; day += 1) {
    const key = `${year}-${String(month + 1).padStart(2, "0")}-${String(day).padStart(2, "0")}`;
    cells.push({
      day,
      key,
      holidays: holidaysByDate.get(key) || [],
    });
  }

  const holidayDays = cells.filter((c) => c?.holidays?.length).length;

  return (
    <div className="flex h-full min-h-0 flex-1 flex-col overflow-hidden rounded-2xl border border-[var(--border)] bg-[var(--surface)] shadow-[var(--card-shadow)]">
      <div className="shrink-0 border-b border-[var(--border)] p-4">
        <div className="mb-3 flex flex-wrap items-center justify-between gap-2">
          <h3 className="heading-section">Calendar</h3>
          <div className="flex flex-wrap items-center gap-2 text-[10px] text-[var(--muted)]">
            <span className="inline-flex items-center gap-1">
              <span className="h-2 w-2 rounded-full bg-[var(--violet)]" />
              Upcoming
            </span>
            <span className="inline-flex items-center gap-1">
              <span className="h-2 w-2 rounded-full bg-[var(--muted)]" />
              Passed
            </span>
            <span>
              · {holidayDays} holiday{holidayDays === 1 ? "" : "s"}
            </span>
          </div>
        </div>

        <div className="grid gap-2 sm:grid-cols-[1fr_1fr_auto]">
          <CalendarSelect
            label="Month"
            value={String(month)}
            onChange={(value) => onMonthChange(Number(value))}
            options={monthOptions}
          />
          <CalendarSelect
            label="Year"
            value={String(year)}
            onChange={(value) => onYearChange(Number(value))}
            options={yearOptions}
          />
          <div className="flex items-end gap-1">
            <button
              type="button"
              className="inline-flex h-10 w-10 items-center justify-center rounded-xl border border-[var(--border)] bg-[var(--surface)] text-[var(--muted)] transition hover:bg-[var(--panel-soft)]"
              onClick={onPrevMonth}
              aria-label="Previous month"
            >
              <ChevronLeft className="h-4 w-4" />
            </button>
            <button
              type="button"
              className="inline-flex h-10 w-10 items-center justify-center rounded-xl border border-[var(--border)] bg-[var(--surface)] text-[var(--muted)] transition hover:bg-[var(--panel-soft)]"
              onClick={onNextMonth}
              aria-label="Next month"
            >
              <ChevronRight className="h-4 w-4" />
            </button>
          </div>
        </div>
      </div>

      <div className="min-h-0 flex-1 overflow-y-auto p-4">

      <div className="mb-1 grid grid-cols-7 gap-1 text-center text-[10px] font-semibold uppercase tracking-wide text-[var(--muted)]">
        {WEEKDAYS.map((d) => (
          <span key={d} className="py-1">
            {d}
          </span>
        ))}
      </div>

      <div className="grid grid-cols-7 gap-1 overflow-visible">
        {cells.map((cell, index) => {
          if (!cell) return <span key={`e-${index}`} className="min-h-14" />;
          return (
            <CalendarDayButton
              key={cell.key}
              cell={cell}
              todayKey={todayKey}
              selectedDateKey={selectedDateKey}
              dateFormat={dateFormat}
              onSelectDate={onSelectDate}
            />
          );
        })}
      </div>
      </div>
    </div>
  );
}

export function HolidaysView({ dateFormat = "DD/MM/YYYY" }) {
  const now = new Date();
  const currentYear = now.getFullYear();
  const { searchParams } = usePortalQuery();
  const [year, setYear] = useState(() =>
    readQueryInt(searchParams, "year", currentYear)
  );
  const [draftYear, setDraftYear] = useState(String(year));
  const [filter, setFilter] = useState(() =>
    readQueryString(searchParams, "filter", "upcoming")
  );
  const [listQuery, setListQuery] = useState(() =>
    readQueryString(searchParams, "q", "")
  );
  const [viewMonth, setViewMonth] = useState(now.getMonth());
  const [selectedDateKey, setSelectedDateKey] = useState(() => toDateKey(now));

  usePersistListQuery(
    { year, filter, q: listQuery },
    { year: String(currentYear), filter: "upcoming", q: "" },
    [year, filter, listQuery]
  );

  const { rows, total, loading, error, refetch } = useHolidays({ year });

  useEffect(() => {
    let alive = true;
    queueMicrotask(() => {
      if (!alive) return;
      setDraftYear(String(year));
    });
    return () => {
      alive = false;
    };
  }, [year]);

  const yearFilterOptions = useMemo(() => {
    const y = currentYear;
    const options = [];
    for (let i = y - 5; i <= y + 2; i += 1) {
      options.push({ value: String(i), label: String(i) });
    }
    return options;
  }, [currentYear]);

  const yearFilterActive = year !== currentYear;

  const stats = useMemo(() => {
    const today = new Date();
    const currentMonth = today.getMonth();
    const currentYear = today.getFullYear();
    let upcoming = 0;
    let optional = 0;
    let thisMonth = 0;
    for (const row of rows) {
      const days = daysUntil(row.fromDate);
      if (row.isOptional) optional += 1;
      if (days != null && days >= 0) upcoming += 1;
      const d = parseLocalDate(row.fromDate);
      if (d && d.getFullYear() === currentYear && d.getMonth() === currentMonth) {
        thisMonth += 1;
      }
    }
    return {
      total: total || rows.length,
      upcoming,
      optional,
      thisMonth,
    };
  }, [rows, total]);

  const filteredRows = useMemo(() => {
    const q = listQuery.trim().toLowerCase();
    return rows.filter((row) => {
      const days = daysUntil(row.fromDate);
      if (filter === "upcoming") {
        if (!(days != null && days >= 0)) return false;
      } else if (filter === "passed") {
        if (!(days != null && days < 0)) return false;
      } else if (filter === "optional") {
        if (!row.isOptional) return false;
      }
      if (!q) return true;
      const hay = [row.title, row.description, row.fromDate, formatDate(row.fromDate)]
        .filter(Boolean)
        .join(" ")
        .toLowerCase();
      return hay.includes(q);
    });
  }, [rows, filter, listQuery]);

  const grouped = useMemo(() => {
    const map = new Map();
    for (const row of filteredRows) {
      const d = parseLocalDate(row.fromDate);
      const key = d
        ? `${d.getFullYear()}-${d.getMonth()}`
        : "unknown";
      if (!map.has(key)) {
        map.set(key, {
          key,
          year: d?.getFullYear() ?? year,
          month: d?.getMonth() ?? 0,
          items: [],
        });
      }
      map.get(key).items.push(row);
    }
    return Array.from(map.values());
  }, [filteredRows, year]);

  const holidaysByDate = useMemo(() => buildHolidaysByDate(rows), [rows]);

  const nextHoliday = useMemo(() => {
    return (
      rows.find((row) => {
        const days = daysUntil(row.fromDate);
        return days != null && days >= 0;
      }) || null
    );
  }, [rows]);

  const FILTERS = [
    { value: "all", label: "All" },
    { value: "upcoming", label: "Upcoming" },
    { value: "optional", label: "Optional" },
    { value: "passed", label: "Passed" },
  ];

  const goPrevMonth = () => {
    setViewMonth((m) => {
      if (m === 0) {
        setYear((y) => y - 1);
        return 11;
      }
      return m - 1;
    });
  };

  const goNextMonth = () => {
    setViewMonth((m) => {
      if (m === 11) {
        setYear((y) => y + 1);
        return 0;
      }
      return m + 1;
    });
  };

  return (
    <PortalPage
      fill
      title="Company Holidays"
      subtitle="View the official holiday calendar for your company."
      error={error}
      actions={
        <>
          <MetaBadge>{year}</MetaBadge>
          <Button
            type="button"
            variant="outline"
            className="h-10 rounded-xl"
            onClick={refetch}
          >
            <RefreshCw className="h-4 w-4" />
            Refresh
          </Button>
        </>
      }
    >
      <CollapsibleSection title="Summary" className="shrink-0">
        <div className={SUMMARY_GRID_CLASS}>
          <SoftStat label="Total" value={stats.total} />
          <SoftStat label="Upcoming" value={stats.upcoming} color="#7b39ec" />
          <SoftStat label="Optional" value={stats.optional} color="#f59e0b" />
          <SoftStat label="This month" value={stats.thisMonth} color="#22c55e" />
        </div>
      </CollapsibleSection>

      <div
        data-fill-panel=""
        className="grid min-h-0 flex-1 gap-4 overflow-hidden xl:grid-cols-[1.1fr_0.9fr] [&>*]:min-h-0"
      >
        <Card
          className="flex min-h-0 flex-col overflow-hidden !p-0"
          bodyClassName="!min-h-0 !p-0 flex min-h-0 flex-1 flex-col overflow-hidden"
        >
          <div className="flex shrink-0 flex-wrap items-center justify-between gap-2 border-b border-[var(--border)] px-3 py-1.5 sm:px-3.5">
            <h2 className="heading-section">Holiday Logs</h2>
            <PanelTotalCount count={filteredRows.length} />
          </div>
          <ListToolbar
            tabs={FILTERS}
            tab={filter}
            onTabChange={setFilter}
            recordCount={filteredRows.length}
            search={listQuery}
            onSearchChange={setListQuery}
            searchPlaceholder="Search logs…"
            filterTitle="Filters"
            filterSubtitle="Calendar year"
            filterActive={yearFilterActive}
            activeFilterCount={yearFilterActive ? 1 : 0}
            drawerFields={
              <SearchableFilter
                label="Calendar year"
                value={draftYear}
                onChange={setDraftYear}
                options={yearFilterOptions}
                defaultValue={String(currentYear)}
              />
            }
            onApplyFilters={() => {
              setYear(Number(draftYear));
            }}
            onResetFilters={() => {
              setDraftYear(String(currentYear));
              setYear(currentYear);
            }}
            onRefresh={refetch}
          />
          <div className="min-h-0 flex-1 overflow-y-auto p-4 md:p-5">
            {loading ? (
              <PageLoader
                compact
                label="Loading holidays"
                hint="Fetching company holiday calendar…"
              />
            ) : filteredRows.length === 0 ? (
              <div className="flex min-h-[180px] flex-col items-center justify-center rounded-2xl border border-dashed border-[var(--border)] bg-[var(--panel-soft)] px-4 text-center">
                <span className="inline-flex h-12 w-12 items-center justify-center rounded-2xl bg-[var(--lavender-soft)] text-[var(--violet)]">
                  <Inbox className="h-6 w-6" />
                </span>
                <p className="mt-3 text-[14px] font-semibold text-[var(--text)]">
                  No holidays found
                </p>
                <p className="mt-1 max-w-sm text-[12px] text-[var(--muted)]">
                  There are no {filter === "all" ? "" : `${filter} `}holidays for{" "}
                  {year}.
                </p>
              </div>
            ) : (
              <div className="space-y-5">
                {(filter === "all" || filter === "upcoming") && nextHoliday ? (
                  <NextHolidayBanner
                    holiday={nextHoliday}
                    dateFormat={dateFormat}
                  />
                ) : null}
                {grouped.map((group) => (
                  <div key={group.key}>
                    <p className="mb-2 text-[11px] font-semibold uppercase tracking-wide text-[var(--muted)]">
                      {MONTHS[group.month]} {group.year}
                    </p>
                    <ul className="space-y-2">
                      {group.items.map((holiday, index) => (
                        <HolidayLogItem
                          key={
                            holiday.occurrenceId ||
                            holiday.holidayId ||
                            `${holiday.title}-${holiday.fromDate}-${index}`
                          }
                          holiday={holiday}
                          index={index}
                          nextHoliday={nextHoliday}
                          dateFormat={dateFormat}
                        />
                      ))}
                    </ul>
                  </div>
                ))}
              </div>
            )}
          </div>
        </Card>

        <MonthCalendar
          year={year}
          month={viewMonth}
          holidaysByDate={holidaysByDate}
          dateFormat={dateFormat}
          selectedDateKey={selectedDateKey}
          onSelectDate={setSelectedDateKey}
          onMonthChange={setViewMonth}
          onYearChange={(nextYear) => {
            setYear(nextYear);
            setDraftYear(String(nextYear));
          }}
          yearOptions={yearFilterOptions}
          onPrevMonth={goPrevMonth}
          onNextMonth={goNextMonth}
        />
      </div>
    </PortalPage>
  );
}
