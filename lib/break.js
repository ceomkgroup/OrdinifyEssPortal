/**
 * Break-management helpers.
 *
 * Visibility: company `breakManagement` flag (+ optional employee/today allow flags).
 * Limits & stats: prefer fields returned by attendance/today, shift, or break APIs.
 */

function pickNumber(...values) {
  for (const value of values) {
    if (value == null || value === "") continue;
    const n = Number(value);
    if (Number.isFinite(n)) return n;
  }
  return null;
}

function hoursToMinutes(hours) {
  const n = Number(hours);
  if (!Number.isFinite(n)) return null;
  return n * 60;
}

function toDate(value) {
  if (!value) return null;
  const d = value instanceof Date ? value : new Date(value);
  return Number.isNaN(d.getTime()) ? null : d;
}

export function normalizeBreakLogs(today) {
  const raw =
    today?.breaks ||
    today?.breakLogs ||
    today?.breakHistory ||
    today?.breakSessions ||
    [];
  if (!Array.isArray(raw)) return [];

  return raw
    .map((row, index) => {
      const start =
        row.breakOutTime ||
        row.breakStartTime ||
        row.startTime ||
        row.startedAt ||
        null;
      const end =
        row.breakInTime ||
        row.breakEndTime ||
        row.endTime ||
        row.endedAt ||
        null;
      const startDate = toDate(start);
      const endDate = toDate(end);
      let minutes = Number(row.breakMinutes ?? row.minutes ?? row.durationMinutes);
      if (!Number.isFinite(minutes) && startDate && endDate) {
        minutes = (endDate.getTime() - startDate.getTime()) / 60000;
      }
      return {
        id: row.breakId || row.id || `break-${index}`,
        start,
        end,
        minutes: Number.isFinite(minutes) ? Math.max(0, minutes) : 0,
      };
    })
    .filter((row) => row.start);
}

export function getActiveBreakStart(today, isOnBreak) {
  if (!isOnBreak) return null;
  return (
    today?.currentBreakStart ||
    today?.breakOutTime ||
    today?.lastBreakOutTime ||
    today?.activeBreakStart ||
    null
  );
}

/**
 * Whether break UI/actions should be available.
 * Module off → never show. Employee/today can also explicitly disallow.
 */
export function canShowBreakManagement({
  breakManagementEnabled,
  today,
  punchPermissions,
  employee,
} = {}) {
  if (!breakManagementEnabled) return false;

  if (today?.breakAllowed === false || today?.canTakeBreak === false) {
    return false;
  }
  if (today?.breakEnabled === false) return false;

  const source = punchPermissions || employee || {};
  if (
    source.allowBreak === false ||
    source.allowBreakPunch === false ||
    source.breakManagement === false
  ) {
    return false;
  }

  return true;
}

/**
 * Normalize break policy + usage from today/shift/API payloads.
 * Example company rule: 60 min break allowance, max 3 splits →
 * maxBreaks=3, allowedBreakMinutes=60.
 */
