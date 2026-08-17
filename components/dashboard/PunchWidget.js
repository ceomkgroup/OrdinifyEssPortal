"use client";

import { useEffect, useMemo, useState } from "react";
import {
  ChevronDown,
  Coffee,
  LogIn,
  LogOut,
  MapPin,
  Timer,
} from "lucide-react";
import { Button } from "@/components/ui/Button";
import {
  breakInAttendance,
  breakOutAttendance,
  checkInAttendance,
  checkOutAttendance,
  formatPunchError,
  getPunchGeoPosition,
} from "@/api/attendance";
import {
  canShowBreakManagement,
  canStartAnotherBreak,
  formatBreakLimitMessage,
  getActiveBreakStart,
  getBreakPolicy,
} from "@/lib/break";
import { formatTime, formatWorkedTimer } from "@/lib/format";
import { canWebPunch as canWebPunchPermission } from "@/lib/permissions";
import { useModules } from "@/components/modules/ModulesProvider";

function parseShiftMinutes(time24) {
  if (!time24) return null;
  const [h, m] = String(time24).split(":").map(Number);
  if (Number.isNaN(h)) return null;
  return h * 60 + (m || 0);
}

function toDate(value) {
  if (!value) return null;
  const d = value instanceof Date ? value : new Date(value);
  return Number.isNaN(d.getTime()) ? null : d;
}

function getShiftDurationMinutes(shift) {
  const start = parseShiftMinutes(shift?.startTime);
  const end = parseShiftMinutes(shift?.endTime);
  if (start == null || end == null) return 0;
  let totalMinutes = end - start;
  if (totalMinutes <= 0) totalMinutes += 24 * 60;
  return totalMinutes;
}

/**
 * Progress uses working time only (total elapsed minus breaks).
 * Freezes while on break; resumes after break-in.
 */
function getPunchProgress({
  shift,
  punchInAt,
  punchOutAt,
  punchedIn,
  punchedOut,
  workingMinutes,
}) {
  const totalMinutes = getShiftDurationMinutes(shift);
  if (!totalMinutes) {
    return { percent: 0, totalMinutes: 0, elapsedMinutes: 0 };
  }

  const checkIn = toDate(punchInAt);
  if (!checkIn || (!punchedIn && !punchedOut)) {
    return { percent: 0, totalMinutes, elapsedMinutes: 0 };
  }

  let elapsedMinutes = Math.max(0, Number(workingMinutes) || 0);
  if (elapsedMinutes > totalMinutes) elapsedMinutes = totalMinutes;

  const percent = Math.min(100, Math.max(0, (elapsedMinutes / totalMinutes) * 100));
  return { percent, totalMinutes, elapsedMinutes };
}

function formatClock(date, timeFormat = "12h") {
  const h = date.getHours();
  const m = date.getMinutes();
  const s = date.getSeconds();
  if (timeFormat === "24h") {
    return `${String(h).padStart(2, "0")}:${String(m).padStart(2, "0")}:${String(s).padStart(2, "0")}`;
  }
  const period = h >= 12 ? "PM" : "AM";
  const hour12 = h % 12 || 12;
  return `${String(hour12).padStart(2, "0")}:${String(m).padStart(2, "0")}:${String(s).padStart(2, "0")} ${period}`;
}

