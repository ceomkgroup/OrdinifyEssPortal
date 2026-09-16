import api from "@/lib/axios";
import { normalizeKpiScore, normalizeKpiSummary } from "@/api/kpi";
import { TEAM_APPROVAL_TYPES } from "@/lib/team-nav";
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
  const next = new Error(getApiErrorMessage(err, fallbackMessage));
  next.status = err?.status;
  next.code = err?.code || err?.data?.code || err?.data?.error;
  next.data = err?.data;
  return next;
}

function pick(...values) {
  for (const value of values) {
    if (value == null || value === "") continue;
    return value;
  }
  return null;
}

function asFlag(value) {
  return value === true || value === 1 || value === "1" || value === "true";
}

function capPair(raw) {
  const src = raw && typeof raw === "object" ? raw : {};
  return {
    view: asFlag(src.view),
    apply: asFlag(src.apply),
    correctionWindowDays:
      src.correctionWindowDays != null ? Number(src.correctionWindowDays) : null,
    markAttendance: asFlag(src.markAttendance),
    markAttendanceWindowDays:
      src.markAttendanceWindowDays != null
        ? Number(src.markAttendanceWindowDays)
        : null,
    rate: asFlag(src.rate),
  };
}

function capPairFrom(data, ...keys) {
  for (const key of keys) {
    if (data?.[key] && typeof data[key] === "object") return capPair(data[key]);
  }
  return capPair({});
}

export function normalizeTeamCapabilities(raw = {}) {
  const data = raw && typeof raw === "object" ? raw : {};
  return {
    isManager: asFlag(data.isManager),
    leave: capPair(data.leave),
    attendance: capPair(data.attendance),
    kpi: capPair(data.kpi),
    wfh: capPair(data.wfh),
    compOff: capPair(data.compOff),
    shiftChange: capPair(data.shiftChange),
    overtime: capPair(data.overtime),
    onDuty: capPair(data.onDuty),
    loan: capPair(data.loan),
    advance: capPair(data.advance),
    attendanceChangeApproval: capPairFrom(
      data,
      "attendanceChangeApproval",
      "attendanceChange"
    ),
    attendanceLogApproval: capPairFrom(
      data,
      "attendanceLogApproval",
      "attendanceLog"
    ),
    expenseClaim: capPairFrom(data, "expenseClaim", "expenseClaims"),
    finalSettlement: capPair(data.finalSettlement),
  };
}

export function canViewTeamType(capabilities, capabilityKey) {
  if (!capabilities?.isManager || !capabilityKey) return false;
  return Boolean(capabilities[capabilityKey]?.view);
}

export function canApplyTeamType(capabilities, capabilityKey) {
  if (!canViewTeamType(capabilities, capabilityKey)) return false;
  return Boolean(capabilities[capabilityKey]?.apply);
}

function pickId(row, idFields = []) {
  for (const field of idFields) {
    const value = pick(row?.[field]);
    if (value) return String(value);
  }
  return pick(row?.requestId, row?.id) ? String(pick(row.requestId, row.id)) : "";
}

function asRowList(data) {
  if (Array.isArray(data)) return data;
  if (!data || typeof data !== "object") return [];
  for (const key of ["rows", "items", "logs", "requests", "data"]) {
    if (Array.isArray(data[key])) return data[key];
  }
  return [];
}

function workflowText(row) {
  return [row?.approvalStatus, row?.decisionStatus, row?.statusLabel]
    .map((value) => String(value || "").toLowerCase().trim())
    .filter(Boolean)
    .join(" ");
}

/** Team inbox is pending-only. Decided slips belong on the employee's own requests. */
export function isOpenTeamApproval(row) {
  const text = workflowText(row).replace(/[_-]/g, " ");
  const status = String(row?.status || "")
    .toLowerCase()
    .trim()
    .replace(/[_-]/g, " ");
  // Attendance logs use `status` as Present/Late/Approved (type), not the decision.
  const hay = `${text} ${/^(pending|approved|rejected|cancelled|canceled|declined|processed|submitted|awaiting)/.test(status) ? status : ""}`.trim();
  if (!hay) return true;
  if (/\b(pending|await|submitted|in progress|unapproved)\b/.test(hay)) {
    return true;
  }
  if (
    /\b(rejected|cancelled|canceled|declined|processed)\b/.test(hay) ||
    (/\bapproved\b/.test(hay) && !/\bunapproved\b/.test(hay))
  ) {
    return false;
  }
  return true;
}