export function getBreakPolicy(today, shift) {
  const policy =
    today?.breakPolicy ||
    today?.breakSettings ||
    today?.break ||
    shift?.breakPolicy ||
    shift?.breakSettings ||
    {};

  const logs = normalizeBreakLogs(today);
  const completedLogs = logs.filter((row) => row.end);
  const completedFromLogs = completedLogs.length;
  const minutesFromLogs = completedLogs.reduce(
    (sum, row) => sum + (Number(row.minutes) || 0),
    0
  );

  const maxBreaks = pickNumber(
    today?.maxBreaks,
    today?.allowedBreaks,
    today?.maxBreakCount,
    today?.breakLimit,
    today?.breaksAllowed,
    today?.maxDailyBreaks,
    policy.maxBreaks,
    policy.allowedBreaks,
    policy.maxBreakCount,
    policy.breakLimit,
    shift?.maxBreaks,
    shift?.allowedBreaks,
    shift?.maxBreakCount
  );

  const allowedBreakMinutes = pickNumber(
    today?.allowedBreakMinutes,
    today?.maxBreakMinutes,
    today?.breakMinutesAllowed,
    today?.breakAllowanceMinutes,
    today?.breakMinutesLimit,
    policy.allowedBreakMinutes,
    policy.maxBreakMinutes,
    policy.breakMinutesAllowed,
    policy.breakAllowanceMinutes,
    shift?.allowedBreakMinutes,
    shift?.maxBreakMinutes,
    shift?.breakMinutes
  );

  let breaksUsed = pickNumber(
    today?.breaksUsed,
    today?.breakCount,
    today?.usedBreaks,
    today?.completedBreakCount,
    today?.breaksTaken,
    policy.breaksUsed,
    policy.breakCount
  );
  if (breaksUsed == null) breaksUsed = completedFromLogs;

  let breaksRemaining = pickNumber(
    today?.breaksRemaining,
    today?.remainingBreaks,
    policy.breaksRemaining,
    policy.remainingBreaks
  );
  if (breaksRemaining == null && maxBreaks != null) {
    breaksRemaining = Math.max(0, maxBreaks - breaksUsed);
  }

  let breakMinutesUsed = pickNumber(
    today?.breakMinutes,
    today?.totalBreakMinutes,
    today?.usedBreakMinutes,
    today?.breakMinutesUsed,
    policy.breakMinutes,
    policy.totalBreakMinutes
  );
  if (breakMinutesUsed == null) breakMinutesUsed = minutesFromLogs;

  let breakMinutesRemaining = pickNumber(
    today?.breakMinutesRemaining,
    today?.remainingBreakMinutes,
    policy.breakMinutesRemaining
  );
  if (breakMinutesRemaining == null && allowedBreakMinutes != null) {
    breakMinutesRemaining = Math.max(0, allowedBreakMinutes - breakMinutesUsed);
  }

  const workingMinutes = pickNumber(
    today?.workingMinutes,
    hoursToMinutes(today?.workingHours),
    hoursToMinutes(today?.workedHours),
    policy.workingMinutes
  );

  const totalMinutes = pickNumber(
    today?.totalMinutes,
    today?.elapsedMinutes,
    today?.totalElapsedMinutes,
    hoursToMinutes(today?.totalHours),
    hoursToMinutes(today?.totalWorkingHoursWithBreak),
    policy.totalMinutes
  );

  return {
    maxBreaks,
    allowedBreakMinutes,
    breaksUsed,
    breaksRemaining,
    breakMinutesUsed,
    breakMinutesRemaining,
    workingMinutes,
    totalMinutes,
    logs,
  };
}

/** Can start another break (Break Out) given policy usage. */
export function canStartAnotherBreak(policy, { isOnBreak } = {}) {
  if (isOnBreak) return false;
  if (!policy) return true;

  if (policy.maxBreaks != null && policy.breaksUsed >= policy.maxBreaks) {
    return false;
  }
  if (
    policy.breaksRemaining != null &&
    policy.breaksRemaining <= 0
  ) {
    return false;
  }
  if (
    policy.allowedBreakMinutes != null &&
    policy.breakMinutesRemaining != null &&
    policy.breakMinutesRemaining <= 0
  ) {
    return false;
  }
  return true;
}

export function formatBreakLimitMessage(policy) {
  if (!policy) return "";
  const parts = [];
  if (policy.maxBreaks != null) {
    parts.push(`Breaks ${policy.breaksUsed ?? 0}/${policy.maxBreaks}`);
  } else if (policy.breaksUsed != null) {
    parts.push(`Breaks used ${policy.breaksUsed}`);
  }
  if (policy.allowedBreakMinutes != null) {
    const used = Math.round(policy.breakMinutesUsed ?? 0);
    const allowed = Math.round(policy.allowedBreakMinutes);
    parts.push(`${used}/${allowed} min`);
  } else if (policy.breakMinutesUsed != null) {
    parts.push(`${Math.round(policy.breakMinutesUsed)} min used`);
  }
  return parts.join(" · ");
}
