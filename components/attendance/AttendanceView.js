"use client";

import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { createPortal } from "react-dom";
import Link from "next/link";
import {
  CalendarDays,
  ChevronLeft,
  ChevronRight,
  Clock3,
  Coffee,
  Download,
  FilePenLine,
  LogIn,
  LogOut,
  MapPin,
  MoreVertical,
  RefreshCw,
  Timer,
} from "lucide-react";
import { getAttendanceHistoryAll } from "@/api/attendance";
import { Badge } from "@/components/ui/Badge";
import { Button } from "@/components/ui/Button";
import { Card } from "@/components/ui/Card";
import { FlashBanner } from "@/components/ui/FlashBanner";
import { PageLoader, LogoLoader } from "@/components/ui/Spinner";
import { useAttendancePage } from "@/hooks/useAttendance";
import { useModules } from "@/components/modules/ModulesProvider";
import {
  STATUS_FILTERS,
  attendanceRowsToCsv,
  downloadCsv,
  filterAttendanceByStatus,
  monthRange,
} from "@/lib/attendance-history";
import {
  formatDate,
  formatHoursMinutes,
  formatMonthYear,
  formatTime,
} from "@/lib/format";

const MONTH_OPTIONS = [
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

function Stat({ label, value, tone = "text-[var(--text)]", hint }) {
  return (
    <div className="rounded-xl border border-[var(--border)] bg-[var(--panel-soft)] px-3 py-3">
      <p className="text-[10px] font-semibold uppercase tracking-wide text-[var(--muted)]">
        {label}
      </p>
      <p
        className={`mt-1 truncate text-[16px] font-bold tabular-nums leading-tight ${tone}`}
        title={value != null ? String(value) : undefined}
      >
        {value ?? "—"}
      </p>
      {hint ? (
        <p className="mt-1 text-[10px] text-[var(--muted)]">{hint}</p>
      ) : null}
    </div>
  );
}

function shiftPeriod(year, month, delta) {
  const d = new Date(year, month - 1 + delta, 1);
  return { year: d.getFullYear(), month: d.getMonth() + 1 };
}

function pickNumber(...values) {
  for (const value of values) {
    if (value == null || value === "") continue;
    const n = Number(value);
    if (Number.isFinite(n)) return n;
  }
  return null;
}

function HistoryRowActions({ logId }) {
  const [open, setOpen] = useState(false);
  const [coords, setCoords] = useState({ top: 0, left: 0 });
  const buttonRef = useRef(null);

  useEffect(() => {
    if (!open) return undefined;

    function placeMenu() {
      const rect = buttonRef.current?.getBoundingClientRect();
      if (!rect) return;
      const menuWidth = 224;
      const left = Math.min(
        Math.max(8, rect.right - menuWidth),
        window.innerWidth - menuWidth - 8
      );
      setCoords({
        top: rect.bottom + 6,
        left,
      });
    }

    placeMenu();

    function onDocClick(event) {
      if (
        buttonRef.current?.contains(event.target) ||
        event.target.closest?.(`[data-history-menu="${logId}"]`)
      ) {
        return;
      }
      setOpen(false);
    }

    function onReposition() {
      placeMenu();
    }

    document.addEventListener("mousedown", onDocClick);
    window.addEventListener("resize", onReposition);
    window.addEventListener("scroll", onReposition, true);
    return () => {
      document.removeEventListener("mousedown", onDocClick);
      window.removeEventListener("resize", onReposition);
      window.removeEventListener("scroll", onReposition, true);
    };
  }, [open, logId]);

  return (
    <>
      <button
        ref={buttonRef}
        type="button"
        className="inline-flex h-8 w-8 items-center justify-center rounded-lg border border-[var(--border)] bg-[var(--surface)] text-[var(--muted)] transition hover:bg-[var(--panel-soft)] hover:text-[var(--text)]"
        aria-label="Row actions"
        aria-expanded={open}
        onClick={(event) => {
          event.stopPropagation();
          setOpen((v) => !v);
        }}
      >
        <MoreVertical className="h-4 w-4" />
      </button>

      {open && typeof document !== "undefined"
        ? createPortal(
            <div
              data-history-menu={logId}
              className="fixed z-[9999] w-56 overflow-hidden rounded-xl border border-[var(--border)] bg-[var(--surface)] shadow-[0_12px_32px_rgba(15,23,42,0.18)]"
              style={{ top: coords.top, left: coords.left }}
            >
              <Link
                href={`/requests/attendance-change?logId=${encodeURIComponent(logId || "")}`}
                className="flex items-start gap-2.5 px-3 py-2.5 text-left hover:bg-[var(--panel-soft)]"
                onClick={() => setOpen(false)}
              >
                <FilePenLine className="mt-0.5 h-4 w-4 shrink-0 text-[var(--violet)]" />
                <span>
                  <span className="block text-[13px] font-semibold text-[var(--text)]">
                    Request correction
                  </span>
                  <span className="mt-0.5 block text-[11px] leading-snug text-[var(--muted)]">
                    Fix check-in / check-out for this day
                  </span>
                </span>
              </Link>
            </div>,
            document.body
          )
        : null}
    </>
  );
}

export function AttendanceView() {
  const { hasFlag, hasScreen } = useModules();
  const breakEnabled = hasFlag("breakManagement");
  const canRequestChange = hasScreen("attendanceChange");
  const {
    year,
    month,
    page,
    limit,
    setPage,
    setPageSize,
    setPeriod,
    today,
    todayMessage,
    summary,
    history,
    meta,
    geofence,
    geofenceEnabled,
    loading,
    historyLoading,
    error,
    refetch,
  } = useAttendancePage();

  const [statusFilter, setStatusFilter] = useState("all");
  const [monthRows, setMonthRows] = useState([]);
  const [monthRowsLoading, setMonthRowsLoading] = useState(false);
  const [exporting, setExporting] = useState(false);
  const [filterError, setFilterError] = useState("");

  const showGeofence = geofenceEnabled && Boolean(geofence);
  const filterActive = statusFilter !== "all";

  useEffect(() => {
    let alive = true;

    if (!filterActive) {
      queueMicrotask(() => {
        if (!alive) return;
        setMonthRows([]);
        setMonthRowsLoading(false);
        setFilterError("");
      });
      return () => {
        alive = false;
      };
    }

    queueMicrotask(() => {
      if (alive) {
        setMonthRowsLoading(true);
        setFilterError("");
      }
    });

    (async () => {
      try {
        const { from, to } = monthRange(year, month);
        const rows = await getAttendanceHistoryAll({ from, to });
        if (!alive) return;
        setMonthRows(rows);
      } catch (err) {
        if (!alive) return;
        setMonthRows([]);
        setFilterError(err.message || "Failed to load filtered history");
      } finally {
        if (alive) setMonthRowsLoading(false);
      }
    })();

    return () => {
      alive = false;
    };
  }, [filterActive, year, month]);

  const filteredMonthRows = useMemo(
    () => filterAttendanceByStatus(monthRows, statusFilter),
    [monthRows, statusFilter]
  );

  const displayRows = filterActive
    ? filteredMonthRows.slice((page - 1) * limit, page * limit)
    : history;

  const total = filterActive
    ? filteredMonthRows.length
    : Number(meta?.total) || 0;
  const currentPage = filterActive ? page : Number(meta?.page) || page;
  const pageLimit = Number(meta?.limit) || limit;
  const totalPages = filterActive
    ? Math.max(1, Math.ceil(total / pageLimit) || 1)
    : Math.max(1, Number(meta?.totalPages) || 1);
  const fromRow = total === 0 ? 0 : (currentPage - 1) * pageLimit + 1;
  const toRow = Math.min(currentPage * pageLimit, total);
  const listLoading = historyLoading || (filterActive && monthRowsLoading);

  const todayWorkingHours = pickNumber(
    today?.workingHours,
    today?.workedHours,
    today?.totalWorkingHours
  );
  const todayBreakMinutes = pickNumber(
    today?.breakMinutes,
    today?.totalBreakMinutes,
    today?.usedBreakMinutes
  );
  const todayBreaksUsed = pickNumber(
    today?.breaksUsed,
    today?.breakCount,
    today?.completedBreakCount
  );
  const todayMaxBreaks = pickNumber(
    today?.maxBreaks,
    today?.allowedBreaks,
    today?.maxBreakCount
  );

  const historyColSpan =
    8 + (breakEnabled ? 1 : 0) + (canRequestChange ? 1 : 0) + 2;

  function onStatusFilterChange(next) {
    setStatusFilter(next);
    setPage(1);
  }

  const handleExportCsv = useCallback(async () => {
    setExporting(true);
    setFilterError("");
    try {
      const { from, to } = monthRange(year, month);
      const rows = await getAttendanceHistoryAll({ from, to });
      const filtered = filterAttendanceByStatus(rows, statusFilter);
      const csv = attendanceRowsToCsv(filtered, { includeBreak: breakEnabled });
      const filterPart =
        statusFilter === "all" ? "all" : statusFilter.toLowerCase();
      downloadCsv(
        `attendance-${year}-${String(month).padStart(2, "0")}-${filterPart}.csv`,
        csv
      );
    } catch (err) {
      setFilterError(err.message || "Failed to export CSV");
    } finally {
      setExporting(false);
    }
  }, [year, month, statusFilter, breakEnabled]);

  if (loading && !summary && !today) {
    return (
      <PageLoader label="Loading attendance" hint="Fetching today’s status and month summary…" />
    );
  }

  return (
    <div className="flex w-full flex-col gap-5">
      <div className="flex flex-col gap-3 sm:flex-row sm:items-end sm:justify-between">
        <div>
          <h1 className="font-[family-name:var(--font-heading)] text-2xl font-semibold text-[var(--text)] md:text-[28px]">
            Attendance
          </h1>
          <p className="mt-1 text-sm text-[var(--muted)]">
            Today&apos;s status, monthly summary, and attendance history.
          </p>
        </div>
        <div className="flex flex-wrap items-center gap-2">
          <button
            type="button"
            className="inline-flex h-10 w-10 items-center justify-center rounded-xl border border-[var(--border)] bg-[var(--surface)] text-[var(--text)] hover:bg-[var(--panel-soft)]"
            onClick={() => {
              const next = shiftPeriod(year, month, -1);
              setPeriod(next.year, next.month);
            }}
            aria-label="Previous month"
          >
            <ChevronLeft className="h-4 w-4" />
          </button>
          <select
            value={month}
            onChange={(e) => setPeriod(year, Number(e.target.value))}
            className="h-10 rounded-xl border border-[var(--border)] bg-[var(--surface)] px-3 text-sm text-[var(--text)]"
          >
            {MONTH_OPTIONS.map((label, idx) => (
              <option key={label} value={idx + 1}>
                {label}
              </option>
            ))}
          </select>
          <select
            value={year}
            onChange={(e) => setPeriod(Number(e.target.value), month)}
            className="h-10 rounded-xl border border-[var(--border)] bg-[var(--surface)] px-3 text-sm text-[var(--text)]"
          >
            {[year - 1, year, year + 1].map((y) => (
              <option key={y} value={y}>
                {y}
              </option>
            ))}
          </select>
          <button
            type="button"
            className="inline-flex h-10 w-10 items-center justify-center rounded-xl border border-[var(--border)] bg-[var(--surface)] text-[var(--text)] hover:bg-[var(--panel-soft)]"
            onClick={() => {
              const next = shiftPeriod(year, month, 1);
              setPeriod(next.year, next.month);
            }}
            aria-label="Next month"
          >
            <ChevronRight className="h-4 w-4" />
          </button>
          <Button
            type="button"
            variant="outline"
            className="h-10 rounded-xl"
            onClick={refetch}
          >
            <RefreshCw className="h-4 w-4" />
            Refresh
          </Button>
        </div>
      </div>

      {error ? (
        <FlashBanner
          message={error}
          tone="danger"
          duration={5000}
          autoDismiss={false}
        />
      ) : null}

      <div
        className={`grid gap-4 ${
          showGeofence ? "xl:grid-cols-[1.35fr_0.9fr]" : ""
        }`}
      >
        <Card title="Today" bodyClassName="space-y-3">
          {!today ? (
            <div className="flex min-h-[150px] flex-col items-center justify-center rounded-xl border border-dashed border-[var(--border)] bg-[var(--panel-soft)] text-center">
              <Clock3 className="h-10 w-10 text-[var(--muted)]" strokeWidth={1.4} />
              <p className="mt-3 text-[14px] font-semibold text-[var(--text)]">
                Not checked in today
              </p>
              <p className="mt-1 max-w-sm text-[12px] text-[var(--muted)]">
                {todayMessage || "Punch in when your shift starts."}
              </p>
            </div>
          ) : (
            <>
              <div className="flex flex-wrap items-center gap-2">
                <span className="rounded-full bg-[var(--success-soft)] px-2.5 py-1 text-[11px] font-semibold text-[var(--success)]">
                  {today.attTypeName ||
                    (today.isCheckedIn ? "Checked In" : "Present")}
                </span>
                {today.isCheckedOut ? (
                  <span className="rounded-full bg-[var(--lavender-soft)] px-2.5 py-1 text-[11px] font-semibold text-[var(--violet)]">
                    Checked Out
                  </span>
                ) : today.isCheckedIn ? (
                  <span className="rounded-full bg-[var(--info-soft)] px-2.5 py-1 text-[11px] font-semibold text-[var(--info)]">
                    Checked In
                  </span>
                ) : null}
                {breakEnabled && today.isOnBreak ? (
                  <span className="inline-flex items-center gap-1 rounded-full bg-[var(--warning-soft)] px-2.5 py-1 text-[11px] font-semibold text-[var(--warning)]">
                    <Coffee className="h-3.5 w-3.5" />
                    On Break
                  </span>
                ) : null}
              </div>

              <div className="grid gap-2.5 sm:grid-cols-2 lg:grid-cols-3">
                <Stat
                  label="Shift"
                  value={today.shiftName || "—"}
                  tone="text-[var(--violet)]"
                />
                <Stat
                  label="Check In"
                  value={formatTime(today.checkInTime)}
                  hint={today.isCheckedIn && !today.isCheckedOut ? "Active" : null}
                />
                <Stat
                  label="Check Out"
                  value={formatTime(today.checkOutTime)}
                  hint={today.isCheckedOut ? "Completed" : "Pending"}
                />
                <Stat
                  label="Late Minutes"
                  value={today.lateMinutes ?? 0}
                  tone={
                    Number(today.lateMinutes) > 0
                      ? "text-[var(--warning)]"
                      : "text-[var(--success)]"
                  }
                />
                {todayWorkingHours != null ? (
                  <Stat
                    label="Working Hours"
                    value={formatHoursMinutes(todayWorkingHours)}
                  />
                ) : null}
                {breakEnabled ? (
                  <Stat
                    label="On Break"
                    value={today.isOnBreak ? "Yes" : "No"}
                  />
                ) : null}
                {breakEnabled && todayBreakMinutes != null ? (
                  <Stat label="Break Minutes" value={todayBreakMinutes} />
                ) : null}
                {breakEnabled && todayMaxBreaks != null ? (
                  <Stat
                    label="Breaks Used"
                    value={`${todayBreaksUsed ?? 0}/${todayMaxBreaks}`}
                  />
                ) : null}
              </div>
            </>
          )}
        </Card>

        {showGeofence ? (
          <Card title="Geofence">
            <div className="space-y-3 text-[13px]">
              <div className="flex items-start gap-2 rounded-xl border border-[var(--border)] bg-[var(--panel-soft)] px-3 py-2.5">
                <MapPin className="mt-0.5 h-4 w-4 shrink-0 text-[var(--violet)]" />
                <div className="min-w-0">
                  <p className="font-semibold text-[var(--text)]">
                    {geofence.geofence?.name || "Location"}
                  </p>
                  <p className="mt-0.5 text-[12px] text-[var(--muted)]">
                    {geofence.geofence?.address || "—"}
                  </p>
                  {geofence.geofence?.type ? (
                    <p className="mt-1 text-[11px] capitalize text-[var(--muted)]">
                      Type · {geofence.geofence.type}
                    </p>
                  ) : null}
                </div>
              </div>
              <div className="grid grid-cols-2 gap-2">
                <Stat
                  label="Radius"
                  value={`${geofence.geofence?.radiusMeters ?? "—"} m`}
                />
                <Stat
                  label="GPS Required"
                  value={geofence.requireGpsForPunch ? "Yes" : "No"}
                />
                <Stat
                  label="GPS Allowed"
                  value={geofence.gpsAllowed ? "Yes" : "No"}
                />
                <Stat
                  label="Reject Mock GPS"
                  value={geofence.rejectMockGps ? "Yes" : "No"}
                />
              </div>
            </div>
          </Card>
        ) : null}
      </div>

      <Card
        title={`Monthly Summary (${formatMonthYear(year, month)})`}
        action={
          <span className="inline-flex items-center gap-1 text-[11px] text-[var(--muted)]">
            <CalendarDays className="h-3.5 w-3.5" />
            Selected period
          </span>
        }
      >
        <div className="grid grid-cols-2 gap-2.5 sm:grid-cols-4 lg:grid-cols-5">
          <Stat label="Total Days" value={summary?.totalDays ?? 0} />
          <Stat
            label="Present"
            value={summary?.presentCount ?? summary?.present ?? 0}
            tone="text-[var(--success)]"
          />
          {summary?.absentCount != null || summary?.absent != null ? (
            <Stat
              label="Absent"
              value={summary?.absentCount ?? summary?.absent}
              tone="text-[var(--danger)]"
            />
          ) : null}
          {summary?.leaveCount != null || summary?.leave != null ? (
            <Stat
              label="Leave"
              value={summary?.leaveCount ?? summary?.leave}
              tone="text-[var(--violet)]"
            />
          ) : null}
          {summary?.holidayCount != null || summary?.holiday != null ? (
            <Stat
              label="Holiday"
              value={summary?.holidayCount ?? summary?.holiday}
            />
          ) : null}
          {summary?.halfDayCount != null || summary?.halfDay != null ? (
            <Stat
              label="Half Day"
              value={summary?.halfDayCount ?? summary?.halfDay}
              tone="text-[var(--warning)]"
            />
          ) : null}
          <Stat
            label="Late Days"
            value={summary?.lateCount ?? 0}
            tone="text-[var(--warning)]"
          />
          <Stat
            label="Late Minutes"
            value={summary?.totalLateMinutes ?? 0}
          />
          <Stat
            label="Working Hours"
            value={formatHoursMinutes(summary?.totalWorkingHours)}
          />
          <Stat
            label="Overtime Hours"
            value={formatHoursMinutes(summary?.totalOvertimeHours)}
          />
          {breakEnabled ? (
            <Stat
              label="Break Minutes"
              value={summary?.totalBreakMinutes ?? 0}
            />
          ) : null}
          <Stat label="Grace Used" value={summary?.graceUsedMinutes ?? 0} />
        </div>
      </Card>

      <Card
        title="Attendance History"
        action={
          listLoading ? (
            <span className="text-[12px] text-[var(--muted)]">Loading…</span>
          ) : (
            <span className="text-[12px] text-[var(--muted)]">
              {total} total · page {currentPage}/{totalPages}
            </span>
          )
        }
      >
        <div className="mb-3 flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
          <div className="flex flex-wrap gap-1.5">
            {STATUS_FILTERS.map((item) => {
              const active = statusFilter === item.value;
              return (
                <button
                  key={item.value}
                  type="button"
                  onClick={() => onStatusFilterChange(item.value)}
                  className={`rounded-full px-3 py-1.5 text-[12px] font-semibold transition ${
                    active
                      ? "bg-[var(--violet)] text-white"
                      : "border border-[var(--border)] bg-[var(--surface)] text-[var(--muted)] hover:bg-[var(--panel-soft)] hover:text-[var(--text)]"
                  }`}
                >
                  {item.label}
                </button>
              );
            })}
          </div>

          <Button
            type="button"
            variant="outline"
            className="h-9 rounded-xl"
            disabled={exporting || listLoading}
            onClick={handleExportCsv}
          >
            <Download className="h-4 w-4" />
            {exporting ? "Exporting…" : "Export CSV"}
          </Button>
        </div>

        {filterError ? (
          <p className="mb-3 rounded-lg bg-[var(--danger-soft)] px-3 py-2 text-[12px] text-[var(--danger)]">
            {filterError}
          </p>
        ) : null}

        {filterActive ? (
          <p className="mb-3 text-[11px] text-[var(--muted)]">
            Showing {statusFilter} records for{" "}
            {formatMonthYear(year, month)}
            {monthRowsLoading ? " · loading month…" : ""}.
          </p>
        ) : null}

        <div className="overflow-x-auto rounded-xl border border-[var(--border)]">
          <table className="min-w-full text-left text-[13px]">
            <thead>
              <tr className="border-b border-[var(--border)] bg-[var(--panel-soft)] text-[11px] uppercase tracking-wide text-[var(--muted)]">
                <th className="px-3 py-2.5 font-semibold">Date</th>
                <th className="px-3 py-2.5 font-semibold">Status</th>
                <th className="px-3 py-2.5 font-semibold">Check In</th>
                <th className="px-3 py-2.5 font-semibold">Check Out</th>
                <th className="px-3 py-2.5 font-semibold">Shift</th>
                <th className="px-3 py-2.5 font-semibold">Working Hours</th>
                <th className="px-3 py-2.5 font-semibold">Overtime</th>
                <th className="px-3 py-2.5 font-semibold">Late</th>
                <th className="px-3 py-2.5 font-semibold">Early Exit</th>
                {breakEnabled ? (
                  <th className="px-3 py-2.5 font-semibold">Break</th>
                ) : null}
                <th className="px-3 py-2.5 font-semibold">Source</th>
                {canRequestChange ? (
                  <th className="px-3 py-2.5 font-semibold">Action</th>
                ) : null}
              </tr>
            </thead>
            <tbody>
              {displayRows.length === 0 ? (
                <tr>
                  <td
                    colSpan={historyColSpan}
                    className="px-3 py-10 text-center text-[var(--muted)]"
                  >
                    {listLoading ? (
                      <div className="flex flex-col items-center justify-center gap-3 py-2">
                        <LogoLoader size="sm" />
                        <span className="text-[12px]">Loading attendance logs…</span>
                      </div>
                    ) : filterActive ? (
                      `No ${statusFilter} records for this month.`
                    ) : (
                      "No attendance logs for this period."
                    )}
                  </td>
                </tr>
              ) : (
                displayRows.map((row) => {
                  const late = Number(row.lateMinutes) || 0;
                  const early = Number(row.earlyExitMinutes) || 0;
                  const ot = Number(row.overtimeHours) || 0;
                  const breakMins = pickNumber(
                    row.breakMinutes,
                    row.totalBreakMinutes
                  );
                  const flags = [
                    row.isHolidayWork ? "Holiday work" : null,
                    row.isManualOverride ? "Manual" : null,
                    row.isMockGps ? "Mock GPS" : null,
                    row.remarks ? "Remarks" : null,
                  ].filter(Boolean);

                  return (
                    <tr
                      key={row.logId}
                      className="border-b border-[var(--border)] last:border-0 hover:bg-[var(--panel-soft)]/70"
                    >
                      <td className="whitespace-nowrap px-3 py-3 font-medium text-[var(--text)]">
                        {formatDate(row.attendanceDate)}
                      </td>
                      <td className="px-3 py-3">
                        <div className="flex flex-col gap-1">
                          <span
                            className="inline-flex w-fit rounded-full px-2 py-0.5 text-[11px] font-semibold capitalize"
                            style={{
                              backgroundColor: `${row.colorCode || "#a78af9"}22`,
                              color: row.colorCode || "var(--violet)",
                            }}
                          >
                            {row.attTypeName || row.statusLabel || "—"}
                          </span>
                          {flags.length ? (
                            <span className="text-[10px] text-[var(--muted)]">
                              {flags.join(" · ")}
                            </span>
                          ) : null}
                        </div>
                      </td>
                      <td className="whitespace-nowrap px-3 py-3 text-[var(--text)]">
                        <span className="inline-flex items-center gap-1">
                          <LogIn className="h-3 w-3 text-[var(--success)]" />
                          {formatTime(row.checkInTime)}
                        </span>
                      </td>
                      <td className="whitespace-nowrap px-3 py-3 text-[var(--text)]">
                        <span className="inline-flex items-center gap-1">
                          <LogOut className="h-3 w-3 text-[var(--violet)]" />
                          {formatTime(row.checkOutTime)}
                        </span>
                      </td>
                      <td
                        className="max-w-[150px] truncate px-3 py-3 text-[var(--muted)]"
                        title={row.shiftName || ""}
                      >
                        {row.shiftName || "—"}
                      </td>
                      <td className="whitespace-nowrap px-3 py-3 text-[var(--text)]">
                        {row.workingHours != null
                          ? formatHoursMinutes(row.workingHours)
                          : "—"}
                      </td>
                      <td
                        className={`whitespace-nowrap px-3 py-3 ${
                          ot > 0
                            ? "font-semibold text-[var(--violet)]"
                            : "text-[var(--muted)]"
                        }`}
                      >
                        {row.overtimeHours != null
                          ? formatHoursMinutes(row.overtimeHours)
                          : "—"}
                      </td>
                      <td
                        className={`whitespace-nowrap px-3 py-3 tabular-nums ${
                          late > 0
                            ? "font-semibold text-[var(--warning)]"
                            : "text-[var(--muted)]"
                        }`}
                      >
                        {row.lateMinutes != null ? `${late} min` : "—"}
                      </td>
                      <td
                        className={`whitespace-nowrap px-3 py-3 tabular-nums ${
                          early > 0
                            ? "font-semibold text-[var(--danger)]"
                            : "text-[var(--muted)]"
                        }`}
                      >
                        {row.earlyExitMinutes != null ? `${early} min` : "—"}
                      </td>
                      {breakEnabled ? (
                        <td className="whitespace-nowrap px-3 py-3 text-[var(--text)]">
                          {breakMins != null ? (
                            <span className="inline-flex items-center gap-1">
                              <Coffee className="h-3 w-3 text-[var(--warning)]" />
                              {Math.round(breakMins)} min
                              {row.breakCount != null
                                ? ` · ${row.breakCount}`
                                : ""}
                            </span>
                          ) : (
                            "—"
                          )}
                        </td>
                      ) : null}
                      <td className="px-3 py-3">
                        <Badge
                          variant="muted"
                          className="rounded-full capitalize"
                        >
                          {row.punchSource || "—"}
                        </Badge>
                      </td>
                      {canRequestChange ? (
                        <td className="px-3 py-3">
                          <HistoryRowActions logId={row.logId} />
                        </td>
                      ) : null}
                    </tr>
                  );
                })
              )}
            </tbody>
          </table>
        </div>

        <div className="mt-4 flex flex-col gap-3 border-t border-[var(--border)] pt-4 sm:flex-row sm:items-center sm:justify-between">
          <p className="text-[12px] text-[var(--muted)]">
            Showing{" "}
            <span className="font-semibold text-[var(--text)]">{fromRow}</span>–
            <span className="font-semibold text-[var(--text)]">{toRow}</span> of{" "}
            <span className="font-semibold text-[var(--text)]">{total}</span>
            {" · "}
            limit {pageLimit}
            {filterActive ? " · filtered" : ""}
          </p>

          <div className="flex flex-wrap items-center gap-2">
            <label className="flex items-center gap-1.5 text-[12px] text-[var(--muted)]">
              Rows
              <select
                value={pageLimit}
                onChange={(e) => setPageSize(Number(e.target.value))}
                className="h-9 rounded-lg border border-[var(--border)] bg-[var(--surface)] px-2 text-[12px] text-[var(--text)]"
              >
                {[10, 20, 30, 50].map((n) => (
                  <option key={n} value={n}>
                    {n}
                  </option>
                ))}
              </select>
            </label>

            <Button
              type="button"
              variant="outline"
              className="h-9 rounded-lg"
              disabled={currentPage <= 1 || listLoading}
              onClick={() => setPage(Math.max(1, currentPage - 1))}
            >
              Previous
            </Button>

            <span className="inline-flex min-w-[88px] items-center justify-center gap-1 text-[12px] font-semibold text-[var(--text)]">
              <Timer className="h-3.5 w-3.5 text-[var(--muted)]" />
              {currentPage} / {totalPages}
            </span>

            <Button
              type="button"
              variant="outline"
              className="h-9 rounded-lg"
              disabled={currentPage >= totalPages || listLoading}
              onClick={() => setPage(Math.min(totalPages, currentPage + 1))}
            >
              Next
            </Button>
          </div>
        </div>
      </Card>
    </div>
  );
}