export function normalizeTeamApprovalRow(type, row) {
  if (!row || typeof row !== "object" || !type) return null;
  const employee =
    row.employee && typeof row.employee === "object" ? row.employee : {};
  const id = pickId(row, type.idFields);
  if (!id) return null;
  const employeeId = pick(row.employeeId, employee.employeeId, employee.id);
  return {
    ...row,
    id,
    typeKey: type.key,
    employeeId: employeeId ? String(employeeId) : "",
    employeeName:
      row.employeeName ||
      row.fullName ||
      employee.fullName ||
      employee.name ||
      "",
    employeeCode: row.employeeCode || row.code || employee.code || "",
    photoUrl: row.photoUrl || employee.photoUrl || null,
    reason: row.reason || row.purpose || "",
    relationship: row.relationship || "",
    statusLabel: row.statusLabel || null,
    currentLevel: row.currentLevel ?? null,
    createdAt: row.createdAt || row.submittedAt || null,
    submittedAt: row.submittedAt || row.createdAt || null,
    attendanceDate:
      row.attendanceDate || row.logDate || row.date || row.attDate || null,
    amount: row.amount ?? row.loanAmount ?? row.totalAmount ?? null,
    claimNumber: row.claimNumber || null,
  };
}

/**
 * GET /api/employee/portal/team/capabilities
 */
export async function getTeamCapabilities() {
  try {
    const { data } = await api.get("/api/employee/portal/team/capabilities");
    const body = unwrap(data, "Failed to load team access");
    return normalizeTeamCapabilities(body.data || body);
  } catch (err) {
    throw toApiError(err, "Failed to load team access");
  }
}

/**
 * GET /api/employee/portal/team/{type}
 */
