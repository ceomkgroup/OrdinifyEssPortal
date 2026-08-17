"use client";

import { useEffect, useRef, useState } from "react";
import { createPortal } from "react-dom";
import Link from "next/link";
import {
  CalendarDays,
  ChevronLeft,
  ChevronRight,
  Clock3,
  FilePenLine,
  MapPin,
  MoreVertical,
  RefreshCw,
} from "lucide-react";
import { Badge } from "@/components/ui/Badge";
import { Button } from "@/components/ui/Button";
import { Card } from "@/components/ui/Card";
import { Spinner } from "@/components/ui/Spinner";
import { useAttendancePage } from "@/hooks/useAttendance";
import { useModules } from "@/components/modules/ModulesProvider";
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

function Stat({ label, value, tone = "text-[var(--text)]" }) {
  return (
    <div className="rounded-xl border border-[var(--border)] bg-[var(--panel-soft)] px-3 py-3 text-center">
      <p className={`text-[18px] font-bold tabular-nums ${tone}`}>{value ?? "—"}</p>
      <p className="mt-1 text-[11px] text-[var(--muted)]">{label}</p>
    </div>
  );
}

function shiftPeriod(year, month, delta) {
  const d = new Date(year, month - 1 + delta, 1);
  return { year: d.getFullYear(), month: d.getMonth() + 1 };
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

  const showGeofence = geofenceEnabled && Boolean(geofence);
  const total = Number(meta?.total) || 0;
  const currentPage = Number(meta?.page) || page;
  const pageLimit = Number(meta?.limit) || limit;
  const totalPages = Math.max(1, Number(meta?.totalPages) || 1);
  const fromRow = total === 0 ? 0 : (currentPage - 1) * pageLimit + 1;
  const toRow = Math.min(currentPage * pageLimit, total);

  if (loading && !summary && !today) {
    return (
      <div className="flex min-h-[50vh] items-center justify-center">
        <Spinner />
      </div>
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
        <p className="rounded-xl bg-[var(--danger-soft)] px-3 py-2.5 text-sm text-[var(--danger)]">
          {error}
        </p>
      ) : null}

      <div className="grid gap-4 xl:grid-cols-[1.2fr_0.8fr]">
        <Card title="Today">
          {!today ? (
            <div className="flex min-h-[140px] flex-col items-center justify-center text-center">
              <Clock3 className="h-10 w-10 text-[var(--muted)]" strokeWidth={1.4} />
              <p className="mt-3 text-[14px] font-semibold text-[var(--text)]">
                Not checked in today
              </p>
              <p className="mt-1 text-[12px] text-[var(--muted)]">
                {todayMessage || "Punch in when your shift starts."}
              </p>
            </div>
          ) : (
            <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
              <Stat
                label="Status"
                value={today.attTypeName || (today.isCheckedIn ? "Checked In" : "—")}
                tone="text-[var(--violet)]"
              />
              <Stat
                label="Check In"
                value={formatTime(today.checkInTime)}
              />
              <Stat
                label="Check Out"
                value={formatTime(today.checkOutTime)}
              />
              <Stat label="Shift" value={today.shiftName || "—"} />
              <Stat
                label="Late (min)"
                value={today.lateMinutes ?? 0}
                tone={
                  Number(today.lateMinutes) > 0
                    ? "text-[var(--warning)]"
                    : "text-[var(--success)]"
                }
              />
              {breakEnabled ? (
                <Stat
                  label="On Break"
                  value={today.isOnBreak ? "Yes" : "No"}
                />
              ) : null}
              {breakEnabled && today.breakMinutes != null ? (
                <Stat label="Break (min)" value={today.breakMinutes} />
              ) : null}
              {breakEnabled &&
              (today.maxBreaks != null || today.allowedBreaks != null) ? (
                <Stat
                  label="Breaks Used"
                  value={`${today.breaksUsed ?? today.breakCount ?? 0}/${today.maxBreaks ?? today.allowedBreaks}`}
                />
              ) : null}
            </div>
          )}
        </Card>

        {showGeofence ? (
          <Card title="Geofence">
            <div className="space-y-3 text-[13px]">
              <div className="flex items-start gap-2">
                <MapPin className="mt-0.5 h-4 w-4 shrink-0 text-[var(--violet)]" />
                <div>
                  <p className="font-semibold text-[var(--text)]">
                    {geofence.geofence?.name || "Location"}
                  </p>
                  <p className="mt-0.5 text-[var(--muted)]">
                    {geofence.geofence?.address || "—"}
                  </p>
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
            API summary
          </span>
        }
      >
        <div className="grid grid-cols-2 gap-3 sm:grid-cols-4 lg:grid-cols-4">
          <Stat label="Total Days" value={summary?.totalDays ?? 0} />
          <Stat
            label="Present"
            value={summary?.presentCount ?? 0}
            tone="text-[var(--success)]"
          />
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
          <Stat
            label="Grace Used"
            value={summary?.graceUsedMinutes ?? 0}
          />
        </div>
      </Card>

      <Card
        title="Attendance History"
        action={
          historyLoading ? (
            <span className="text-[12px] text-[var(--muted)]">Loading…</span>
          ) : (
            <span className="text-[12px] text-[var(--muted)]">
              {total} total · page {currentPage}/{totalPages}
            </span>
          )
        }
      >
        <div className="overflow-x-auto">
          <table className="min-w-full text-left text-[13px]">
            <thead>
              <tr className="border-b border-[var(--border)] text-[11px] uppercase tracking-wide text-[var(--muted)]">
                <th className="px-2 py-2.5 font-semibold">Date</th>
                <th className="px-2 py-2.5 font-semibold">Status</th>
                <th className="px-2 py-2.5 font-semibold">In</th>
                <th className="px-2 py-2.5 font-semibold">Out</th>
                <th className="px-2 py-2.5 font-semibold">Shift</th>
                <th className="px-2 py-2.5 font-semibold">Hours</th>
                <th className="px-2 py-2.5 font-semibold">Late</th>
                <th className="px-2 py-2.5 font-semibold">Source</th>
                {canRequestChange ? (
                  <th className="px-2 py-2.5 font-semibold">Action</th>
                ) : null}
              </tr>
            </thead>
            <tbody>
              {history.length === 0 ? (
                <tr>
                  <td
                    colSpan={canRequestChange ? 9 : 8}
                    className="px-2 py-8 text-center text-[var(--muted)]"
                  >
                    No attendance logs for this period.
                  </td>
                </tr>
              ) : (
                history.map((row) => (
                  <tr
                    key={row.logId}
                    className="border-b border-[var(--border)] last:border-0"
                  >
                    <td className="px-2 py-3 text-[var(--text)]">
                      {formatDate(row.attendanceDate)}
                    </td>
                    <td className="px-2 py-3">
                      <span
                        className="inline-flex rounded-full px-2 py-0.5 text-[11px] font-semibold capitalize"
                        style={{
                          backgroundColor: `${row.colorCode || "#a78af9"}22`,
                          color: row.colorCode || "var(--violet)",
                        }}
                      >
                        {row.attTypeName || "—"}
                      </span>
                    </td>
                    <td className="px-2 py-3 text-[var(--text)]">
                      {formatTime(row.checkInTime)}
                    </td>
                    <td className="px-2 py-3 text-[var(--text)]">
                      {formatTime(row.checkOutTime)}
                    </td>
                    <td className="max-w-[140px] truncate px-2 py-3 text-[var(--muted)]">
                      {row.shiftName || "—"}
                    </td>
                    <td className="px-2 py-3 text-[var(--text)]">
                      {row.workingHours != null
                        ? formatHoursMinutes(row.workingHours)
                        : "—"}
                    </td>
                    <td className="px-2 py-3 text-[var(--text)]">
                      {row.lateMinutes ?? "—"}
                    </td>
                    <td className="px-2 py-3">
                      <Badge variant="muted" className="rounded-full capitalize">
                        {row.punchSource || "—"}
                      </Badge>
                    </td>
                    {canRequestChange ? (
                      <td className="px-2 py-3">
                        <HistoryRowActions logId={row.logId} />
                      </td>
                    ) : null}
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>

        {/* Always show API-style pagination footer from meta */}
        <div className="mt-4 flex flex-col gap-3 border-t border-[var(--border)] pt-4 sm:flex-row sm:items-center sm:justify-between">
          <p className="text-[12px] text-[var(--muted)]">
            Showing <span className="font-semibold text-[var(--text)]">{fromRow}</span>
            –
            <span className="font-semibold text-[var(--text)]">{toRow}</span> of{" "}
            <span className="font-semibold text-[var(--text)]">{total}</span>
            {" · "}
            limit {pageLimit}
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
              disabled={currentPage <= 1 || historyLoading}
              onClick={() => setPage(Math.max(1, currentPage - 1))}
            >
              Previous
            </Button>

            <span className="min-w-[88px] text-center text-[12px] font-semibold text-[var(--text)]">
              {currentPage} / {totalPages}
            </span>

            <Button
              type="button"
              variant="outline"
              className="h-9 rounded-lg"
              disabled={currentPage >= totalPages || historyLoading}
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
