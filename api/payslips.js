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
  const apiMessage =
    (err?.data && typeof err.data === "object" && err.data.message) ||
    err?.message ||
    fallbackMessage;
  const next = new Error(apiMessage);
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

export function normalizePayslipListRow(row) {
  if (!row || typeof row !== "object") return null;
  const payslipId = pick(row.payslipId, row.id);
  return {
    ...row,
    payslipId,
    id: payslipId,
    employeeFullName: row.employeeFullName || row.fullName || "",
    currency: row.currency || "PKR",
    grossSalary: Number(row.grossSalary) || 0,
    totalDeductions: Number(row.totalDeductions) || 0,
    netSalary: Number(row.netSalary) || 0,
    payPeriodStart: row.payPeriodStart || null,
    payPeriodEnd: row.payPeriodEnd || null,
    paymentDate: row.paymentDate || null,
    runStatus: String(row.runStatus || row.status || "").toLowerCase() || "",
    pdfUrl: row.pdfUrl || null,
    createdAt: row.createdAt || null,
  };
}

export function normalizePayslipDetail(row) {
  if (!row || typeof row !== "object") return null;
  const payslipId = pick(row.payslipId, row.id);
  const amounts = row.amounts && typeof row.amounts === "object" ? row.amounts : {};
  const attendance =
    row.attendance && typeof row.attendance === "object" ? row.attendance : {};
  const period = row.period && typeof row.period === "object" ? row.period : {};
  const employee =
    row.employee && typeof row.employee === "object" ? row.employee : {};
  const snapshot =
    row.employeeSnapshot && typeof row.employeeSnapshot === "object"
      ? row.employeeSnapshot
      : {};
  const company = row.company && typeof row.company === "object" ? row.company : {};
  const run = row.run && typeof row.run === "object" ? row.run : {};

  const earnings = Array.isArray(row.earnings)
    ? row.earnings
    : Array.isArray(row.earningLines)
      ? row.earningLines
      : [];
  const deductions = Array.isArray(row.deductions)
    ? row.deductions
    : Array.isArray(row.deductionLines)
      ? row.deductionLines.map((line) => ({
          label: line.ruleName || line.label || "Deduction",
          amount: line.amount,
          reasonText: line.reasonText,
        }))
      : [];

  return {
    ...row,
    payslipId,
    id: payslipId,
    currency: row.currency || "PKR",
    pdfUrl: row.pdfUrl || null,
    createdAt: row.createdAt || null,
    amounts: {
      grossSalary: Number(amounts.grossSalary ?? row.grossSalary) || 0,
      totalDeductions: Number(amounts.totalDeductions ?? row.totalDeductions) || 0,
      netSalary: Number(amounts.netSalary ?? row.netSalary) || 0,
    },
    attendance: {
      workingDays: attendance.workingDays ?? null,
      presentDays: attendance.presentDays ?? null,
      leaveDays: attendance.leaveDays ?? null,
      absentDays: attendance.absentDays ?? null,
      overtimeHours: attendance.overtimeHours ?? null,
    },
    period: {
      payPeriodStart: period.payPeriodStart || row.payPeriodStart || null,
      payPeriodEnd: period.payPeriodEnd || row.payPeriodEnd || null,
      paymentDate: period.paymentDate || row.paymentDate || null,
    },
    run: {
      runId: run.runId || row.runId || null,
      status: String(run.status || row.runStatus || "").toLowerCase(),
    },
    company,
    employee: {
      ...snapshot,
      ...employee,
      employeeCode: employee.employeeCode || snapshot.employeeCode || "",
      fullName:
        employee.fullName ||
        snapshot.fullName ||
        [employee.firstName || snapshot.firstName, employee.lastName || snapshot.lastName]
          .filter(Boolean)
          .join(" "),
    },
    earnings,
    deductions,
    bonusLines: Array.isArray(row.bonusLines) ? row.bonusLines : [],
    dayTimeline: Array.isArray(row.dayTimeline) ? row.dayTimeline : [],
    calculationDetails:
      row.calculationDetails && typeof row.calculationDetails === "object"
        ? row.calculationDetails
        : {},
  };
}

