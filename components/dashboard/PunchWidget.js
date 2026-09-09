"use client";

import { useEffect, useMemo, useState } from "react";
import {
  Coffee,
  LogIn,
  LogOut,
  MapPin,
  Timer,
} from "lucide-react";
import { Button } from "@/components/ui/Button";
import { FlashBanner } from "@/components/ui/FlashBanner";
import {
  breakInAttendance,
  breakOutAttendance,
  checkInAttendance,
  checkOutAttendance,
  formatPunchError,
  getPunchGeoPosition,
  resolveAttendanceLogId,
} from "@/api/attendance";
import { getWebDeviceName } from "@/api/auth";
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
import { AttendanceTypeBadge } from "@/components/attendance/AttendanceTypeBadge";
import { useAttendancePolicy } from "@/hooks/useAttendancePolicy";
import { useAttendanceTypes } from "@/hooks/useAttendanceTypes";

function buildBasePunchPayload() {
  return {
    punchSource: "web",
    deviceName: getWebDeviceName(),
  };
}
function parseShiftMinutes(time24) {
  if (!time24) return null;
  const raw = String(time24).trim();

  // ISO datetime → local clock minutes
  if (raw.includes("T") || raw.endsWith("Z")) {
    const date = new Date(raw);
    if (!Number.isNaN(date.getTime())) {
      return date.getHours() * 60 + date.getMinutes();
    }
  }

  const match = raw.match(/^(\d{1,2}):(\d{2})(?::\d{2})?/);
  if (!match) return null;
  const h = Number(match[1]);
  const m = Number(match[2]);
  if (!Number.isFinite(h) || !Number.isFinite(m)) return null;
  return h * 60 + m;
}

/** Parse API punch timestamps (ISO or "HH:mm" / "HH:mm:ss" as today local). */
function toDate(value) {
  if (!value) return null;
  if (value instanceof Date) {
    return Number.isNaN(value.getTime()) ? null : value;
  }

  const raw = String(value).trim();
  if (!raw) return null;

  // Time-only → today at that clock time (API often returns "09:15" / "09:15:00")
  const timeOnly = raw.match(/^(\d{1,2}):(\d{2})(?::(\d{2}))?$/);
  if (timeOnly) {
    const d = new Date();
    d.setHours(
      Number(timeOnly[1]),
      Number(timeOnly[2]),
      Number(timeOnly[3] || 0),
      0
    );
    return d;
  }

  const d = new Date(raw);
  return Number.isNaN(d.getTime()) ? null : d;
}