export function PunchWidget({
  timer,
  shift,
  punchPermissions,
  employee,
  todayAttendance,
  geofence,
  timeFormat = "12h",
  onCheckedIn,
  onCheckedOut,
  onBreakChanged,
}) {
  const { hasFlag } = useModules();
  const breakEnabled = canShowBreakManagement({
    breakManagementEnabled: hasFlag("breakManagement"),
    today: todayAttendance,
    punchPermissions,
    employee,
  });

  const [now, setNow] = useState(() => new Date());
  const [punching, setPunching] = useState(false);
  const [punchAction, setPunchAction] = useState(null);
  const [punchError, setPunchError] = useState("");
  const [punchSuccess, setPunchSuccess] = useState("");
  const [breakMenuOpen, setBreakMenuOpen] = useState(false);

  const fromToday = todayAttendance
    ? {
        punchInAt: todayAttendance.checkInTime || null,
        punchOutAt: todayAttendance.checkOutTime || null,
        isCheckedIn: todayAttendance.isCheckedIn === true,
        isCheckedOut: todayAttendance.isCheckedOut === true,
        isOnBreak: todayAttendance.isOnBreak === true,
      }
    : null;

  const punchedIn = fromToday
    ? fromToday.isCheckedIn && !fromToday.isCheckedOut
    : Boolean(timer?.punchInAt) && !timer?.punchOutAt;
  const punchedOut = fromToday
    ? fromToday.isCheckedOut ||
      (Boolean(fromToday.punchInAt) && Boolean(fromToday.punchOutAt))
    : Boolean(timer?.punchInAt) && Boolean(timer?.punchOutAt);
  const isOnBreak = Boolean(breakEnabled && fromToday?.isOnBreak);
  const punchInAt = fromToday?.punchInAt || timer?.punchInAt || null;
  const punchOutAt = fromToday?.punchOutAt || timer?.punchOutAt || null;
  const canWebPunch = canWebPunchPermission(punchPermissions, employee);
  const geofenceActive = Boolean(geofence?.geofence);
  const requireGps = geofenceActive && geofence?.requireGpsForPunch === true;

  const breakPolicy = useMemo(
    () => (breakEnabled ? getBreakPolicy(todayAttendance, shift) : null),
    [breakEnabled, todayAttendance, shift]
  );
  const breakLogs = breakPolicy?.logs || [];
  const activeBreakStart = getActiveBreakStart(todayAttendance, isOnBreak);
  const breakLimitLabel = formatBreakLimitMessage(breakPolicy);

  useEffect(() => {
    const id = setInterval(() => setNow(new Date()), 1000);
    return () => clearInterval(id);
  }, []);

  useEffect(() => {
    if (!breakMenuOpen) return undefined;
    function onDocClick(event) {
      if (!event.target.closest?.("[data-break-menu]")) {
        setBreakMenuOpen(false);
      }
    }
    document.addEventListener("click", onDocClick);
    return () => document.removeEventListener("click", onDocClick);
  }, [breakMenuOpen]);

  const timeStats = useMemo(() => {
    if (!punchInAt || (!punchedIn && !punchedOut)) {
      return {
        totalMinutes: 0,
        workingMinutes: 0,
        breakMinutes: 0,
      };
    }

    const start = toDate(punchInAt);
    if (!start) {
      return {
        totalMinutes: Number(timer?.workedMinutesToday) || 0,
        workingMinutes: Number(timer?.workedMinutesToday) || 0,
        breakMinutes: 0,
      };
    }

    const end = punchedOut ? toDate(punchOutAt) || now : now;
    let totalMinutes = Math.max(0, (end.getTime() - start.getTime()) / 60000);

    // Prefer API totals when provided (e.g. after check-out / break-in).
    if (breakPolicy?.totalMinutes != null && (punchedOut || !isOnBreak)) {
      totalMinutes = Math.max(totalMinutes, breakPolicy.totalMinutes);
      if (punchedOut) totalMinutes = breakPolicy.totalMinutes;
    }

    let breakMinutes =
      breakPolicy?.breakMinutesUsed != null
        ? Number(breakPolicy.breakMinutesUsed)
        : breakLogs
            .filter((row) => row.end)
            .reduce((sum, row) => sum + (Number(row.minutes) || 0), 0);

    if (isOnBreak) {
      const breakStart = toDate(activeBreakStart);
      if (breakStart) {
        breakMinutes += Math.max(0, (now.getTime() - breakStart.getTime()) / 60000);
      }
    }

    if (breakMinutes > totalMinutes) breakMinutes = totalMinutes;

    let workingMinutes =
      breakPolicy?.workingMinutes != null && !isOnBreak
        ? Number(breakPolicy.workingMinutes)
        : Math.max(0, totalMinutes - breakMinutes);

    // While live / on break, keep working from elapsed − break so progress freezes correctly.
    if (isOnBreak || breakPolicy?.workingMinutes == null) {
      workingMinutes = Math.max(0, totalMinutes - breakMinutes);
    }

    return { totalMinutes, workingMinutes, breakMinutes };
  }, [
    punchInAt,
    punchOutAt,
    punchedIn,
    punchedOut,
    breakLogs,
    breakPolicy,
    isOnBreak,
    activeBreakStart,
    now,
    timer?.workedMinutesToday,
  ]);

  const progress = useMemo(
    () =>
      getPunchProgress({
        shift,
        punchInAt,
        punchOutAt,
        punchedIn,
        punchedOut,
        workingMinutes: timeStats.workingMinutes,
      }),
    [shift, punchInAt, punchOutAt, punchedIn, punchedOut, timeStats.workingMinutes]
  );

  const punchInDisabled = !canWebPunch || punchedIn || punchedOut || punching;
  const punchOutDisabled =
    !canWebPunch ||
    !punchedIn ||
    punchedOut ||
    punching ||
    isOnBreak ||
    !todayAttendance?.logId;

  const breakQuotaAvailable = canStartAnotherBreak(breakPolicy, { isOnBreak });

  const canStartBreak =
    breakEnabled &&
    punchedIn &&
    !punchedOut &&
    !isOnBreak &&
    Boolean(todayAttendance?.logId) &&
    !punching &&
    breakQuotaAvailable;
  const canEndBreak =
    breakEnabled &&
    punchedIn &&
    !punchedOut &&
    isOnBreak &&
    Boolean(todayAttendance?.logId) &&
    !punching;

  const statusText = !canWebPunch
    ? "Web punch is not allowed on your account."
    : punchedOut
      ? "Shift completed for today."
      : isOnBreak
        ? "On break — shift progress is paused."
        : punchedIn && breakEnabled && !breakQuotaAvailable
          ? "Break limit reached for today."
          : punchedIn
            ? "You are punched in. Progress is running."
            : "You haven’t punched in yet.";

  const displayShiftName =
    todayAttendance?.shiftName || shift?.shiftName || null;

  async function attachPunchGps(payload) {
    if (!geofenceActive) return payload;

    try {
      const geo = await getPunchGeoPosition();
      payload.latitude = geo.latitude;
      payload.longitude = geo.longitude;
      if (geo.accuracy != null) payload.accuracy = geo.accuracy;
      payload.isMockProvider = geo.isMockProvider === true;
    } catch (geoErr) {
      if (requireGps) throw geoErr;
    }
    return payload;
  }

  async function handleCheckIn() {
    setPunchError("");
    setPunchSuccess("");
    setPunching(true);
    setPunchAction("in");

    try {
      const payload = await attachPunchGps({
        punchSource: "web",
      });

      const result = await checkInAttendance(payload);
      const late = result?.meta?.lateMinutes;
      setPunchSuccess(
        late > 0
          ? `Checked in successfully (${late} min late).`
          : "Checked in successfully."
      );
      onCheckedIn?.(result);
    } catch (err) {
      setPunchError(formatPunchError(err));
    } finally {
      setPunching(false);
      setPunchAction(null);
    }
  }

  async function handleCheckOut() {
    setPunchError("");
    setPunchSuccess("");
    setPunching(true);
    setPunchAction("out");

    try {
      const logId = todayAttendance?.logId;
      if (!logId) {
        const err = new Error(
          "Missing attendance log. Please refresh and try again."
        );
        err.code = "MISSING_LOG_ID";
        throw err;
      }

      const payload = await attachPunchGps({});
      const body = {};
      if (payload.latitude != null && payload.longitude != null) {
        body.latitude = payload.latitude;
        body.longitude = payload.longitude;
      }

      const result = await checkOutAttendance(logId, body);
      const hours = result?.meta?.workingHours ?? result?.data?.workingHours;
      setPunchSuccess(
        hours != null
          ? `Checked out successfully (${hours}h worked).`
          : "Checked out successfully."
      );
      onCheckedOut?.(result);
    } catch (err) {
      setPunchError(formatPunchError(err));
    } finally {
      setPunching(false);
      setPunchAction(null);
    }
  }

  async function handleBreakOut() {
    setBreakMenuOpen(false);
    setPunchError("");
    setPunchSuccess("");
    setPunching(true);
    setPunchAction("break-out");

    try {
      const result = await breakOutAttendance(todayAttendance?.logId);
      setPunchSuccess("Break started. Shift progress paused.");
      onBreakChanged?.(result, "out");
    } catch (err) {
      setPunchError(formatPunchError(err));
    } finally {
      setPunching(false);
      setPunchAction(null);
    }
  }

  async function handleBreakIn() {
    setBreakMenuOpen(false);
    setPunchError("");
    setPunchSuccess("");
    setPunching(true);
    setPunchAction("break-in");

    try {
      const result = await breakInAttendance(todayAttendance?.logId);
      const mins =
        result?.meta?.breakMinutes ??
        result?.data?.breakMinutes ??
        result?.data?.lastBreakMinutes;
      setPunchSuccess(
        mins != null
          ? `Break ended (${Math.round(mins)} min). Progress resumed.`
          : "Break ended. Progress resumed."
      );
      onBreakChanged?.(result, "in");
    } catch (err) {
      setPunchError(formatPunchError(err));
    } finally {
      setPunching(false);
      setPunchAction(null);
    }
  }

  return (
    <section className="rounded-[12px] border border-[var(--border)] bg-[var(--surface)] p-4 shadow-[var(--card-shadow)] md:p-5">
      <div className="mb-3 flex flex-wrap items-center gap-2">
        <span className="inline-flex items-center gap-1.5 rounded-full bg-[var(--lavender-soft)] px-2.5 py-1 text-[11px] font-semibold text-[var(--violet)]">
          <Timer className="h-3.5 w-3.5" />
          Today&apos;s Attendance
        </span>
        {displayShiftName ? (
          <span className="text-[12px] text-[var(--muted)]">
            {displayShiftName}
            {shift?.startTime
              ? ` · ${formatTime(shift.startTime, timeFormat)} - ${formatTime(shift.endTime, timeFormat)}`
              : ""}
          </span>
        ) : null}
        {todayAttendance?.attTypeName ? (
          <span className="rounded-full bg-[var(--success-soft)] px-2.5 py-1 text-[11px] font-semibold text-[var(--success)]">
            {todayAttendance.attTypeName}
          </span>
        ) : null}
        {isOnBreak ? (
          <span className="inline-flex items-center gap-1 rounded-full bg-[var(--warning-soft)] px-2.5 py-1 text-[11px] font-semibold text-[var(--warning)]">
            <Coffee className="h-3.5 w-3.5" />
            On Break
          </span>
        ) : null}
      </div>

      {geofenceActive ? (
        <div className="mb-3 flex items-start gap-2 rounded-xl border border-[var(--border)] bg-[var(--panel-soft)] px-3 py-2.5 text-[12px]">
          <MapPin className="mt-0.5 h-4 w-4 shrink-0 text-[var(--violet)]" />
          <div className="min-w-0">
            <p className="font-semibold text-[var(--text)]">
              {geofence.geofence.name}
              {geofence.geofence.radiusMeters
                ? ` · ${geofence.geofence.radiusMeters}m`
                : ""}
            </p>
            <p className="mt-0.5 text-[var(--muted)]">
              {geofence.geofence.address || "Geofence active"}
              {requireGps ? " · GPS required for punch" : ""}
            </p>
          </div>
        </div>
      ) : null}

      <div
        className={`grid grid-cols-1 gap-3 ${
          breakEnabled ? "sm:grid-cols-3" : "sm:grid-cols-2"
        }`}
      >
        <div className="rounded-xl bg-[var(--panel-soft)] px-4 py-3 text-center sm:text-left">
          <p className="text-[11px] font-medium uppercase tracking-wide text-[var(--muted)]">
            Current Time
          </p>
          <p className="mt-1 font-[family-name:var(--font-heading)] text-[22px] font-semibold leading-none text-[var(--text)] tabular-nums sm:text-[26px]">
            {formatClock(now, timeFormat)}
          </p>
        </div>

        <div className="rounded-xl bg-[var(--panel-soft)] px-4 py-3 text-center sm:text-left">
          <p className="text-[11px] font-medium uppercase tracking-wide text-[var(--muted)]">
            {breakEnabled ? "Working Time" : "Worked Today"}
          </p>
          <p className="mt-1 font-[family-name:var(--font-heading)] text-[22px] font-semibold leading-none text-[var(--violet)] tabular-nums sm:text-[26px]">
            {formatWorkedTimer(timeStats.workingMinutes)}
          </p>
        </div>

        {breakEnabled ? (
          <div className="rounded-xl bg-[var(--panel-soft)] px-4 py-3 text-center sm:text-left">
            <p className="text-[11px] font-medium uppercase tracking-wide text-[var(--muted)]">
              Total Time
            </p>
            <p className="mt-1 font-[family-name:var(--font-heading)] text-[22px] font-semibold leading-none text-[var(--text)] tabular-nums sm:text-[26px]">
              {formatWorkedTimer(timeStats.totalMinutes)}
            </p>
            <p className="mt-2 text-[11px] text-[var(--muted)]">
              Break {formatWorkedTimer(timeStats.breakMinutes)}
              {breakPolicy?.allowedBreakMinutes != null
                ? ` / ${Math.round(breakPolicy.allowedBreakMinutes)} min allowed`
                : ""}
            </p>
          </div>
        ) : null}
      </div>

      {breakEnabled && breakLimitLabel ? (
        <div className="mt-3 rounded-xl border border-[var(--border)] bg-[var(--lavender-soft)] px-3 py-2 text-center text-[12px] font-medium text-[var(--violet)]">
          Break allowance · {breakLimitLabel}
          {!breakQuotaAvailable && !isOnBreak ? " · limit reached" : ""}
        </div>
      ) : null}

      <div className="mt-5">
        <div className="mb-2.5 flex items-center justify-between text-[12px]">
          <span className="font-semibold text-[var(--text)]">
            {isOnBreak ? "Shift Progress (paused)" : "Shift Progress"}
          </span>
          <span className="rounded-full bg-[var(--lavender-soft)] px-2.5 py-1 text-[11px] font-semibold tabular-nums text-[var(--violet)]">
            {Math.round(progress.percent)}%
          </span>
        </div>

        <div className="relative h-[34px] overflow-hidden rounded-full bg-[var(--progress-track)] p-[3px] shadow-[inset_0_2px_4px_rgba(75,29,148,0.08)] ring-1 ring-[var(--border)]">
          <div className="relative h-full w-full overflow-hidden rounded-full bg-[var(--progress-track-inner)]">
            <div
              className={`progress-fill relative h-full rounded-full transition-[width] duration-1000 ease-linear ${
                isOnBreak ? "opacity-70" : ""
              }`}
              style={{ width: `${progress.percent}%` }}
            >
              <span className="progress-stripes absolute inset-0 rounded-full opacity-40" />
              <span className="progress-shine absolute inset-0 rounded-full" />
              <span className="absolute inset-x-0 top-0 h-1/2 rounded-t-full bg-gradient-to-b from-white/30 to-transparent" />
              {progress.percent > 14 ? (
                <span className="absolute inset-y-0 right-3 flex items-center text-[12px] font-bold tracking-wide text-white drop-shadow">
                  {Math.round(progress.percent)}%
                </span>
              ) : null}
            </div>

            {progress.percent > 0 && progress.percent < 100 ? (
              <span
                className="pointer-events-none absolute top-1/2 z-10 h-5 w-5 -translate-y-1/2 rounded-full border-[3px] border-white bg-[var(--violet)] shadow-[0_2px_8px_rgba(123,57,236,0.45)]"
                style={{ left: `calc(${progress.percent}% - 10px)` }}
              />
            ) : null}
          </div>
        </div>

        <div className="mt-2.5 flex flex-col gap-1 text-[11px] text-[var(--muted)] sm:flex-row sm:items-center sm:justify-between">
          <span>
            {formatTime(shift?.startTime, timeFormat)} —{" "}
            {formatTime(shift?.endTime, timeFormat)}
          </span>
          <span className="sm:text-right">{statusText}</span>
        </div>
      </div>

      {canWebPunch ? (
        <div className="mt-5 flex flex-col items-center gap-2.5">
          <div
            className={`grid w-full max-w-2xl gap-2.5 ${
              breakEnabled ? "sm:grid-cols-3" : "sm:grid-cols-2"
            }`}
          >
            <Button
              className="h-11 w-full rounded-xl"
              disabled={punchInDisabled}
              onClick={handleCheckIn}
            >
              <LogIn className="h-4 w-4" />
              {punching && punchAction === "in" ? "Checking in..." : "Punch In"}
            </Button>
            <Button
              variant="outline"
              className="h-11 w-full rounded-xl border-[var(--violet)]"
              disabled={punchOutDisabled}
              onClick={handleCheckOut}
            >
              <LogOut className="h-4 w-4" />
              {punching && punchAction === "out"
                ? "Checking out..."
                : "Punch Out"}
            </Button>

            {breakEnabled ? (
              <div className="relative w-full" data-break-menu>
                <Button
                  type="button"
                  variant="outline"
                  className="h-11 w-full rounded-xl"
                  disabled={
                    !punchedIn ||
                    punchedOut ||
                    punching ||
                    !todayAttendance?.logId
                  }
                  onClick={() => setBreakMenuOpen((open) => !open)}
                >
                  <Coffee className="h-4 w-4" />
                  {punching && punchAction?.startsWith("break")
                    ? punchAction === "break-out"
                      ? "Starting break..."
                      : "Ending break..."
                    : isOnBreak
                      ? "Break options"
                      : "Break In / Out"}
                  <ChevronDown className="ml-auto h-4 w-4 opacity-70" />
                </Button>

                {breakMenuOpen ? (
                  <div className="absolute left-0 right-0 z-20 mt-1 overflow-hidden rounded-xl border border-[var(--border)] bg-[var(--surface)] text-left shadow-[var(--card-shadow)]">
                    <button
                      type="button"
                      className="flex w-full items-center gap-2 px-3 py-2.5 text-left text-[13px] text-[var(--text)] hover:bg-[var(--panel-soft)] disabled:cursor-not-allowed disabled:opacity-40"
                      disabled={!canStartBreak}
                      onClick={handleBreakOut}
                    >
                      <LogOut className="h-4 w-4 text-[var(--violet)]" />
                      <span>
                        <span className="font-semibold">Break Out</span>
                        <span className="mt-0.5 block text-[11px] text-[var(--muted)]">
                          {!breakQuotaAvailable && !isOnBreak
                            ? breakLimitLabel
                              ? `Limit reached (${breakLimitLabel})`
                              : "Break limit reached for today"
                            : "Start break · pause shift progress"}
                        </span>
                      </span>
                    </button>
                    <button
                      type="button"
                      className="flex w-full items-center gap-2 border-t border-[var(--border)] px-3 py-2.5 text-left text-[13px] text-[var(--text)] hover:bg-[var(--panel-soft)] disabled:cursor-not-allowed disabled:opacity-40"
                      disabled={!canEndBreak}
                      onClick={handleBreakIn}
                    >
                      <LogIn className="h-4 w-4 text-[var(--violet)]" />
                      <span>
                        <span className="font-semibold">Break In</span>
                        <span className="mt-0.5 block text-[11px] text-[var(--muted)]">
                          End break · resume shift progress
                        </span>
                      </span>
                    </button>
                  </div>
                ) : null}
              </div>
            ) : null}
          </div>

          {punchError ? (
            <p className="w-full max-w-2xl rounded-lg bg-[var(--danger-soft)] px-3 py-2 text-center text-[12px] text-[var(--danger)]">
              {punchError}
            </p>
          ) : null}
          {punchSuccess ? (
            <p className="w-full max-w-2xl rounded-lg bg-[var(--success-soft)] px-3 py-2 text-center text-[12px] text-[var(--success)]">
              {punchSuccess}
            </p>
          ) : null}
        </div>
      ) : (
        <div className="mt-5 rounded-xl border border-dashed border-[var(--border)] bg-[var(--panel-soft)] px-4 py-4 text-center">
          <p className="text-[13px] font-semibold text-[var(--text)]">
            Web punch not available
          </p>
          <p className="mx-auto mt-1 max-w-md text-[12px] leading-relaxed text-[var(--muted)]">
            Your account does not have web punch permission. Use biometric or
            mobile punch if those are allowed.
          </p>
        </div>
      )}

      {breakEnabled && (breakLogs.length > 0 || isOnBreak) ? (
        <div className="mt-4 rounded-xl border border-[var(--border)] bg-[var(--panel-soft)] px-3 py-3">
          <p className="text-[12px] font-semibold text-[var(--text)]">
            Break Logs
          </p>
          <ul className="mt-2 space-y-2">
            {breakLogs.map((row) => (
              <li
                key={row.id}
                className="flex flex-wrap items-center justify-between gap-2 text-[12px]"
              >
                <span className="text-[var(--muted)]">
                  {formatTime(row.start, timeFormat)}
                  {" → "}
                  {row.end ? formatTime(row.end, timeFormat) : "Ongoing"}
                </span>
                <span className="font-semibold tabular-nums text-[var(--text)]">
                  {formatWorkedTimer(row.minutes)}
                </span>
              </li>
            ))}
            {isOnBreak && activeBreakStart ? (
              <li className="flex flex-wrap items-center justify-between gap-2 text-[12px]">
                <span className="text-[var(--warning)]">
                  {formatTime(activeBreakStart, timeFormat)} → Ongoing
                </span>
                <span className="font-semibold tabular-nums text-[var(--warning)]">
                  {formatWorkedTimer(
                    Math.max(
                      0,
                      (now.getTime() -
                        (toDate(activeBreakStart)?.getTime() || now.getTime())) /
                        60000
                    )
                  )}
                </span>
              </li>
            ) : null}
          </ul>
        </div>
      ) : null}
    </section>
  );
}
