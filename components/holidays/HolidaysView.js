"use client";

import {
  CalendarDays,
  ChevronLeft,
  ChevronRight,
  Gift,
  Inbox,
  RefreshCw,
  Sparkles,
} from "lucide-react";
import { useEffect, useMemo, useState } from "react";
import { Button } from "@/components/ui/Button";
import { Card } from "@/components/ui/Card";
import { FilterSelect } from "@/components/ui/ListFilters";
import { ListToolbar } from "@/components/ui/ListToolbar";
import { MetaBadge } from "@/components/ui/MetaBadge";
import { CollapsibleSection } from "@/components/ui/CollapsibleSection";
import { PortalPage } from "@/components/ui/PortalPage";
import { PageLoader } from "@/components/ui/Spinner";
import { useHolidays } from "@/hooks/useHolidays";
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

function StatCard({ label, value, icon: Icon, tone }) {
  return (
    <div className="rounded-2xl border border-[var(--border)] bg-[var(--surface)] p-4 shadow-[var(--card-shadow)]">
      <div className="flex items-start justify-between gap-3">
        <div>
          <p className="text-[11px] font-semibold uppercase tracking-wide text-[var(--muted)]">
            {label}
          </p>
          <p className="mt-1.5 text-[22px] font-bold tabular-nums text-[var(--text)]">
            {value}
          </p>
        </div>
        <span
          className={`inline-flex h-10 w-10 items-center justify-center rounded-xl ${tone}`}
        >
          <Icon className="h-5 w-5" />
        </span>
      </div>
    </div>
  );
}

function MonthCalendar({ year, month, holidaysByDate, dateFormat }) {
  const first = new Date(year, month, 1);
  const daysInMonth = new Date(year, month + 1, 0).getDate();
  const startWeekday = first.getDay();
  const todayKey = toDateKey(new Date());

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
    <div className="rounded-2xl border border-[var(--border)] bg-[var(--surface)] p-4 shadow-[var(--card-shadow)]">
      <div className="mb-3 flex items-center justify-between gap-2">
        <h3 className="text-[14px] font-semibold text-[var(--text)]">
          {MONTHS[month]} {year}
        </h3>
        <span className="text-[11px] text-[var(--muted)]">
          {holidayDays} holiday{holidayDays === 1 ? "" : "s"}
        </span>
      </div>

      <div className="mb-1 grid grid-cols-7 gap-1 text-center text-[10px] font-semibold uppercase tracking-wide text-[var(--muted)]">
        {WEEKDAYS.map((d) => (
          <span key={d} className="py-1">
            {d}
          </span>
        ))}
      </div>

      <div className="grid grid-cols-7 gap-1">
        {cells.map((cell, index) => {
          if (!cell) return <span key={`e-${index}`} className="min-h-14" />;
          const hasHoliday = cell.holidays.length > 0;
          const isToday = cell.key === todayKey;
          const color = cell.holidays[0]?.colorCode || "var(--violet)";

          return (
            <div
              key={cell.key}
              title={
                hasHoliday
                  ? cell.holidays
                      .map(
                        (h) =>
                          `${h.title} · ${formatDate(h.fromDate, dateFormat)}`
                      )
                      .join(", ")
                  : undefined
              }
              className={`min-h-14 rounded-xl border p-1.5 ${
                hasHoliday
                  ? "border-transparent"
                  : isToday
                    ? "border-[var(--violet)]/30 bg-[var(--lavender-soft)]/40"
                    : "border-transparent bg-[var(--panel-soft)]/40"
              }`}
              style={
                hasHoliday
                  ? {
                      backgroundColor: `${color}18`,
                      boxShadow: `inset 0 0 0 1px ${color}55`,
                    }
                  : undefined
              }
            >
              <p
                className={`text-[11px] font-semibold tabular-nums ${
                  isToday ? "text-[var(--violet)]" : "text-[var(--muted)]"
                }`}
              >
                {cell.day}
              </p>
              {hasHoliday ? (
                <p
                  className="mt-0.5 truncate text-[10px] font-semibold leading-tight"
                  style={{ color }}
                >
                  {cell.holidays[0].title}
                </p>
              ) : null}
            </div>
          );
        })}
      </div>
    </div>
  );
}

