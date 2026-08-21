import api from "@/lib/axios";

function unwrap(data, fallbackMessage) {
  if (!data?.success) {
    const err = new Error(data?.message || fallbackMessage);
    err.code = data?.code || data?.error;
    err.data = data?.data ?? data;
    throw err;
  }
  return data;
}

function toApiError(err, fallbackMessage) {
  if (err?.status || err?.code || err?.data) {
    const next = new Error(
      err?.data?.message || err.message || fallbackMessage
    );
    next.status = err.status;
    next.code = err.code || err.data?.code || err.data?.error;
    next.data = err.data?.data ?? err.data;
    return next;
  }
  return err;
}

function pick(...values) {
  for (const value of values) {
    if (value == null || value === "") continue;
    return value;
  }
  return null;
}

/** Prefer calendar YYYY-MM-DD from ISO string (avoid TZ day-shift). */
export function toDateKey(value) {
  if (!value) return null;
  const match = String(value).match(/^(\d{4}-\d{2}-\d{2})/);
  if (match) return match[1];
  const d = new Date(value);
  if (Number.isNaN(d.getTime())) return null;
  const y = d.getFullYear();
  const m = String(d.getMonth() + 1).padStart(2, "0");
  const day = String(d.getDate()).padStart(2, "0");
  return `${y}-${m}-${day}`;
}

function addOneDay(ymd) {
  const [y, m, d] = String(ymd).split("-").map(Number);
  const next = new Date(y, m - 1, d + 1);
  return toDateKey(next);
}

function eachDateKeys(fromKey, toKey) {
  if (!fromKey) return [];
  const end = toKey && toKey >= fromKey ? toKey : fromKey;
  const keys = [];
  let cur = fromKey;
  // Safety cap: 400 days
  for (let i = 0; i < 400 && cur <= end; i += 1) {
    keys.push(cur);
    if (cur === end) break;
    cur = addOneDay(cur);
  }
  return keys;
}

function classifyDay(row, shiftType, shiftName) {
  const type = String(shiftType || "").toUpperCase().replace(/\s+/g, "_");
  const name = String(shiftName || "").toLowerCase();
  const status = String(row?.effectiveStatus || row?.status || "").toLowerCase();

  if (
    row?.isHoliday === true ||
    type.includes("HOLIDAY") ||
    name.includes("holiday")
  ) {
    return { dayKind: "holiday", isOff: true, isHoliday: true };
  }

  if (
    row?.isWeekOff === true ||
    row?.isOff === true ||
    type.includes("WEEK_OFF") ||
    type.includes("WEEKOFF") ||
    type === "OFF" ||
    type === "REST" ||
    type.includes("DAY_OFF") ||
    name.includes("day off") ||
    name.includes("week off") ||
    status === "off"
  ) {
    return { dayKind: "weekOff", isOff: true, isHoliday: false };
  }

  return { dayKind: "working", isOff: false, isHoliday: false };
}

function prettyShiftType(shiftType) {
  if (!shiftType) return null;
  return String(shiftType)
    .replace(/_/g, " ")
    .toLowerCase()
    .replace(/\b\w/g, (c) => c.toUpperCase());
}

/**
 * Normalize one API assignment into one or more calendar-day rows.
 * Supports portal roster shape:
 * assignmentId, effectiveFrom, effectiveTo, shiftName, shiftType, startTime, endTime, …
 */
