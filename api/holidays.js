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

function toDateKey(value) {
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

function pad2(n) {
  return String(n).padStart(2, "0");
}

/** Build YYYY-MM-DD for year + month + day; null if invalid calendar date. */
function buildDateKey(year, month, day) {
  const y = Number(year);
  const m = Number(month);
  const d = Number(day);
  if (!y || !m || !d) return null;
  const dt = new Date(y, m - 1, d, 12, 0, 0);
  if (
    dt.getFullYear() !== y ||
    dt.getMonth() !== m - 1 ||
    dt.getDate() !== d
  ) {
    return null;
  }
  return `${y}-${pad2(m)}-${pad2(d)}`;
}

function capitalizeLabel(value) {
  if (!value) return null;
  const s = String(value).replace(/_/g, " ").trim();
  if (!s) return null;
  return s.charAt(0).toUpperCase() + s.slice(1).toLowerCase();
}

/**
 * Expand one API holiday into calendar occurrences for a target year.
 * Supports recurring (month/day) and fixed from/to date ranges.
 */
export function expandHolidayOccurrences(row, year) {
  if (!row || typeof row !== "object") return [];

  const targetYear = Number(year) || new Date().getFullYear();
  const holidayId = pick(row.holidayId, row.id);
  const title = pick(row.title, row.holidayTitle, row.name) || "Holiday";
  const holidayTypeRaw = String(
    pick(row.holidayType, row.type) || ""
  ).toLowerCase();
  const isOptional =
    holidayTypeRaw === "optional" ||
    row.isOptional === true ||
    row.isOptional === 1;
  const typeName = pick(row.typeName, row.attendTypeName) || "Holiday";
  const typeCode = pick(row.typeCode) || null;
  const colorCode = pick(row.colorCode, row.color) || "#7c3aed";
  const isRecurring = Boolean(row.isRecurring);
  const description = row.description || null;
  const slots = Array.isArray(row.dates)
    ? row.dates
    : row.fromDate || row.attendDate
      ? [
          {
            fromDate: row.fromDate || row.attendDate,
            toDate: row.toDate || row.fromDate || row.attendDate,
            recurringMonth: row.recurringMonth,
            recurringDay: row.recurringDay,
          },
        ]
      : [];

  const occurrences = [];

  for (let i = 0; i < slots.length; i += 1) {
    const slot = slots[i] || {};
    const recurringMonth = slot.recurringMonth ?? row.recurringMonth;
    const recurringDay = slot.recurringDay ?? row.recurringDay;

    if (recurringMonth != null && recurringDay != null) {
      const key = buildDateKey(targetYear, recurringMonth, recurringDay);
      if (!key) continue;

      const validFrom = toDateKey(slot.fromDate);
      const validTo = toDateKey(slot.toDate);
      if (validFrom && key < validFrom) continue;
      if (validTo && key > validTo) continue;

      occurrences.push({
        fromDate: key,
        toDate: key,
        slotIndex: i,
      });
      continue;
    }

    const from = toDateKey(slot.fromDate || slot.attendDate);
    const to = toDateKey(slot.toDate) || from;
    if (!from) continue;

    const yearStart = `${targetYear}-01-01`;
    const yearEnd = `${targetYear}-12-31`;
    if (to < yearStart || from > yearEnd) continue;

    occurrences.push({
      fromDate: from < yearStart ? yearStart : from,
      toDate: to > yearEnd ? yearEnd : to,
      slotIndex: i,
    });
  }

  return occurrences.map((occ) => ({
    holidayId,
    id: holidayId,
    occurrenceId: `${holidayId || title}:${occ.fromDate}:${occ.slotIndex}`,
    title,
    description,
    isRecurring,
    isOptional,
    holidayType: holidayTypeRaw || (isOptional ? "optional" : "mandatory"),
    holidayTypeLabel: capitalizeLabel(
      holidayTypeRaw || (isOptional ? "optional" : "mandatory")
    ),
    typeName,
    typeCode,
    colorCode,
    fromDate: occ.fromDate,
    toDate: occ.toDate,
    attendDate: occ.fromDate,
  }));
}

/** Legacy single-row normalize (no year expand). Prefer expandHolidayOccurrences. */
export function normalizeHolidayRow(row, year) {
  const expanded = expandHolidayOccurrences(
    row,
    year ?? new Date().getFullYear()
  );
  return expanded[0] || null;
}

/**
 * Company holiday calendar for the employee.
 * GET /api/employee/portal/holidays?year=&from=&to=
 *
 * Response items use `dates[]` with either:
 * - recurringMonth + recurringDay (annual), or
 * - fixed fromDate / toDate
 */
export async function listHolidays({ year, from, to } = {}) {
  const targetYear =
    year != null && year !== ""
      ? Number(year)
      : new Date().getFullYear();

  try {
    const params = {};
    if (targetYear) params.year = targetYear;
    if (from) params.from = from;
    if (to) params.to = to;

    const { data } = await api.get("/api/employee/portal/holidays", {
      params,
    });
    const body = unwrap(data, "Failed to load holidays");
    const source = Array.isArray(body.data) ? body.data : [];

    const rows = source
      .flatMap((row) => expandHolidayOccurrences(row, targetYear))
      .filter(Boolean)
      .sort((a, b) => {
        const ta = new Date(`${a.fromDate}T12:00:00`).getTime();
        const tb = new Date(`${b.fromDate}T12:00:00`).getTime();
        return ta - tb;
      });

    return {
      rows,
      total: rows.length || Number(body.total) || 0,
      rawTotal: Number(body.total) || source.length,
    };
  } catch (err) {
    throw toApiError(err, "Failed to load holidays");
  }
}
