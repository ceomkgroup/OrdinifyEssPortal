import api from "@/lib/axios";
import { getApiErrorMessage } from "@/lib/api-error";
import { toKpiNumber } from "@/lib/kpi";

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
    const next = new Error(getApiErrorMessage(err, fallbackMessage));
    next.status = err.status;
    next.code = err.code || err.data?.code || err.data?.error;
    next.data = err.data?.data ?? err.data;
    return next;
  }
  const next = new Error(getApiErrorMessage(err, fallbackMessage));
  return next;
}

function pick(...values) {
  for (const value of values) {
    if (value == null || value === "") continue;
    return value;
  }
  return null;
}

function asPeriodList(data) {
  if (Array.isArray(data)) return data;
  if (!data || typeof data !== "object") return [];
  for (const key of ["periods", "rows", "items", "data"]) {
    if (Array.isArray(data[key])) return data[key];
  }
  return [];
}

function compactBody(payload) {
  const next = {};
  for (const [key, value] of Object.entries(payload || {})) {
    if (value == null) continue;
    if (typeof value === "string" && !value.trim()) continue;
    next[key] = typeof value === "string" ? value.trim() : value;
  }
  return next;
}

export function normalizeKpiPeriod(row) {
  if (!row || typeof row !== "object") return null;
  const periodId = pick(row.periodId, row.id);
  if (!periodId) return null;
  return {
    ...row,
    periodId: String(periodId),
    name: row.name || "Period",
    frequency: row.frequency || "",
    startDate: pick(
      row.startDate,
      row.fromDate,
      row.periodStart,
      row.start
    ),
    endDate: pick(row.endDate, row.toDate, row.periodEnd, row.end),
    status: row.status || "",
  };
}

export function normalizeKpiScore(row) {
  if (!row || typeof row !== "object") return null;
  const scoreId = pick(row.scoreId, row.id);
  if (!scoreId) return null;
  return {
    ...row,
    scoreId: String(scoreId),
    kpiId: pick(row.kpiId) ? String(row.kpiId) : "",
    kpiName: row.kpiNameSnapshot || row.kpiName || "KPI",
    direction: row.directionSnapshot || row.direction || "",
    weight: toKpiNumber(row.weight),
    target: toKpiNumber(row.target),
    actual: toKpiNumber(row.actual),
    achievementPct: toKpiNumber(row.achievementPct),
    weightedScore: toKpiNumber(row.weightedScore),
    selfScore: toKpiNumber(row.selfScore),
    managerScore: toKpiNumber(row.managerScore),
    selfComment: row.selfComment || "",
    managerComment: row.managerComment || "",
    measurementSource: row.measurementSource || "",
    status: row.status || "",
  };
}

export function normalizeKpiSummary(raw) {
  const data = raw && typeof raw === "object" ? raw : {};
  const kpis = (Array.isArray(data.kpis) ? data.kpis : [])
    .map(normalizeKpiScore)
    .filter(Boolean);
  return {
    kpis,
    overallScore: toKpiNumber(data.overallScore) ?? 0,
    totalWeight: toKpiNumber(data.totalWeight) ?? 0,
    rating: data.rating || "",
  };
}

/**
 * GET /api/employee/portal/kpi/periods
 */
export async function listKpiPeriods() {
  try {
    const { data } = await api.get("/api/employee/portal/kpi/periods");
    const body = unwrap(data, "Failed to load KPI periods");
    const rows = asPeriodList(body.data)
      .map(normalizeKpiPeriod)
      .filter(Boolean);
    return { rows, meta: { allowed: true } };
  } catch (err) {
    if (err?.status === 403) {
      return { rows: [], meta: { allowed: false } };
    }
    throw toApiError(err, "Failed to load KPI periods");
  }
}

/**
 * GET /api/employee/portal/kpi/periods/{periodId}
 */
export async function getMyKpiPeriod(periodId) {
  const id = String(periodId || "").trim();
  if (!id) {
    const err = new Error("Pick a KPI period first.");
    err.code = "MISSING_PERIOD";
    throw err;
  }
  try {
    const { data } = await api.get(
      `/api/employee/portal/kpi/periods/${id}`
    );
    const body = unwrap(data, "Failed to load your KPIs");
    return {
      summary: normalizeKpiSummary(body.data),
      meta: { allowed: true },
    };
  } catch (err) {
    if (err?.status === 403) {
      return {
        summary: normalizeKpiSummary({}),
        meta: { allowed: false },
      };
    }
    throw toApiError(err, "Failed to load your KPIs");
  }
}

/**
 * PATCH /api/employee/portal/kpi/scores/{id}/self-score
 */
export async function submitKpiSelfScore(scoreId, payload) {
  const id = String(scoreId || "").trim();
  if (!id) {
    const err = new Error("Missing KPI score.");
    err.code = "MISSING_SCORE";
    throw err;
  }
  try {
    const { data } = await api.patch(
      `/api/employee/portal/kpi/scores/${id}/self-score`,
      compactBody({
        selfScore: toKpiNumber(payload?.selfScore),
        selfComment: payload?.selfComment,
      })
    );
    const body = unwrap(data, "Failed to save self-assessment");
    return normalizeKpiScore(body.data) || body.data;
  } catch (err) {
    throw toApiError(err, "Failed to save self-assessment");
  }
}