function getShiftDurationMinutes(shift) {
  const start = parseShiftMinutes(shift?.startTime);
  const end = parseShiftMinutes(shift?.endTime);
  if (start == null || end == null) return 8 * 60; // fallback 8h so bar still works
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

  const percent = Math.min(
    100,
    Math.max(0, (elapsedMinutes / totalMinutes) * 100)
  );
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
  const { policy: attendancePolicy } = useAttendancePolicy();
  const breakEnabled = canShowBreakManagement({
    breakManagementEnabled: hasFlag("breakManagement"),
    today: todayAttendance,
    punchPermissions,
    employee,
    attendancePolicy,
  });

  const [now, setNow] = useState(() => new Date());
  const [punching, setPunching] = useState(false);
  const [punchAction, setPunchAction] = useState(null);
  const [punchError, setPunchError] = useState("");
  const [punchSuccess, setPunchSuccess] = useState("");
  // Avoid CSS width animation on first paint (looks like fill→drain on refresh).
  const [progressReady, setProgressReady] = useState(false);
  const { types: attendanceTypes } = useAttendanceTypes();

  const attendanceLogId = resolveAttendanceLogId(todayAttendance);

  const punchInAt =
    todayAttendance?.checkInTime ||
    todayAttendance?.punchInAt ||
    timer?.punchInAt ||
    null;
  const punchOutAt =
    todayAttendance?.checkOutTime ||
    todayAttendance?.punchOutAt ||
    timer?.punchOutAt ||
    null;

  // Infer punch state from times when API omits boolean flags.
  const punchedOut = Boolean(
    todayAttendance?.isCheckedOut === true ||
    (punchInAt && punchOutAt) ||
    (timer?.punchInAt && timer?.punchOutAt && !todayAttendance)
  );
  const punchedIn = Boolean(
    !punchedOut &&
    (todayAttendance?.isCheckedIn === true ||
      Boolean(punchInAt) ||
      (Boolean(timer?.punchInAt) && !todayAttendance))
  );
  const isOnBreak = Boolean(
    breakEnabled &&
    punchedIn &&
    (todayAttendance?.isOnBreak === true ||
      todayAttendance?.onBreak === true)
  );
  const canWebPunch = canWebPunchPermission(punchPermissions, employee);
  const geofenceActive = Boolean(geofence?.geofence);
  const requireGps = geofenceActive && geofence?.requireGpsForPunch === true;

  const breakPolicy = useMemo(
    () =>
      breakEnabled
        ? getBreakPolicy(todayAttendance, shift, attendancePolicy)
        : null,
    [breakEnabled, todayAttendance, shift, attendancePolicy]
  );
  const breakLogs = breakPolicy?.logs || [];
  const activeBreakStart = getActiveBreakStart(todayAttendance, isOnBreak);
  const breakLimitLabel = formatBreakLimitMessage(breakPolicy);

  useEffect(() => {
    const id = setInterval(() => setNow(new Date()), 1000);
    return () => clearInterval(id);
  }, []);

  useEffect(() => {
    const id = requestAnimationFrame(() => {
      requestAnimationFrame(() => setProgressReady(true));
    });
    return () => cancelAnimationFrame(id);
  }, []);

  const timeStats = useMemo(() => {
    if (!punchInAt || (!punchedIn && !punchedOut)) {
      return {
        totalMinutes: 0,
        workingMinutes: 0,
        breakMinutes: 0,
      };
    }

    const start = toDate(punchInAt);
    const end = punchedOut ? toDate(punchOutAt) || now : now;

    let totalMinutes = 0;
    if (start) {
      totalMinutes = Math.max(0, (end.getTime() - start.getTime()) / 60000);
    } else {
      // Fallback if punch time could not be parsed
      totalMinutes =
        Number(timer?.workedMinutesToday) ||
        Number(todayAttendance?.workingMinutes) ||
        0;
    }

    if (punchedOut && breakPolicy?.totalMinutes != null) {
      totalMinutes = breakPolicy.totalMinutes;
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
        breakMinutes += Math.max(
          0,
          (now.getTime() - breakStart.getTime()) / 60000
        );
      }
    }

    if (breakMinutes > totalMinutes) breakMinutes = totalMinutes;

    let workingMinutes = Math.max(0, totalMinutes - breakMinutes);

    if (punchedOut && breakPolicy?.workingMinutes != null) {
      workingMinutes = Number(breakPolicy.workingMinutes);
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
    todayAttendance?.workingMinutes,
  ]);

  const progress = useMemo(
    () =>
      getPunchProgress({
        shift,
        punchInAt,
        punchedIn,
        punchedOut,
        workingMinutes: timeStats.workingMinutes,
      }),
    [shift, punchInAt, punchedIn, punchedOut, timeStats.workingMinutes]
  );

  const punchInDisabled = !canWebPunch || punchedIn || punchedOut || punching;
  const punchOutDisabled =
    !canWebPunch ||
    !punchedIn ||
    punchedOut ||
    punching ||
    isOnBreak ||
    !attendanceLogId;

  const breakQuotaAvailable = canStartAnotherBreak(breakPolicy, { isOnBreak });

  const canStartBreak =
    breakEnabled &&
    punchedIn &&
    !punchedOut &&
    !isOnBreak &&
    Boolean(attendanceLogId) &&
    !punching &&
    breakQuotaAvailable;
  const canEndBreak =
    breakEnabled &&
    punchedIn &&
    !punchedOut &&
    isOnBreak &&
    Boolean(attendanceLogId) &&
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
      const payload = await attachPunchGps(buildBasePunchPayload());
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
      const logId = attendanceLogId;
      if (!logId) {
        const err = new Error(
          "Missing attendance log. Please refresh and try again."
        );
        err.code = "MISSING_LOG_ID";
        throw err;
      }

      const payload = await attachPunchGps(buildBasePunchPayload());
      const result = await checkOutAttendance(logId, payload);
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
    setPunchError("");
    setPunchSuccess("");
    setPunching(true);
    setPunchAction("break-out");

    try {
      const result = await breakOutAttendance(attendanceLogId, {});
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
    setPunchError("");
    setPunchSuccess("");
    setPunching(true);
    setPunchAction("break-in");

    try {
      const result = await breakInAttendance(attendanceLogId, {});
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
      <div className="mb-4 flex flex-wrap items-center justify-between gap-2">
        <div className="flex flex-wrap items-center gap-2">
          <span className="inline-flex items-center gap-1.5 rounded-full bg-[var(--lavender-soft)] px-2.5 py-1 text-[11px] font-semibold text-[var(--violet)]">
            <Timer className="h-3.5 w-3.5" />
            Today&apos;s Attendance
          </span>
          {todayAttendance?.attTypeName ||
            todayAttendance?.attTypeCode ||
            todayAttendance?.status ? (
            <AttendanceTypeBadge
              row={todayAttendance}
              types={attendanceTypes}
            />
          ) : null}
          {isOnBreak ? (
            <span className="inline-flex items-center gap-1 rounded-full bg-[var(--warning-soft)] px-2.5 py-1 text-[11px] font-semibold text-[var(--warning)]">
              <Coffee className="h-3.5 w-3.5" />
              On Break
            </span>
          ) : null}
        </div>
        {displayShiftName ? (
          <p className="text-[12px] text-[var(--muted)]">
            {displayShiftName}
            {shift?.startTime
              ? ` · ${formatTime(shift.startTime, timeFormat)} – ${formatTime(shift.endTime, timeFormat)}`
              : ""}
          </p>
        ) : null}
      </div>

      {geofenceActive ? (
        <div className="mb-4 flex items-start gap-2 rounded-xl border border-[var(--border)] bg-[var(--panel-soft)] px-3 py-2.5 text-[12px]">
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
        className={`grid gap-4 ${breakEnabled ? "xl:grid-cols-[minmax(0,1.35fr)_minmax(0,1fr)]" : ""
          }`}
      >
        {/* Left: time + progress + punch */}
        <div className="min-w-0 space-y-4">
          <div
            className={`grid grid-cols-1 gap-2.5 ${breakEnabled ? "sm:grid-cols-3" : "sm:grid-cols-2"
              }`}
          >
            <div className="rounded-xl bg-[var(--panel-soft)] px-3.5 py-3">
              <p className="text-[10px] font-semibold uppercase tracking-wide text-[var(--muted)]">
                Current
              </p>
              <p className="mt-1 text-[16px] font-bold tabular-nums leading-none text-[var(--text)]">
                {formatClock(now, timeFormat)}
              </p>
            </div>
            <div className="rounded-xl bg-[var(--panel-soft)] px-3.5 py-3">
              <p className="text-[10px] font-semibold uppercase tracking-wide text-[var(--muted)]">
                {breakEnabled ? "Working" : "Worked Today"}
              </p>
              <p className="mt-1 text-[16px] font-bold tabular-nums leading-none text-[var(--violet)]">
                {formatWorkedTimer(timeStats.workingMinutes)}
              </p>
            </div>
            {breakEnabled ? (
              <div className="rounded-xl bg-[var(--panel-soft)] px-3.5 py-3">
                <p className="text-[10px] font-semibold uppercase tracking-wide text-[var(--muted)]">
                  Total
                </p>
                <p className="mt-1 text-[16px] font-bold tabular-nums leading-none text-[var(--text)]">
                  {formatWorkedTimer(timeStats.totalMinutes)}
                </p>
              </div>
            ) : null}
          </div>

          <div>
            <div className="mb-2 flex items-center justify-between gap-2 text-[12px]">
              <span className="font-semibold text-[var(--text)]">
                {isOnBreak ? "Shift Progress (paused)" : "Shift Progress"}
              </span>
              <span className="rounded-full bg-[var(--lavender-soft)] px-2.5 py-0.5 text-[11px] font-semibold tabular-nums text-[var(--violet)]">
                {Math.round(progress.percent)}%
              </span>
            </div>

            <div className="relative h-[30px] overflow-hidden rounded-full bg-[var(--progress-track)] p-[3px] shadow-[inset_0_2px_4px_rgba(75,29,148,0.08)] ring-1 ring-[var(--border)]">
              <div className="relative h-full w-full overflow-hidden rounded-full bg-[var(--progress-track-inner)]">
                <div
                  className={`progress-fill relative h-full rounded-full ${progressReady
                    ? "transition-[width] duration-700 ease-linear"
                    : ""
                    } ${isOnBreak ? "opacity-70" : ""}`}
                  style={{ width: `${progress.percent}%` }}
                >
                  <span className="progress-stripes absolute inset-0 rounded-full opacity-40" />
                  <span className="progress-shine absolute inset-0 rounded-full" />
                  <span className="absolute inset-x-0 top-0 h-1/2 rounded-t-full bg-gradient-to-b from-white/30 to-transparent" />
                  {progress.percent > 14 ? (
                    <span className="absolute inset-y-0 right-3 flex items-center text-[11px] font-bold tracking-wide text-white drop-shadow">
                      {Math.round(progress.percent)}%
                    </span>
                  ) : null}
                </div>
                {progress.percent > 0 && progress.percent < 100 ? (
                  <span
                    className="pointer-events-none absolute top-1/2 z-10 h-4 w-4 -translate-y-1/2 rounded-full border-[2.5px] border-white bg-[var(--violet)] shadow-[0_2px_8px_rgba(123,57,236,0.45)]"
                    style={{ left: `calc(${progress.percent}% - 8px)` }}
                  />
                ) : null}
              </div>
            </div>

            <p className="mt-2 text-[11px] text-[var(--muted)]">{statusText}</p>
          </div>

          {canWebPunch ? (
            <div className="space-y-2.5">
              <div className="grid grid-cols-1 gap-2.5 sm:grid-cols-2">
                <Button
                  className="h-11 w-full rounded-xl"
                  disabled={punchInDisabled}
                  onClick={handleCheckIn}
                >
                  <LogIn className="h-4 w-4" />
                  {punching && punchAction === "in"
                    ? "Checking in..."
                    : "Punch In"}
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
              </div>

              {punchError ? (
                <FlashBanner
                  message={punchError}
                  tone="danger"
                  compact
                  className="text-center"
                  duration={5000}
                  onDismiss={() => setPunchError("")}
                />
              ) : null}
              {punchSuccess ? (
                <FlashBanner
                  message={punchSuccess}
                  tone="success"
                  compact
                  className="text-center"
                  duration={4000}
                  onDismiss={() => setPunchSuccess("")}
                />
              ) : null}
            </div>
          ) : (
            <div className="rounded-xl border border-dashed border-[var(--border)] bg-[var(--panel-soft)] px-4 py-4 text-center">
              <p className="text-[13px] font-semibold text-[var(--text)]">
                Web punch not available
              </p>
              <p className="mx-auto mt-1 max-w-md text-[12px] leading-relaxed text-[var(--muted)]">
                Your account does not have web punch permission. Use biometric
                or mobile punch if those are allowed.
              </p>
            </div>
          )}
        </div>

        {/* Right: single Break panel — allowance + actions + logs */}
        {breakEnabled ? (
          <aside className="flex min-w-0 flex-col overflow-hidden rounded-xl border border-[var(--border)] bg-[var(--panel-soft)]">
            <div className="flex items-center justify-between gap-2 border-b border-[var(--border)] bg-[var(--lavender-soft)]/60 px-3.5 py-2.5">
              <div className="flex items-center gap-2">
                <span className="inline-flex h-7 w-7 items-center justify-center rounded-lg bg-[var(--surface)] text-[var(--violet)] shadow-sm">
                  <Coffee className="h-3.5 w-3.5" />
                </span>
                <div>
                  <p className="text-[13px] font-semibold text-[var(--text)]">
                    Break
                  </p>
                  <p className="text-[11px] text-[var(--muted)]">
                    {isOnBreak
                      ? "Currently on break"
                      : punchedIn && !punchedOut
                        ? "Manage your breaks"
                        : "Available after punch in"}
                  </p>
                </div>
              </div>
              {isOnBreak ? (
                <span className="rounded-full bg-[var(--warning-soft)] px-2 py-0.5 text-[10px] font-semibold text-[var(--warning)]">
                  Live
                </span>
              ) : null}
            </div>

            <div className="space-y-3 p-3.5">
              <div className="grid grid-cols-2 gap-2">
                <div className="rounded-lg border border-[var(--border)] bg-[var(--surface)] px-3 py-2">
                  <p className="text-[10px] font-medium uppercase tracking-wide text-[var(--muted)]">
                    Breaks
                  </p>
                  <p className="mt-0.5 text-[13px] font-semibold tabular-nums text-[var(--text)]">
                    {breakPolicy?.breaksUsed ?? breakLogs.length}
                    {breakPolicy?.maxBreaks != null
                      ? ` / ${breakPolicy.maxBreaks}`
                      : ""}
                  </p>
                </div>
                <div className="rounded-lg border border-[var(--border)] bg-[var(--surface)] px-3 py-2">
                  <p className="text-[10px] font-medium uppercase tracking-wide text-[var(--muted)]">
                    Minutes
                  </p>
                  <p className="mt-0.5 text-[13px] font-semibold tabular-nums text-[var(--text)]">
                    {Math.round(timeStats.breakMinutes)}
                    {breakPolicy?.allowedBreakMinutes != null
                      ? ` / ${Math.round(breakPolicy.allowedBreakMinutes)}`
                      : ""}
                  </p>
                </div>
              </div>

              {!breakQuotaAvailable && !isOnBreak ? (
                <p className="rounded-lg bg-[var(--warning-soft)] px-2.5 py-1.5 text-[11px] font-medium text-[var(--warning)]">
                  Break limit reached for today
                  {breakLimitLabel ? ` · ${breakLimitLabel}` : ""}
                </p>
              ) : null}

              {canWebPunch ? (
                <div className="grid grid-cols-2 gap-2">
                  <Button
                    type="button"
                    variant="outline"
                    className="h-10 w-full rounded-xl text-[13px]"
                    disabled={!canStartBreak}
                    onClick={handleBreakOut}
                  >
                    {punching && punchAction === "break-out"
                      ? "Starting..."
                      : "Break In"}
                  </Button>
                  <Button
                    type="button"
                    className="h-10 w-full rounded-xl text-[13px]"
                    disabled={!canEndBreak}
                    onClick={handleBreakIn}
                  >
                    {punching && punchAction === "break-in"
                      ? "Ending..."
                      : "Break Out"}
                  </Button>
                </div>
              ) : null}

              <div>
                <div className="mb-1.5 flex items-center justify-between">
                  <p className="text-[11px] font-semibold uppercase tracking-wide text-[var(--muted)]">
                    Logs
                  </p>
                  {breakLogs.length > 0 || isOnBreak ? (
                    <span className="text-[11px] tabular-nums text-[var(--muted)]">
                      {(breakLogs.length || 0) + (isOnBreak ? 1 : 0)} session
                      {(breakLogs.length || 0) + (isOnBreak ? 1 : 0) === 1
                        ? ""
                        : "s"}
                    </span>
                  ) : null}
                </div>

                {breakLogs.length > 0 || isOnBreak ? (
                  <ul className="max-h-[168px] space-y-1.5 overflow-y-auto pr-0.5">
                    {breakLogs.map((row) => (
                      <li
                        key={row.id}
                        className="flex items-center justify-between gap-2 rounded-lg border border-[var(--border)] bg-[var(--surface)] px-2.5 py-2 text-[12px]"
                      >
                        <span className="min-w-0 truncate text-[var(--muted)]">
                          {formatTime(row.start, timeFormat)}
                          {" → "}
                          {row.end ? formatTime(row.end, timeFormat) : "Ongoing"}
                        </span>
                        <span className="shrink-0 font-semibold tabular-nums text-[var(--text)]">
                          {formatWorkedTimer(row.minutes)}
                        </span>
                      </li>
                    ))}
                    {isOnBreak && activeBreakStart ? (
                      <li className="flex items-center justify-between gap-2 rounded-lg border border-[var(--warning)]/30 bg-[var(--warning-soft)] px-2.5 py-2 text-[12px]">
                        <span className="min-w-0 truncate font-medium text-[var(--warning)]">
                          {formatTime(activeBreakStart, timeFormat)} → Ongoing
                        </span>
                        <span className="shrink-0 font-semibold tabular-nums text-[var(--warning)]">
                          {formatWorkedTimer(
                            Math.max(
                              0,
                              (now.getTime() -
                                (toDate(activeBreakStart)?.getTime() ||
                                  now.getTime())) /
                              60000
                            )
                          )}
                        </span>
                      </li>
                    ) : null}
                  </ul>
                ) : (
                  <p className="rounded-lg border border-dashed border-[var(--border)] bg-[var(--surface)] px-3 py-4 text-center text-[12px] text-[var(--muted)]">
                    No breaks taken yet today.
                  </p>
                )}
              </div>
            </div>
          </aside>
        ) : null}
      </div>
    </section>
  );
}