export function HolidaysView({ dateFormat = "DD/MM/YYYY" }) {
  const now = new Date();
  const currentYear = now.getFullYear();
  const [year, setYear] = useState(currentYear);
  const [draftYear, setDraftYear] = useState(String(currentYear));
  const [filter, setFilter] = useState("all"); // all | upcoming | optional | passed
  const [viewMonth, setViewMonth] = useState(now.getMonth());

  const { rows, total, loading, error, refetch } = useHolidays({ year });

  useEffect(() => {
    setDraftYear(String(year));
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
    return rows.filter((row) => {
      const days = daysUntil(row.fromDate);
      if (filter === "upcoming") return days != null && days >= 0;
      if (filter === "passed") return days != null && days < 0;
      if (filter === "optional") return row.isOptional;
      return true;
    });
  }, [rows, filter]);

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

  const holidaysByDate = useMemo(() => {
    const map = new Map();
    for (const row of rows) {
      const key = row.fromDate;
      if (!key) continue;
      if (!map.has(key)) map.set(key, []);
      map.get(key).push(row);
    }
    return map;
  }, [rows]);

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

  return (
    <PortalPage
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

      {nextHoliday ? (
        <div className="flex flex-wrap items-center gap-3 rounded-2xl border border-[var(--violet)]/20 bg-gradient-to-br from-[var(--lavender-soft)]/80 via-[var(--surface)] to-[var(--surface)] px-4 py-3.5">
          <span className="inline-flex h-10 w-10 items-center justify-center rounded-xl bg-[var(--surface)] text-[var(--violet)] shadow-sm">
            <Sparkles className="h-4 w-4" />
          </span>
          <div className="min-w-0 flex-1">
            <p className="text-[11px] font-semibold uppercase tracking-wide text-[var(--muted)]">
              Next holiday
            </p>
            <p className="mt-0.5 text-[14px] font-semibold text-[var(--text)]">
              {nextHoliday.title}
            </p>
            <p className="mt-0.5 text-[12px] text-[var(--muted)]">
              {formatPeriod(
                nextHoliday.fromDate,
                nextHoliday.toDate,
                dateFormat
              )}
              {nextHoliday.holidayTypeLabel
                ? ` · ${nextHoliday.holidayTypeLabel}`
                : ""}
              {nextHoliday.typeName ? ` · ${nextHoliday.typeName}` : ""}
            </p>
          </div>
          <span className="rounded-full bg-[var(--violet)] px-3 py-1 text-[11px] font-semibold text-white">
            {formatCountdown(daysUntil(nextHoliday.fromDate))}
          </span>
        </div>
      ) : null}

      <CollapsibleSection title="Summary">
        <div className="grid grid-cols-2 gap-3 lg:grid-cols-4">
          <StatCard
            label="Total"
            value={stats.total}
            icon={Inbox}
            tone="bg-[var(--info-soft)] text-[var(--info)]"
          />
          <StatCard
            label="Upcoming"
            value={stats.upcoming}
            icon={Sparkles}
            tone="bg-[var(--lavender-soft)] text-[var(--violet)]"
          />
          <StatCard
            label="Optional"
            value={stats.optional}
            icon={Gift}
            tone="bg-[var(--warning-soft)] text-[var(--warning)]"
          />
          <StatCard
            label="This month"
            value={stats.thisMonth}
            icon={CalendarDays}
            tone="bg-[var(--success-soft)] text-[var(--success)]"
          />
        </div>
      </CollapsibleSection>

      <div className="grid gap-5 xl:grid-cols-[1.15fr_0.85fr]">
        <Card bodyClassName="!min-h-0 !p-0">
          <div className="flex flex-wrap items-center justify-between gap-3 border-b border-[var(--border)] px-5 py-2.5">
            <h2 className="heading-section">
              Holiday Logs
            </h2>
          </div>
          <ListToolbar
            tabs={FILTERS}
            tab={filter}
            onTabChange={setFilter}
            recordCount={filteredRows.length}
            filterActive={yearFilterActive}
            activeFilterCount={yearFilterActive ? 1 : 0}
            drawerFields={
              <FilterSelect
                label="Calendar year"
                value={draftYear}
                onChange={setDraftYear}
                options={yearFilterOptions}
              />
            }
            onApplyFilters={() => {
              setYear(Number(draftYear));
            }}
            onResetFilters={() => {
              setDraftYear(String(currentYear));
              setYear(currentYear);
            }}
          />
          <div className="p-4 md:p-5">
          {loading ? (
            <PageLoader
              compact
              label="Loading holidays"
              hint="Fetching company holiday calendar…"
            />
          ) : filteredRows.length === 0 ? (
            <div className="flex min-h-[220px] flex-col items-center justify-center rounded-2xl border border-dashed border-[var(--border)] bg-[var(--panel-soft)] px-4 text-center">
              <span className="inline-flex h-12 w-12 items-center justify-center rounded-2xl bg-[var(--lavender-soft)] text-[var(--violet)]">
                <CalendarDays className="h-6 w-6" />
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
              {grouped.map((group) => (
                <div key={group.key}>
                  <p className="mb-2 text-[11px] font-semibold uppercase tracking-wide text-[var(--muted)]">
                    {MONTHS[group.month]} {group.year}
                  </p>
                  <ul className="space-y-2">
                    {group.items.map((holiday, index) => {
                      const days = daysUntil(holiday.fromDate);
                      const countdown = formatCountdown(days);
                      const isToday = days === 0;
                      const isUpcoming = days != null && days >= 0;

                      return (
                        <li
                          key={
                            holiday.occurrenceId ||
                            holiday.holidayId ||
                            `${holiday.title}-${holiday.fromDate}-${index}`
                          }
                          className={`flex items-start gap-3 rounded-xl border px-3 py-3 ${
                            isToday
                              ? "border-[var(--violet)]/30 bg-[var(--lavender-soft)]/70"
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
                                {formatPeriod(
                                  holiday.fromDate,
                                  holiday.toDate,
                                  dateFormat
                                )}
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
                                isUpcoming
                                  ? "bg-[var(--lavender-soft)] text-[var(--violet)]"
                                  : "bg-[var(--panel-soft)] text-[var(--muted)]"
                              }`}
                            >
                              {countdown}
                            </span>
                          ) : null}
                        </li>
                      );
                    })}
                  </ul>
                </div>
              ))}
            </div>
          )}
          </div>
        </Card>

        <div className="space-y-4">
          <div className="flex items-center justify-between gap-2">
            <p className="text-[13px] font-semibold text-[var(--text)]">
              Month preview
            </p>
            <div className="inline-flex items-center gap-1 rounded-xl border border-[var(--border)] bg-[var(--surface)] p-1">
              <button
                type="button"
                className="inline-flex h-8 w-8 items-center justify-center rounded-lg text-[var(--muted)] transition hover:bg-[var(--panel-soft)]"
                onClick={() =>
                  setViewMonth((m) => {
                    if (m === 0) {
                      setYear((y) => y - 1);
                      return 11;
                    }
                    return m - 1;
                  })
                }
                aria-label="Previous month"
              >
                <ChevronLeft className="h-4 w-4" />
              </button>
              <button
                type="button"
                className="inline-flex h-8 w-8 items-center justify-center rounded-lg text-[var(--muted)] transition hover:bg-[var(--panel-soft)]"
                onClick={() =>
                  setViewMonth((m) => {
                    if (m === 11) {
                      setYear((y) => y + 1);
                      return 0;
                    }
                    return m + 1;
                  })
                }
                aria-label="Next month"
              >
                <ChevronRight className="h-4 w-4" />
              </button>
            </div>
          </div>

          <MonthCalendar
            year={year}
            month={viewMonth}
            holidaysByDate={holidaysByDate}
            dateFormat={dateFormat}
          />

          <div className="rounded-2xl border border-[var(--violet)]/15 bg-[var(--lavender-soft)]/50 px-4 py-3.5 text-[12px] leading-relaxed text-[var(--muted)]">
            <p className="font-semibold text-[var(--text)]">Note</p>
            <p className="mt-1">
              Holidays marked optional may require leave approval if taken.
              Mandatory holidays are company offs.
            </p>
          </div>
        </div>
      </div>
    </PortalPage>
  );
}