export function expandRosterAssignment(row, index = 0) {
  if (!row || typeof row !== "object") return [];

  const fromKey = toDateKey(
    pick(
      row.effectiveFrom,
      row.date,
      row.rosterDate,
      row.workDate,
      row.attendanceDate,
      row.shiftDate,
      row.scheduleDate
    )
  );
  const toKey = toDateKey(
    pick(row.effectiveTo, row.effectiveFrom, row.date, fromKey)
  );

  if (!fromKey) return [];

  const startTime = pick(
    row.startTime,
    row.shiftStartTime,
    row.fromTime,
    row.start,
    row.expectedFrom
  );
  const endTime = pick(
    row.endTime,
    row.shiftEndTime,
    row.toTime,
    row.end,
    row.expectedTo
  );
  const shiftName = pick(
    row.shiftName,
    row.shift?.shiftName,
    row.shiftTitle,
    row.name,
    row.shiftCode,
    row.shift?.shiftCode
  );
  const shiftType = pick(
    row.shiftType,
    row.shift?.shiftType,
    row.dayType,
    row.rosterType,
    row.type
  );

  const { dayKind, isOff, isHoliday } = classifyDay(row, shiftType, shiftName);
  const assignmentId = pick(
    row.assignmentId,
    row.rosterId,
    row.id,
    row.scheduleId
  );

  return eachDateKeys(fromKey, toKey).map((date) => ({
    id: `${assignmentId || "asg"}-${date}-${index}`,
    assignmentId: assignmentId || null,
    date,
    effectiveFrom: fromKey,
    effectiveTo: toKey || fromKey,
    shiftId: pick(row.shiftId, row.shift?.shiftId, row.shift?.id),
    shiftName:
      shiftName ||
      (isHoliday ? "Holiday" : isOff ? "Day Off" : "—"),
    shiftCode: pick(row.shiftCode, row.shift?.shiftCode),
    shiftType: prettyShiftType(shiftType) || (isOff ? "Day Off" : "Working"),
    shiftTypeRaw: shiftType || null,
    startTime: isOff ? null : startTime,
    endTime: isOff ? null : endTime,
    lateInGracePeriodMinutes: Number(row.lateInGracePeriodMinutes || 0),
    earlyOutGracePeriodMinutes: Number(row.earlyOutGracePeriodMinutes || 0),
    isAutoAssigned: Boolean(row.isAutoAssigned),
    assignedBy: pick(row.assignedBy, row.assignedByName) || null,
    createdAt: pick(row.createdAt) || null,
    effectiveStatus: pick(row.effectiveStatus, row.status) || null,
    rotationPattern: row.rotationPattern ?? null,
    breakMinutes: Number(
      pick(row.breakMinutes, row.shift?.breakMinutes, row.allowedBreakMinutes) ||
        0
    ),
    branchName: pick(row.branchName, row.locationName, row.siteName),
    departmentName: pick(row.departmentName, row.deptName),
    remarks: pick(row.remarks, row.notes, row.comment) || "",
    dayKind,
    isOff,
    isHoliday,
    raw: row,
  }));
}

/** @deprecated use expandRosterAssignment — kept for single-day callers */
export function normalizeRosterRow(row, index = 0) {
  return expandRosterAssignment(row, index)[0] || null;
}

/**
 * Own shift roster / schedule for a date range.
 * GET /api/employee/portal/roster?from=&to=
 */
export async function getRoster({ from, to } = {}) {
  try {
    const params = {};
    if (from) params.from = from;
    if (to) params.to = to;

    const { data } = await api.get("/api/employee/portal/roster", { params });
    const body = unwrap(data, "Failed to load shift roster");

    const rows = (Array.isArray(body.data) ? body.data : [])
      .flatMap((row, index) => expandRosterAssignment(row, index))
      .filter(Boolean)
      .sort((a, b) => String(a.date || "").localeCompare(String(b.date || "")));

    // If multiple assignments land on same day, keep the latest by createdAt / last wins
    const byDate = new Map();
    for (const row of rows) {
      if (!row.date) continue;
      byDate.set(row.date, row);
    }
    const deduped = Array.from(byDate.values()).sort((a, b) =>
      String(a.date).localeCompare(String(b.date))
    );

    return {
      rows: deduped,
      meta: body.meta || { from: from || null, to: to || null },
    };
  } catch (err) {
    throw toApiError(err, "Failed to load shift roster");
  }
}