export function normalizeTaxCertificate(row) {
  if (!row || typeof row !== "object") return null;
  const employee =
    row.employee && typeof row.employee === "object" ? row.employee : {};
  const monthly = Array.isArray(row.monthly) ? row.monthly : [];

  return {
    ...row,
    employee: {
      ...employee,
      fullName:
        employee.fullName ||
        [employee.firstName, employee.lastName].filter(Boolean).join(" ") ||
        "",
    },
    companyName: row.companyName || "",
    taxConfigName: row.taxConfigName || "",
    countryName: row.countryName || "",
    taxYear: row.taxYear ?? null,
    currency: row.currency || "PKR",
    fiscalYearStart: row.fiscalYearStart || null,
    fiscalYearEnd: row.fiscalYearEnd || null,
    totalGrossSalary: Number(row.totalGrossSalary) || 0,
    totalTaxableIncome: Number(row.totalTaxableIncome) || 0,
    totalTaxDeducted: Number(row.totalTaxDeducted) || 0,
    monthly: monthly.map((item, index) => {
      if (!item || typeof item !== "object") return null;
      return {
        ...item,
        id:
          item.id ||
          item.payslipId ||
          `${item.payPeriodStart || item.period || "row"}-${index}`,
        payPeriodStart: item.payPeriodStart || item.from || null,
        payPeriodEnd: item.payPeriodEnd || item.to || null,
        payPeriodLabel: item.payPeriod || item.period || "",
        grossSalary: Number(item.grossSalary ?? item.gross) || 0,
        taxableIncome: Number(item.taxableIncome ?? item.taxable) || 0,
        taxDeducted: Number(item.taxDeducted ?? item.tax) || 0,
      };
    }).filter(Boolean),
  };
}

/**
 * GET /api/employee/portal/payslips?page=&limit=
 */
export async function listPayslips({ page = 1, limit = 10 } = {}) {
  try {
    const { data } = await api.get("/api/employee/portal/payslips", {
      params: { page, limit },
    });
    const body = unwrap(data, "Failed to load payslips");
    const rows = (Array.isArray(body.data) ? body.data : [])
      .map(normalizePayslipListRow)
      .filter(Boolean);
    return {
      rows,
      meta: {
        page: Number(body.meta?.page) || page,
        limit: Number(body.meta?.limit) || limit,
        total: Number(body.meta?.total) || rows.length,
        totalPages: Number(body.meta?.totalPages) || 1,
      },
    };
  } catch (err) {
    throw toApiError(err, "Failed to load payslips");
  }
}

/**
 * GET /api/employee/portal/payslips/{payslipId}
 */
export async function getPayslip(payslipId) {
  const id = String(payslipId || "").trim();
  if (!id) {
    const err = new Error("Missing payslip id.");
    err.code = "MISSING_ID";
    throw err;
  }
  try {
    const { data } = await api.get(`/api/employee/portal/payslips/${id}`);
    const body = unwrap(data, "Failed to load payslip");
    const detail = normalizePayslipDetail(body.data || body);
    if (!detail?.payslipId) {
      throw new Error("Payslip not found.");
    }
    return detail;
  } catch (err) {
    throw toApiError(err, "Failed to load payslip");
  }
}

async function fetchPrintHtml(url, params, fallbackMessage) {
  try {
    const { data } = await api.get(url, {
      params,
      responseType: "text",
      transformResponse: [(body) => body],
      headers: { Accept: "text/html,application/json" },
    });
    if (typeof data === "string" && data.trim()) {
      if (data.trim().startsWith("{")) {
        try {
          const parsed = JSON.parse(data);
          if (!parsed?.success) {
            throw new Error(parsed?.message || fallbackMessage);
          }
          const html = parsed.data || parsed.html || "";
          if (typeof html === "string" && html.trim()) return html;
        } catch (parseErr) {
          if (parseErr.message && parseErr.message !== fallbackMessage) {
            throw parseErr;
          }
        }
      }
      return data;
    }
    if (data && typeof data === "object") {
      const body = unwrap(data, fallbackMessage);
      const html = body.data || body.html || "";
      if (typeof html === "string" && html.trim()) return html;
    }
    throw new Error(fallbackMessage);
  } catch (err) {
    throw toApiError(err, fallbackMessage);
  }
}

/**
 * GET /api/employee/portal/payslips/{payslipId}/print  (HTML)
 */
export async function getPayslipPrintHtml(payslipId) {
  const id = String(payslipId || "").trim();
  if (!id) {
    const err = new Error("Missing payslip id.");
    err.code = "MISSING_ID";
    throw err;
  }
  return fetchPrintHtml(
    `/api/employee/portal/payslips/${id}/print`,
    undefined,
    "Failed to load payslip print document"
  );
}

/**
 * GET /api/employee/portal/tax-certificate?fiscalYearStart=
 */
export async function getTaxCertificate({ fiscalYearStart } = {}) {
  try {
    const { data } = await api.get("/api/employee/portal/tax-certificate", {
      params: fiscalYearStart ? { fiscalYearStart } : undefined,
    });
    const body = unwrap(data, "Failed to load tax certificate");
    return normalizeTaxCertificate(body.data || body);
  } catch (err) {
    throw toApiError(err, "Failed to load tax certificate");
  }
}

/**
 * GET /api/employee/portal/tax-certificate/print?fiscalYearStart=
 */
export async function getTaxCertificatePrintHtml({ fiscalYearStart } = {}) {
  return fetchPrintHtml(
    "/api/employee/portal/tax-certificate/print",
    fiscalYearStart ? { fiscalYearStart } : undefined,
    "Failed to load tax certificate print document"
  );
}