export async function listTeamApprovals(typeKey) {
  const type = TEAM_APPROVAL_TYPES.find((item) => item.key === typeKey);
  if (!type) {
    const err = new Error("Unknown team approval type.");
    err.code = "UNKNOWN_TYPE";
    throw err;
  }
  try {
    const { data } = await api.get(type.listPath);
    const body = unwrap(data, `Failed to load team ${type.title} requests`);
    const allowed = body.meta?.allowed !== false;
    const mapped = asRowList(body.data)
      .map((row) => normalizeTeamApprovalRow(type, row))
      .filter(Boolean);
    const rows = type.pendingFromApi
      ? mapped
      : mapped.filter(isOpenTeamApproval);
    return {
      typeKey,
      allowed,
      rows,
      meta: {
        allowed,
        total: rows.length,
        page: Number(body.meta?.page) || 1,
        limit: Number(body.meta?.limit) || rows.length,
        totalPages: Number(body.meta?.totalPages) || 1,
      },
    };
  } catch (err) {
    if (err?.status === 403) {
      return {
        typeKey,
        allowed: false,
        rows: [],
        meta: { allowed: false, total: 0, page: 1, limit: 0, totalPages: 1 },
      };
    }
    throw toApiError(err, `Failed to load team ${type.title} requests`);
  }
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

/**
 * POST /api/employee/portal/team/{type}/{id}/decision
 * action: "approved" | "rejected"
 */
export async function decideTeamApproval(typeKey, id, payload) {
  const type = TEAM_APPROVAL_TYPES.find((item) => item.key === typeKey);
  const decisionId = String(id || "").trim();
  if (!type || !decisionId) {
    const err = new Error("Missing request to decide.");
    err.code = "MISSING_ID";
    throw err;
  }
  try {
    const { data } = await api.post(
      type.decisionPath(decisionId),
      compactBody(payload)
    );
    return unwrap(data, "Failed to record decision");
  } catch (err) {
    throw toApiError(err, "Failed to record decision");
  }
}

function trimDate(value) {
  return String(value || "").trim();
}

export function normalizeTeamMember(row) {
  if (!row || typeof row !== "object") return null;
  const employeeId = pick(row.employeeId, row.id);
  if (!employeeId) return null;
  const employeeName =
    pick(row.employeeName, row.fullName, row.name) || "Employee";
  return {
    ...row,
    employeeId: String(employeeId),
    employeeCode: String(pick(row.employeeCode, row.code) || ""),
    name: employeeName,
    employeeName,
    photoUrl: row.photoUrl || null,
    designation: String(
      pick(row.designation, row.designationName, row.jobTitle) || ""
    ),
    department: String(
      pick(row.departmentName, row.department, row.deptName, row.dept) || ""
    ),
    branch: String(
      pick(row.branchName, row.branch, row.locationName, row.location) || ""
    ),
    shift: String(
      pick(row.shiftName, row.currentShiftName, row.shift) || ""
    ),
    email: String(
      pick(row.email, row.officialEmail, row.companyEmail, row.workEmail) || ""
    ),
    phone: String(
      pick(row.phoneNumber, row.mobileNumber, row.mobile, row.phone) || ""
    ),
    joinDate: pick(row.joinDate, row.joiningDate, row.dateOfJoining, row.doj),
    relationship: String(row.relationship || ""),
  };
}

/**
 * GET /api/employee/portal/team/members
 */
export async function listTeamMembers() {
  try {
    const { data } = await api.get("/api/employee/portal/team/members");
    const body = unwrap(data, "Failed to load team members");
    const allowed = body.meta?.allowed !== false;
    const rows = asRowList(body.data).map(normalizeTeamMember).filter(Boolean);
    return {
      rows,
      meta: {
        allowed,
        total: Number(body.meta?.total) || rows.length,
      },
    };
  } catch (err) {
    if (err?.status === 403) {
      return {
        rows: [],
        meta: { allowed: false, total: 0 },
      };
    }
    throw toApiError(err, "Failed to load team members");
  }
}

export function normalizeTeamAttendanceLog(row) {
  if (!row || typeof row !== "object") return null;
  const logId = pick(row.logId, row.attendanceLogId, row.id);
  if (!logId) return null;
  return {
    ...row,
    logId: String(logId),
    id: String(logId),
    employeeId: row.employeeId ? String(row.employeeId) : "",
    employeeName: row.employeeName || row.fullName || "",
    employeeCode: row.employeeCode || row.code || "",
  };
}

/**
 * GET /api/employee/portal/team/attendance
 */
export async function listTeamAttendance({
  from,
  to,
  page = 1,
  limit = 30,
} = {}) {
  try {
    const { data } = await api.get("/api/employee/portal/team/attendance", {
      params: {
        from: trimDate(from),
        to: trimDate(to),
        page,
        limit,
      },
    });
    const body = unwrap(data, "Failed to load team attendance");
    const allowed = body.meta?.allowed !== false;
    const rows = asRowList(body.data)
      .map(normalizeTeamAttendanceLog)
      .filter(Boolean);
    return {
      rows,
      meta: {
        allowed,
        total: Number(body.meta?.total) || rows.length,
        page: Number(body.meta?.page) || page,
        limit: Number(body.meta?.limit) || limit,
        totalPages: Number(body.meta?.totalPages) || 1,
      },
    };
  } catch (err) {
    if (err?.status === 403) {
      return {
        rows: [],
        meta: {
          allowed: false,
          total: 0,
          page: 1,
          limit,
          totalPages: 1,
        },
      };
    }
    throw toApiError(err, "Failed to load team attendance");
  }
}

export async function listTeamAttendanceAll({
  from,
  to,
  pageSize = 100,
  maxPages = 50,
} = {}) {
  let page = 1;
  let totalPages = 1;
  const rows = [];
  let allowed = true;

  while (page <= totalPages && page <= maxPages) {
    const res = await listTeamAttendance({
      from,
      to,
      page,
      limit: pageSize,
    });
    allowed = res.meta?.allowed !== false;
    rows.push(...(res.rows || []));
    totalPages = Math.max(1, Number(res.meta?.totalPages) || 1);
    if (!res.rows?.length) break;
    page += 1;
  }

  return { rows, allowed };
}

/**
 * POST /api/employee/portal/team/attendance/{employeeId}/mark
 */
export async function markTeamAttendance(employeeId, payload) {
  const id = String(employeeId || "").trim();
  if (!id) {
    const err = new Error("Pick a team member first.");
    err.code = "MISSING_EMPLOYEE";
    throw err;
  }
  try {
    const { data } = await api.post(
      `/api/employee/portal/team/attendance/${id}/mark`,
      compactBody(payload)
    );
    return unwrap(data, "Failed to mark attendance");
  } catch (err) {
    throw toApiError(err, "Failed to mark attendance");
  }
}

/**
 * POST /api/employee/portal/team/attendance/{employeeId}/regularize
 */
export async function regularizeTeamAttendance(employeeId, payload) {
  const id = String(employeeId || "").trim();
  if (!id) {
    const err = new Error("Pick a team member first.");
    err.code = "MISSING_EMPLOYEE";
    throw err;
  }
  try {
    const { data } = await api.post(
      `/api/employee/portal/team/attendance/${id}/regularize`,
      compactBody(payload)
    );
    return unwrap(data, "Failed to submit attendance correction");
  } catch (err) {
    throw toApiError(err, "Failed to submit attendance correction");
  }
}

export function normalizeTeamAttendanceRequest(row) {
  if (!row || typeof row !== "object") return null;
  const id = pick(row.requestId, row.id, row.attendanceChangeId);
  if (!id) return null;
  return {
    ...row,
    id: String(id),
    requestId: String(id),
    employeeId: row.employeeId ? String(row.employeeId) : "",
    employeeName: row.employeeName || row.fullName || row.name || "",
    employeeCode: row.employeeCode || row.code || "",
    status: String(row.status || row.statusLabel || "pending").toLowerCase(),
  };
}

/**
 * GET /api/employee/portal/team/attendance/requests
 */
export async function listTeamAttendanceRequests({
  status,
  employeeId,
  from,
  to,
  page = 1,
  limit = 20,
} = {}) {
  try {
    const params = { page, limit };
    const statusValue = trimDate(status);
    if (statusValue && statusValue !== "all") params.status = statusValue;
    const memberId = String(employeeId || "").trim();
    if (memberId) params.employeeId = memberId;
    if (trimDate(from)) params.from = trimDate(from);
    if (trimDate(to)) params.to = trimDate(to);

    const { data } = await api.get(
      "/api/employee/portal/team/attendance/requests",
      { params }
    );
    const body = unwrap(data, "Failed to load attendance corrections");
    const allowed = body.meta?.allowed !== false;
    const rows = asRowList(body.data)
      .map(normalizeTeamAttendanceRequest)
      .filter(Boolean);
    return {
      rows,
      meta: {
        allowed,
        total: Number(body.meta?.total) || rows.length,
        page: Number(body.meta?.page) || page,
        limit: Number(body.meta?.limit) || limit,
        totalPages: Number(body.meta?.totalPages) || 1,
      },
    };
  } catch (err) {
    if (err?.status === 403) {
      return {
        rows: [],
        meta: {
          allowed: false,
          total: 0,
          page: 1,
          limit,
          totalPages: 1,
        },
        message: getApiErrorMessage(err, "Not allowed for this employee."),
      };
    }
    throw toApiError(err, "Failed to load attendance corrections");
  }
}

export function normalizeTeamKpiRow(row) {
  if (!row || typeof row !== "object") return null;
  const employeeId = pick(row.employeeId, row.id);
  if (!employeeId) return null;
  return {
    ...row,
    employeeId: String(employeeId),
    employeeCode: row.employeeCode || "",
    employeeName: row.employeeName || "Employee",
    photoUrl: row.photoUrl || null,
    designation: row.designation || "",
    overallScore: toKpiNumber(row.overallScore) ?? 0,
    rating: row.rating || "",
    kpiCount: toKpiNumber(row.kpiCount) ?? 0,
  };
}

/**
 * GET /api/employee/portal/team/kpi?periodId=
 */
export async function listTeamKpi(periodId) {
  const id = String(periodId || "").trim();
  if (!id) {
    return { rows: [], meta: { allowed: true, total: 0 } };
  }
  try {
    const { data } = await api.get("/api/employee/portal/team/kpi", {
      params: { periodId: id },
    });
    const body = unwrap(data, "Failed to load team KPIs");
    const allowed = body.meta?.allowed !== false;
    const rows = asRowList(body.data)
      .map(normalizeTeamKpiRow)
      .filter(Boolean);
    return {
      rows,
      meta: {
        allowed,
        total: Number(body.meta?.total) || rows.length,
      },
    };
  } catch (err) {
    if (err?.status === 403) {
      return {
        rows: [],
        meta: { allowed: false, total: 0 },
        message: getApiErrorMessage(err, "Team KPI is not available yet."),
      };
    }
    throw toApiError(err, "Failed to load team KPIs");
  }
}

/**
 * GET /api/employee/portal/team/kpi/{employeeId}/period/{periodId}
 */
export async function getTeamMemberKpi(employeeId, periodId) {
  const empId = String(employeeId || "").trim();
  const perId = String(periodId || "").trim();
  if (!empId || !perId) {
    const err = new Error("Pick a team member and period first.");
    err.code = "MISSING_KPI_TARGET";
    throw err;
  }
  try {
    const { data } = await api.get(
      `/api/employee/portal/team/kpi/${empId}/period/${perId}`
    );
    const body = unwrap(data, "Failed to load this member’s KPIs");
    return {
      summary: normalizeKpiSummary(body.data),
      meta: { allowed: true },
    };
  } catch (err) {
    throw toApiError(err, "Failed to load this member’s KPIs");
  }
}

/**
 * PATCH /api/employee/portal/team/kpi/scores/{id}/rate
 */
export async function rateTeamKpiScore(scoreId, payload) {
  const id = String(scoreId || "").trim();
  if (!id) {
    const err = new Error("Missing KPI score.");
    err.code = "MISSING_SCORE";
    throw err;
  }
  try {
    const { data } = await api.patch(
      `/api/employee/portal/team/kpi/scores/${id}/rate`,
      compactBody({
        managerScore: toKpiNumber(payload?.managerScore),
        managerComment: payload?.managerComment,
      })
    );
    const body = unwrap(data, "Failed to save manager rating");
    return normalizeKpiScore(body.data) || body.data;
  } catch (err) {
    throw toApiError(err, "Failed to save manager rating");
  }
}
