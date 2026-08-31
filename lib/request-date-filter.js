/** Normalize to YYYY-MM-DD for range compares. */
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

/** True when a single date falls within optional from/to (inclusive). */
export function dateInRange(value, from, to) {
  const key = toDateKey(value);
  if (!key) return false;
  if (from && key < from) return false;
  if (to && key > to) return false;
  return true;
}

/**
 * Period overlap: row [fromDate, toDate] intersects filter [from, to].
 * Falls back to single-field checks when period dates are missing.
 */
export function rowMatchesDateRange(row, from, to, fields = []) {
  if (!from && !to) return true;

  const periodFrom = toDateKey(row?.fromDate || row?.startDate);
  const periodTo = toDateKey(row?.toDate || row?.endDate || periodFrom);
  if (periodFrom && periodTo) {
    if (from && periodTo < from) return false;
    if (to && periodFrom > to) return false;
    return true;
  }

  for (const field of fields) {
    if (dateInRange(row?.[field], from, to)) return true;
  }

  return false;
}

export function countActiveDateFilters(from, to) {
  return (from ? 1 : 0) + (to ? 1 : 0);
}
