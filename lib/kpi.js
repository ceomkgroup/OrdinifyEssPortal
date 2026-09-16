export function toKpiNumber(value) {
  if (value == null || value === "") return null;
  const n = Number(value);
  return Number.isFinite(n) ? n : null;
}

export function formatKpiNumber(value, fallback = "—") {
  const n = toKpiNumber(value);
  if (n == null) return fallback;
  return n.toLocaleString("en-PK", { maximumFractionDigits: 2 });
}

export function formatKpiPercent(value, fallback = "—") {
  const n = toKpiNumber(value);
  if (n == null) return fallback;
  return `${n.toLocaleString("en-PK", { maximumFractionDigits: 1 })}%`;
}

export function isManualKpi(row) {
  return String(row?.measurementSource || "").toLowerCase() === "manual";
}

export function isKpiClosed(row) {
  const s = String(row?.status || "").toLowerCase();
  return s === "locked" || s === "calculated" || s === "reviewed";
}

export function canSelfScore(row) {
  return Boolean(row?.scoreId) && isManualKpi(row) && !isKpiClosed(row);
}

export function canManagerRate(row) {
  return Boolean(row?.scoreId) && isManualKpi(row) && !isKpiClosed(row);
}

export function ratingTone(rating) {
  const s = String(rating || "").toLowerCase();
  if (
    s.includes("excellent") ||
    s.includes("outstanding") ||
    s.includes("good") ||
    s.includes("meet")
  ) {
    return "border-[var(--success)]/25 bg-[var(--success-soft)] text-[var(--success)]";
  }
  if (s.includes("average") || s.includes("fair") || s.includes("ok")) {
    return "border-[var(--warning)]/25 bg-[var(--warning-soft)] text-[var(--warning)]";
  }
  if (s.includes("poor") || s.includes("below") || s.includes("fail")) {
    return "border-[var(--danger)]/25 bg-[var(--danger-soft)] text-[var(--danger)]";
  }
  return "border-[var(--border)] bg-[var(--panel-soft)] text-[var(--muted)]";
}

export function kpiStatusTone(status) {
  const s = String(status || "").toLowerCase();
  if (s === "calculated" || s === "reviewed" || s === "approved") {
    return "border-[var(--success)]/25 bg-[var(--success-soft)] text-[var(--success)]";
  }
  if (s === "rejected" || s === "locked") {
    return "border-[var(--danger)]/25 bg-[var(--danger-soft)] text-[var(--danger)]";
  }
  if (s === "pending" || s === "submitted") {
    return "border-[var(--violet)]/25 bg-[var(--lavender-soft)] text-[var(--violet)]";
  }
  return "border-[var(--border)] bg-[var(--panel-soft)] text-[var(--muted)]";
}

export function directionLabel(direction) {
  const s = String(direction || "").toLowerCase();
  if (s === "higher_better" || s === "higher-better") return "Higher is better";
  if (s === "lower_better" || s === "lower-better") return "Lower is better";
  return direction || "—";
}

const MONTH_NAMES = [
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

function ymdParts(iso) {
  const raw = String(iso || "").trim();
  if (!raw) return null;
  const isoMatch = raw.match(/^(\d{4})-(\d{2})-(\d{2})/);
  if (isoMatch) {
    return {
      y: Number(isoMatch[1]),
      m: Number(isoMatch[2]),
      d: Number(isoMatch[3]),
    };
  }
  const dmy = raw.match(/^(\d{2})[/-](\d{2})[/-](\d{4})/);
  if (dmy) {
    return {
      y: Number(dmy[3]),
      m: Number(dmy[2]),
      d: Number(dmy[1]),
    };
  }
  return null;
}

export function periodMonthLabel(row) {
  const start = ymdParts(row?.startDate);
  if (start) return `${MONTH_NAMES[start.m - 1]} ${start.y}`;
  return row?.name || "Period";
}

export function periodOptionLabel(row) {
  const month = periodMonthLabel(row);
  const name = String(row?.name || "").trim();
  if (name && name.toLowerCase() !== month.toLowerCase()) {
    return `${month} · ${name}`;
  }
  return month;
}

export function sortKpiPeriods(rows = []) {
  return [...rows].sort((a, b) => {
    const av = String(a.startDate || "");
    const bv = String(b.startDate || "");
    return bv.localeCompare(av);
  });
}

export function periodDateYmd(iso) {
  const parts = ymdParts(iso);
  if (!parts) return "";
  return `${parts.y}-${String(parts.m).padStart(2, "0")}-${String(parts.d).padStart(2, "0")}`;
}

export function periodStartYmd(row) {
  return periodDateYmd(row?.startDate);
}

export function periodEndYmd(row) {
  return periodDateYmd(row?.endDate) || periodStartYmd(row);
}

export function periodCoversYmd(row, ymd) {
  const start = periodStartYmd(row);
  const end = periodEndYmd(row);
  if (!start || !end || !ymd) return false;
  return ymd >= start && ymd <= end;
}

export function periodCoversToday(row, now = new Date()) {
  const y = now.getFullYear();
  const m = String(now.getMonth() + 1).padStart(2, "0");
  const d = String(now.getDate()).padStart(2, "0");
  return periodCoversYmd(row, `${y}-${m}-${d}`);
}

export function pickPeriodForDateRange(rows = [], from = "", to = "") {
  if (!rows.length) return "";
  const start = from || to;
  const end = to || from;
  if (!start) return "";

  const coveringStart = rows.find((row) => periodCoversYmd(row, start));
  if (coveringStart) return coveringStart.periodId;

  if (end && end !== start) {
    const coveringEnd = rows.find((row) => periodCoversYmd(row, end));
    if (coveringEnd) return coveringEnd.periodId;
  }

  const overlapping = rows.find((row) => {
    const periodStart = periodStartYmd(row);
    const periodEnd = periodEndYmd(row);
    if (!periodStart || !periodEnd) return false;
    return periodStart <= end && periodEnd >= start;
  });
  if (overlapping) return overlapping.periodId;

  const yearMonth = start.slice(0, 7);
  const sameMonth = rows.find((row) => {
    const periodStart = periodStartYmd(row);
    const periodEnd = periodEndYmd(row);
    return (
      periodStart.startsWith(yearMonth) || periodEnd.startsWith(yearMonth)
    );
  });
  return sameMonth?.periodId || "";
}

export function pickDefaultPeriodId(rows = [], preferredId = "") {
  if (!rows.length) return "";
  if (preferredId && rows.some((row) => row.periodId === preferredId)) {
    return preferredId;
  }
  const current = rows.find((row) => periodCoversToday(row));
  if (current) return current.periodId;
  const calculated = rows.find(
    (row) => String(row.status || "").toLowerCase() === "calculated"
  );
  return (calculated || rows[0]).periodId;
}

export function resolveKpiPeriodId(rows = [], selectedId = "") {
  return pickDefaultPeriodId(rows, selectedId);
}
