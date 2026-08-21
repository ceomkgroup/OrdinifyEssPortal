"use client";

import { useEffect, useMemo, useState } from "react";
import {
  CalendarDays,
  ChevronLeft,
  ChevronRight,
  Clock3,
  Info,
  Umbrella,
} from "lucide-react";
import { Avatar } from "@/components/ui/Avatar";
import { FlashBanner } from "@/components/ui/FlashBanner";
import { PageLoader } from "@/components/ui/Spinner";
import { useDashboard } from "@/hooks/useDashboard";
import { useRoster } from "@/hooks/useRoster";
import { formatTime, getDisplayName } from "@/lib/format";

const WEEKDAYS = ["Mon", "Tue", "Wed", "Thu", "Fri", "Sat", "Sun"];

const MONTH_NAMES = [
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

function formatYmd(date) {
  const y = date.getFullYear();
  const m = String(date.getMonth() + 1).padStart(2, "0");
  const d = String(date.getDate()).padStart(2, "0");
  return `${y}-${m}-${d}`;
}

function parseYmd(ymd) {
  const [y, m, d] = String(ymd).split("-").map(Number);
  return new Date(y, (m || 1) - 1, d || 1);
}

function monthBounds(year, month) {
  return {
    from: formatYmd(new Date(year, month - 1, 1)),
    to: formatYmd(new Date(year, month, 0)),
  };
}

function startOfWeekMonday(date) {
  const d = new Date(date);
  d.setHours(0, 0, 0, 0);
  const day = d.getDay();
  const diff = day === 0 ? -6 : 1 - day;
  d.setDate(d.getDate() + diff);
  return d;
}

function addDays(date, n) {
  const d = new Date(date);
  d.setDate(d.getDate() + n);
  return d;
}

/** Build Mon–Sun month grid for viewYear/viewMonth. */
function buildMonthCells(viewYear, viewMonth) {
  const first = new Date(viewYear, viewMonth - 1, 1);
  const last = new Date(viewYear, viewMonth, 0);
  const gridStart = startOfWeekMonday(first);
  const gridEnd = addDays(startOfWeekMonday(last), 6);

  const cells = [];
  let cur = new Date(gridStart);
  while (cur <= gridEnd) {
    const key = formatYmd(cur);
    cells.push({
      key,
      date: key,
      day: cur.getDate(),
      inMonth: cur.getMonth() === viewMonth - 1,
    });
    cur = addDays(cur, 1);
  }
  return cells;
}

function clock24(time) {
  if (!time) return "—";
  const match = String(time).trim().match(/^(\d{1,2}):(\d{2})/);
  if (!match) return String(time);
  return `${match[1].padStart(2, "0")}:${match[2]}`;
}

function parseMins(time) {
  if (!time) return null;
  const match = String(time).trim().match(/^(\d{1,2}):(\d{2})/);
  if (!match) return null;
  return Number(match[1]) * 60 + Number(match[2]);
}

function hoursBetween(start, end) {
  const a = parseMins(start);
  const b = parseMins(end);
  if (a == null || b == null) return 0;
  let mins = b - a;
  if (mins <= 0) mins += 24 * 60;
  return mins / 60;
}

function formatHoursTotal(hours) {
  const h = Math.floor(hours);
  const m = Math.round((hours - h) * 60);
  return `${String(h).padStart(2, "0")}:${String(m).padStart(2, "0")}`;
}

function daysInRange(from, to) {
  return Math.round((parseYmd(to) - parseYmd(from)) / 86400000) + 1;
}

function shortDate(ymd) {
  if (!ymd) return "—";
  const d = parseYmd(ymd);
  const day = String(d.getDate()).padStart(2, "0");
  const mon = d.toLocaleDateString("en-GB", { month: "short" });
  return `${day} ${mon} ${d.getFullYear()}`;
}

function ShiftPill({ row }) {
  if (!row) return null;

  if (row.isHoliday || row.isOff) {
    return (
      <div className="mt-1.5 w-full rounded-lg border border-[var(--violet)]/15 bg-[var(--lavender-soft)] px-2 py-1.5">
        <div className="flex items-center gap-1.5">
          <span className="h-1.5 w-1.5 shrink-0 rounded-full bg-[var(--lavender)]" />
          <span className="truncate text-[11px] font-semibold text-[var(--violet)]">
            {row.isHoliday ? "Holiday" : "Day Off"}
          </span>
        </div>
      </div>
    );
  }

  return (
    <div className="mt-1.5 w-full rounded-lg border border-[var(--success)]/30 bg-[var(--success-soft)] px-2 py-1.5">
      <div className="flex items-center gap-1.5">
        <span className="h-1.5 w-1.5 shrink-0 rounded-full bg-[var(--success)]" />
        <span className="truncate text-[11px] font-bold capitalize text-[var(--success)]">
          {row.shiftName}
        </span>
      </div>
      <div className="mt-0.5 flex items-center gap-1 pl-3 text-[10px] font-semibold tabular-nums text-[var(--text)]">
        <Clock3 className="h-3 w-3 shrink-0 text-[var(--muted)]" />
        <span>
          {clock24(row.startTime)} - {clock24(row.endTime)}
        </span>
      </div>
    </div>
  );
}

function SummaryRow({ icon: Icon, label, value, soft, tone }) {
  return (
    <div className="flex items-center gap-3 border-b border-[var(--border)] py-2.5 last:border-0">
      <span
        className={`inline-flex h-9 w-9 shrink-0 items-center justify-center rounded-xl ${soft} ${tone}`}
      >
        <Icon className="h-4 w-4" />
      </span>
      <p className="min-w-0 flex-1 text-[12px] text-[var(--muted)]">{label}</p>
      <p className="text-[15px] font-bold tabular-nums text-[var(--text)]">
        {value}
      </p>
    </div>
  );
}

export function RosterView() {
  const now = useMemo(() => {
    const d = new Date();
    d.setHours(0, 0, 0, 0);
    return d;
  }, []);

  const initial = monthBounds(now.getFullYear(), now.getMonth() + 1);

  const [fromDraft, setFromDraft] = useState(initial.from);
  const [toDraft, setToDraft] = useState(initial.to);
  const [from, setFrom] = useState(initial.from);
  const [to, setTo] = useState(initial.to);
  const [selectedDate, setSelectedDate] = useState(null);
  const [viewYear, setViewYear] = useState(now.getFullYear());
  const [viewMonth, setViewMonth] = useState(now.getMonth() + 1);

  const { rows, loading, error } = useRoster({ from, to });
  const { data: dash } = useDashboard();

  const employee = dash?.employee;
  const timeFormat = dash?.companySettings?.timeFormat || "12h";
  const timeZone =
    dash?.companySettings?.timeZone ||
    dash?.companySettings?.timezone ||
    "Asia/Karachi";

  const displayName = getDisplayName(employee) || "Employee";
  const empCode =
    employee?.employeeCode || employee?.empCode || employee?.code || "—";

  const byDate = useMemo(() => {
    const map = new Map();
    for (const row of rows) {
      if (row.date) map.set(row.date, row);
    }
    return map;
  }, [rows]);

  const cells = useMemo(
    () => buildMonthCells(viewYear, viewMonth),
    [viewYear, viewMonth]
  );

  const todayKey = formatYmd(now);

  const selectedRow = selectedDate ? byDate.get(selectedDate) || null : null;

  const stats = useMemo(() => {
    let assigned = 0;
    let leave = 0;
    let holidays = 0;
    let totalHours = 0;
    const covered = new Set();

    for (const row of rows) {
      covered.add(row.date);
      if (row.dayKind === "holiday") holidays += 1;
      else if (row.dayKind === "weekOff") leave += 1;
      else {
        assigned += 1;
        totalHours += hoursBetween(row.startTime, row.endTime);
      }
    }

    const periodDays = daysInRange(from, to);
    return {
      assigned,
      totalHours,
      leave,
      holidays,
      noShift: Math.max(0, periodDays - covered.size),
    };
  }, [rows, from, to]);

  // Auto-select a day when range/data changes
  useEffect(() => {
    if (
      selectedDate &&
      selectedDate >= from &&
      selectedDate <= to &&
      byDate.has(selectedDate)
    ) {
      return;
    }

    if (todayKey >= from && todayKey <= to && byDate.has(todayKey)) {
      setSelectedDate(todayKey);
      return;
    }

    const first = rows.find((r) => r.dayKind === "working") || rows[0];
    setSelectedDate(first?.date || null);
  }, [from, to, rows, byDate, selectedDate, todayKey]);

  function applyPeriod() {
    let nextFrom = fromDraft;
    let nextTo = toDraft;
    if (!nextFrom || !nextTo) return;
    if (nextFrom > nextTo) {
      const tmp = nextFrom;
      nextFrom = nextTo;
      nextTo = tmp;
      setFromDraft(nextFrom);
      setToDraft(nextTo);
    }
    setFrom(nextFrom);
    setTo(nextTo);
    const d = parseYmd(nextFrom);
    setViewYear(d.getFullYear());
    setViewMonth(d.getMonth() + 1);
    setSelectedDate(null);
  }

  function goPrevMonth() {
    const d = new Date(viewYear, viewMonth - 2, 1);
    setViewYear(d.getFullYear());
    setViewMonth(d.getMonth() + 1);
  }

  function goNextMonth() {
    const d = new Date(viewYear, viewMonth, 1);
    setViewYear(d.getFullYear());
    setViewMonth(d.getMonth() + 1);
  }

  function goToday() {
    const y = now.getFullYear();
    const m = now.getMonth() + 1;
    const bounds = monthBounds(y, m);
    setViewYear(y);
    setViewMonth(m);
    setFromDraft(bounds.from);
    setToDraft(bounds.to);
    setFrom(bounds.from);
    setTo(bounds.to);
    setSelectedDate(todayKey);
  }

  if (loading && rows.length === 0) {
    return (
      <PageLoader label="Loading shift roster" hint="Fetching your roster…" />
    );
  }

  return (
    <div className="flex w-full flex-col gap-4">
      {/* Header */}
      <div className="flex flex-col gap-3 lg:flex-row lg:items-start lg:justify-between">
        <div>
          <h1 className="text-[26px] font-bold tracking-tight text-[var(--text)]">
            My Shift Roster
          </h1>
          <p className="mt-1 text-[13px] text-[var(--muted)]">
            View your assigned shifts for the selected period.
          </p>
        </div>
        <div className="flex flex-wrap items-center gap-4 text-[12px] font-medium text-[var(--text)]">
          <span className="inline-flex items-center gap-2">
            <span className="h-2.5 w-2.5 rounded-full bg-[var(--success)]" />
            Assigned Shift
          </span>
          <span className="inline-flex items-center gap-2">
            <span className="h-2.5 w-2.5 rounded-full bg-[var(--warning)]" />
            On Leave
          </span>
          <span className="inline-flex items-center gap-2">
            <span className="h-2.5 w-2.5 rounded-full bg-[var(--lavender)]" />
            Off / Holiday
          </span>
          <span className="inline-flex items-center gap-2">
            <span className="h-2.5 w-2.5 rounded-full bg-[#c4c4c4]" />
            No Shift
          </span>
        </div>
      </div>

      {/* Employee + Period */}
      <div className="flex flex-col gap-4 rounded-2xl border border-[var(--border)] bg-[var(--surface)] p-4 shadow-[var(--card-shadow)] lg:flex-row lg:items-center lg:justify-between">
        <div className="flex min-w-0 items-center gap-3">
          <Avatar person={employee} name={displayName} size={48} />
          <div className="min-w-0">
            <p className="truncate text-[16px] font-bold text-[var(--text)]">
              {displayName}
            </p>
            <p className="text-[12px] text-[var(--muted)]">
              Employee Code: {empCode}
            </p>
          </div>
        </div>

        <div className="flex w-full flex-col gap-1.5 lg:w-auto lg:min-w-[360px]">
          <span className="text-[11px] font-semibold uppercase tracking-wide text-[var(--muted)]">
            Period
          </span>
          <div className="flex flex-col gap-2 rounded-xl border border-[var(--border)] bg-[var(--panel-soft)] p-2 sm:flex-row sm:items-center">
            <div className="flex min-w-0 flex-1 items-center gap-2 rounded-lg border border-[var(--border)] bg-[var(--surface)] px-2.5 py-1.5">
              <CalendarDays className="h-4 w-4 shrink-0 text-[var(--violet)]" />
              <input
                type="date"
                value={fromDraft}
                onChange={(e) => setFromDraft(e.target.value)}
                aria-label="From date"
                className="min-w-0 flex-1 border-0 bg-transparent text-[13px] font-semibold text-[var(--text)] outline-none"
              />
            </div>
            <span className="hidden text-[12px] text-[var(--muted)] sm:inline">
              to
            </span>
            <div className="flex min-w-0 flex-1 items-center gap-2 rounded-lg border border-[var(--border)] bg-[var(--surface)] px-2.5 py-1.5">
              <input
                type="date"
                value={toDraft}
                min={fromDraft || undefined}
                onChange={(e) => setToDraft(e.target.value)}
                aria-label="To date"
                className="min-w-0 flex-1 border-0 bg-transparent text-[13px] font-semibold text-[var(--text)] outline-none"
              />
            </div>
            <button
              type="button"
              onClick={applyPeriod}
              className="inline-flex h-9 shrink-0 items-center justify-center rounded-lg bg-[var(--violet)] px-3.5 text-[12px] font-semibold text-white hover:brightness-110"
            >
              Apply
            </button>
          </div>
          <p className="text-[11px] text-[var(--muted)]">
            Active: {shortDate(from)} – {shortDate(to)}
          </p>
        </div>
      </div>

      {error ? (
        <FlashBanner message={error} tone="danger" autoDismiss={false} />
      ) : null}

      <div className="grid items-start gap-4 xl:grid-cols-[minmax(0,1fr)_300px]">
        {/* Calendar */}
        <section className="overflow-hidden rounded-2xl border border-[var(--border)] bg-[var(--surface)] shadow-[var(--card-shadow)]">
          <div className="flex flex-col gap-3 border-b border-[var(--border)] px-4 py-3 sm:flex-row sm:items-center sm:justify-between">
            <div className="inline-flex items-center overflow-hidden rounded-xl border border-[var(--border)]">
              <button
                type="button"
                aria-label="Previous month"
                onClick={goPrevMonth}
                className="inline-flex h-9 w-9 items-center justify-center border-r border-[var(--border)] hover:bg-[var(--panel-soft)]"
              >
                <ChevronLeft className="h-4 w-4" />
              </button>
              <button
                type="button"
                onClick={goToday}
                className="h-9 px-3 text-[13px] font-semibold hover:bg-[var(--panel-soft)]"
              >
                Today
              </button>
              <button
                type="button"
                aria-label="Next month"
                onClick={goNextMonth}
                className="inline-flex h-9 w-9 items-center justify-center border-l border-[var(--border)] hover:bg-[var(--panel-soft)]"
              >
                <ChevronRight className="h-4 w-4" />
              </button>
            </div>
            <h2 className="text-[15px] font-semibold text-[var(--text)]">
              {MONTH_NAMES[viewMonth - 1]} {viewYear}
            </h2>
          </div>

          {loading ? (
            <div className="p-6">
              <PageLoader compact label="Updating roster" />
            </div>
          ) : (
            <>
              <div className="grid grid-cols-7 border-b border-[var(--border)]">
                {WEEKDAYS.map((d) => (
                  <div
                    key={d}
                    className="px-2 py-2.5 text-center text-[13px] font-medium text-[var(--muted)]"
                  >
                    {d}
                  </div>
                ))}
              </div>

              <div className="grid grid-cols-7">
                {cells.map((cell) => {
                  const inFilter = cell.date >= from && cell.date <= to;
                  const row =
                    cell.inMonth && inFilter ? byDate.get(cell.date) : null;
                  const isToday = cell.date === todayKey;
                  const isSelected =
                    cell.inMonth && inFilter && cell.date === selectedDate;

                  return (
                    <button
                      key={cell.key}
                      type="button"
                      disabled={!cell.inMonth || !inFilter}
                      onClick={() => {
                        if (cell.inMonth && inFilter) {
                          setSelectedDate(cell.date);
                        }
                      }}
                      className={`flex min-h-[96px] flex-col border-b border-r border-[var(--border)] p-2 text-left last:border-r-0 sm:min-h-[110px] ${
                        !cell.inMonth || !inFilter
                          ? "bg-[var(--panel-soft)]/60"
                          : isSelected
                            ? "bg-[var(--lavender-soft)]/40"
                            : "bg-[var(--surface)] hover:bg-[var(--panel-soft)]/50"
                      }`}
                    >
                      <span
                        className={`inline-flex h-6 w-6 items-center justify-center rounded-full text-[13px] font-medium tabular-nums ${
                          isToday && cell.inMonth
                            ? "bg-[var(--violet)] font-semibold text-white"
                            : cell.inMonth && inFilter
                              ? "text-[var(--text)]"
                              : "text-[var(--muted)]/45"
                        }`}
                      >
                        {cell.day}
                      </span>
                      {cell.inMonth && inFilter ? (
                        <ShiftPill row={row} />
                      ) : null}
                    </button>
                  );
                })}
              </div>
            </>
          )}

          <p className="flex items-center justify-center gap-1.5 border-t border-[var(--border)] px-4 py-3 text-[11px] text-[var(--muted)]">
            <Info className="h-3.5 w-3.5" />
            All times are based on company time zone ({timeZone}).
          </p>
        </section>

        {/* Right */}
        <aside className="flex flex-col gap-3">
          <div className="rounded-2xl border border-[var(--border)] bg-[var(--surface)] p-4 shadow-[var(--card-shadow)]">
            <h3 className="text-[14px] font-semibold text-[var(--text)]">
              Shift Details
            </h3>

            {!selectedRow ? (
              <p className="mt-6 text-center text-[12px] text-[var(--muted)]">
                Select a day to view shift details.
              </p>
            ) : (
              <div className="mt-3 space-y-3">
                <div className="flex items-center justify-between gap-2 rounded-xl border border-[var(--success)]/25 bg-[var(--success-soft)] px-3 py-2.5">
                  <div className="flex min-w-0 items-center gap-2">
                    <span className="h-2 w-2 shrink-0 rounded-full bg-[var(--success)]" />
                    <span className="truncate text-[14px] font-bold capitalize text-[var(--success)]">
                      {selectedRow.shiftName}
                    </span>
                  </div>
                  <span className="shrink-0 rounded-md bg-[var(--surface)] px-2 py-0.5 text-[10px] font-bold uppercase tracking-wide text-[var(--violet)] ring-1 ring-[var(--border)]">
                    {selectedRow.shiftTypeRaw || selectedRow.shiftType}
                  </span>
                </div>

                {!selectedRow.isOff ? (
                  <>
                    <div className="flex items-center justify-between gap-2 rounded-xl border border-[var(--border)] bg-[var(--panel-soft)] px-3 py-3">
                      <div>
                        <p className="text-[15px] font-bold tabular-nums text-[var(--text)]">
                          {formatTime(selectedRow.startTime, timeFormat)}
                        </p>
                        <p className="text-[11px] text-[var(--muted)]">
                          Start Time
                        </p>
                      </div>
                      <span className="text-[var(--muted)]">→</span>
                      <div className="text-right">
                        <p className="text-[15px] font-bold tabular-nums text-[var(--text)]">
                          {formatTime(selectedRow.endTime, timeFormat)}
                        </p>
                        <p className="text-[11px] text-[var(--muted)]">
                          End Time
                        </p>
                      </div>
                    </div>

                    <div className="space-y-2">
                      <div className="flex items-center justify-between gap-2 text-[13px]">
                        <span className="inline-flex items-center gap-1.5 text-[var(--muted)]">
                          <Clock3 className="h-3.5 w-3.5" />
                          Late In Grace
                        </span>
                        <span className="font-semibold text-[var(--text)]">
                          {selectedRow.lateInGracePeriodMinutes || 0} minutes
                        </span>
                      </div>
                      <div className="flex items-center justify-between gap-2 text-[13px]">
                        <span className="inline-flex items-center gap-1.5 text-[var(--muted)]">
                          <Clock3 className="h-3.5 w-3.5" />
                          Early Out Grace
                        </span>
                        <span className="font-semibold text-[var(--text)]">
                          {selectedRow.earlyOutGracePeriodMinutes || 0} minutes
                        </span>
                      </div>
                    </div>
                  </>
                ) : (
                  <p className="text-[12px] text-[var(--muted)]">
                    No working hours on this day.
                  </p>
                )}
              </div>
            )}
          </div>

          <div className="rounded-2xl border border-[var(--border)] bg-[var(--surface)] p-4 shadow-[var(--card-shadow)]">
            <h3 className="text-[14px] font-semibold text-[var(--text)]">
              Roster Summary
            </h3>
            <div className="mt-1">
              <SummaryRow
                icon={CalendarDays}
                label="Assigned Days"
                value={String(stats.assigned)}
                soft="bg-[var(--success-soft)]"
                tone="text-[var(--success)]"
              />
              <SummaryRow
                icon={Clock3}
                label="Total Shift Hours"
                value={formatHoursTotal(stats.totalHours)}
                soft="bg-[var(--warning-soft)]"
                tone="text-[var(--warning)]"
              />
              <SummaryRow
                icon={CalendarDays}
                label="On Leave Days"
                value={String(stats.leave)}
                soft="bg-[var(--warning-soft)]"
                tone="text-[var(--warning)]"
              />
              <SummaryRow
                icon={Umbrella}
                label="Holidays"
                value={String(stats.holidays)}
                soft="bg-[var(--lavender-soft)]"
                tone="text-[var(--violet)]"
              />
              <SummaryRow
                icon={CalendarDays}
                label="No Shift Days"
                value={String(stats.noShift)}
                soft="bg-[var(--muted-bg)]"
                tone="text-[var(--muted)]"
              />
            </div>
          </div>
        </aside>
      </div>
    </div>
  );
}
