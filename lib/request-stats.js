/**
 * Derive SoftStat counts from a list response — no extra API call.
 */

export function emptyRequestStats(extra = {}) {
  return {
    total: 0,
    pending: 0,
    approved: 0,
    cancelled: 0,
    ...extra,
  };
}

/**
 * @param {Array<{ status?: string }>} rows
 * @param {{
 *   total?: number|null,
 *   extraBuckets?: string[],
 *   cancelledStatuses?: string[],
 * }} [opts]
 */
export function countRequestStats(rows = [], opts = {}) {
  const cancelledStatuses = opts.cancelledStatuses || [
    "rejected",
    "cancelled",
    "canceled",
  ];
  const next = emptyRequestStats(
    Object.fromEntries((opts.extraBuckets || []).map((k) => [k, 0]))
  );
  next.total =
    opts.total != null && Number.isFinite(Number(opts.total))
      ? Number(opts.total)
      : rows.length;

  for (const row of rows) {
    const s = String(row.status || "").toLowerCase();
    if (!s) continue;
    if (cancelledStatuses.includes(s)) {
      next.cancelled += 1;
      continue;
    }
    if (Object.prototype.hasOwnProperty.call(next, s) && s !== "total") {
      next[s] += 1;
    }
  }
  return next;
}

/**
 * When the table is filtered by status, refresh only that bucket from meta.total
 * and keep other SoftStat values from the last full (status=all) count.
 */
export function mergeFilteredStats(prev, status, metaTotal, rowCount) {
  const count =
    metaTotal != null && Number.isFinite(Number(metaTotal))
      ? Number(metaTotal)
      : rowCount;
  const s = String(status || "").toLowerCase();
  if (!s || s === "all") return prev;

  const next = { ...prev };
  if (s === "rejected" || s === "cancelled" || s === "canceled") {
    next.cancelled = count;
  } else if (Object.prototype.hasOwnProperty.call(next, s)) {
    next[s] = count;
  }
  return next;
}

/**
 * Apply list API response to SoftStat state (no second network call).
 */
export function statsFromListResponse(
  prev,
  rows,
  meta,
  status,
  extraBuckets = []
) {
  const list = Array.isArray(rows) ? rows : [];
  const total = Number(meta?.total);
  const statusKey =
    !status || status === "all" ? "all" : String(status).toLowerCase();

  if (statusKey === "all") {
    return countRequestStats(list, {
      total: Number.isFinite(total) ? total : list.length,
      extraBuckets,
    });
  }

  const base =
    prev && typeof prev === "object"
      ? prev
      : emptyRequestStats(
          Object.fromEntries(extraBuckets.map((k) => [k, 0]))
        );

  return mergeFilteredStats(
    base,
    statusKey,
    Number.isFinite(total) ? total : list.length,
    list.length
  );
}
