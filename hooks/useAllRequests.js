"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import { listLeaveRequests, listEncashmentRequests } from "@/api/leave";
import { listAttendanceChangeRequests } from "@/api/attendance-change";
import { listCompOffRequests } from "@/api/comp-off";
import { listOnDutyRequests } from "@/api/on-duty";
import { listOvertimeRequests } from "@/api/overtime";
import { listShiftChangeRequests } from "@/api/shift-change";
import { listWfhRequests } from "@/api/wfh";
import { listLoansRequests } from "@/api/loans";
import { listAdvancesRequests } from "@/api/advances";
import { useModules } from "@/components/modules/ModulesProvider";
import { formatDate } from "@/lib/format";
import { getRequestTypeByKey } from "@/lib/request-types";

const FETCH_LIMIT = 50;

function statusBucket(status) {
  const s = String(status || "").toLowerCase();
  if (s === "pending" || s === "submitted" || s === "in_progress") {
    return "pending";
  }
  if (s === "approved") return "approved";
  if (s === "rejected" || s === "cancelled" || s === "canceled") {
    return "cancelled";
  }
  return s || "unknown";
}

function mapLeaveRow(row) {
  const type = getRequestTypeByKey("leave");
  const from = row.fromDate || row.startDate;
  const to = row.toDate || row.endDate;
  const period =
    from && to
      ? from === to
        ? formatDate(from)
        : `${formatDate(from)} – ${formatDate(to)}`
      : formatDate(from || to) || "—";
  const days = row.totalDays ?? row.days ?? row.numberOfDays;
  const leaveName = row.leaveTypeName || row.leaveType || "Leave";

  return {
    id: `leave:${row.requestId || row.id}`,
    requestId: row.requestId || row.id,
    typeKey: "leave",
    typeLabel: type?.title || "Leave Request",
    href: type?.href || "/requests/leave",
    summary: days != null ? `${leaveName} · ${days} day(s)` : leaveName,
    period,
    status: row.status || row.statusLabel || "—",
    statusBucket: statusBucket(row.status),
    createdAt: row.createdAt || row.submittedAt || row.fromDate || null,
    reason: row.reason || "",
  };
}

function mapEncashRow(row) {
  const type = getRequestTypeByKey("encashment");
  const days = row.daysToEncash ?? row.days ?? row.encashDays;
  const leaveName = row.leaveTypeName || row.leaveType || "Leave";
  return {
    id: `encashment:${row.encashmentId || row.requestId || row.id}`,
    requestId: row.encashmentId || row.requestId || row.id,
    typeKey: "encashment",
    typeLabel: type?.title || "Leave Encashment",
    href: type?.href || "/requests/encashment",
    summary:
      days != null
        ? `${leaveName} · ${days} day(s) encash`
        : `${leaveName} encashment`,
    period: row.fiscalYear ? `FY ${row.fiscalYear}` : "—",
    status: row.status || row.statusLabel || "—",
    statusBucket: statusBucket(row.status),
    createdAt: row.createdAt || row.submittedAt || null,
    reason: row.remarks || row.reason || "",
  };
}

function mapAttendanceChangeRow(row) {
  const type = getRequestTypeByKey("attendanceChange");
  const date = row.attendanceDate || row.originalDate;
  return {
    id: `attendanceChange:${row.requestId || row.id}`,
    requestId: row.requestId || row.id,
    typeKey: "attendanceChange",
    typeLabel: type?.title || "Attendance Change",
    href: type?.href || "/requests/attendance-change",
    summary: row.reason
      ? String(row.reason).slice(0, 72)
      : "Punch correction",
    period: formatDate(date) || "—",
    status: row.statusLabel || row.status || "—",
    statusBucket: statusBucket(row.status),
    createdAt: row.createdAt || row.submittedAt || date || null,
    reason: row.reason || "",
  };
}

function mapShiftChangeRow(row) {
  const type = getRequestTypeByKey("shiftChange");
  return {
    id: `shiftChange:${row.requestId || row.id}`,
    requestId: row.requestId || row.id,
    typeKey: "shiftChange",
    typeLabel: type?.title || "Shift Change",
    href: type?.href || "/requests/shift-change",
    summary: row.reason
      ? String(row.reason).slice(0, 72)
      : "Shift change request",
    period: formatDate(row.effectiveDate) || "—",
    status: row.statusLabel || row.status || "—",
    statusBucket: statusBucket(row.status),
    createdAt: row.createdAt || row.effectiveDate || null,
    reason: row.reason || "",
  };
}

function mapCompOffRow(row) {
  const type = getRequestTypeByKey("compOff");
  const hours = row.hoursWorked != null ? `${row.hoursWorked} hrs` : null;
  return {
    id: `compOff:${row.compOffId || row.requestId || row.id}`,
    requestId: row.compOffId || row.requestId || row.id,
    typeKey: "compOff",
    typeLabel: type?.title || "Comp Off",
    href: type?.href || "/requests/comp-off",
    summary: row.reason
      ? String(row.reason).slice(0, 72)
      : hours
        ? `Comp off · ${hours}`
        : "Comp-off request",
    period: formatDate(row.workDate) || "—",
    status: row.statusLabel || row.status || "—",
    statusBucket: statusBucket(row.status),
    createdAt: row.createdAt || row.workDate || null,
    reason: row.reason || "",
  };
}

function formatOtSummaryMinutes(totalMinutes) {
  if (totalMinutes == null || Number.isNaN(Number(totalMinutes))) return null;
  const mins = Math.max(0, Math.round(Number(totalMinutes)));
  const h = Math.floor(mins / 60);
  const m = mins % 60;
  if (h > 0 && m > 0) return `${h}h ${m}m`;
  if (h > 0) return `${h}h`;
  return `${m}m`;
}

function mapOvertimeRow(row) {
  const type = getRequestTypeByKey("overtime");
  const duration = formatOtSummaryMinutes(row.overtimeMinutes);
  return {
    id: `overtime:${row.otRequestId || row.requestId || row.id}`,
    requestId: row.otRequestId || row.requestId || row.id,
    typeKey: "overtime",
    typeLabel: type?.title || "Overtime",
    href: type?.href || "/requests/overtime",
    summary: row.reason
      ? String(row.reason).slice(0, 72)
      : duration
        ? `Overtime · ${duration}`
        : "Overtime request",
    period: formatDate(row.attendanceDate) || "—",
    status: row.statusLabel || row.status || "—",
    statusBucket: statusBucket(row.status),
    createdAt: row.createdAt || row.attendanceDate || null,
    reason: row.reason || "",
  };
}

function mapWfhRow(row) {
  const type = getRequestTypeByKey("wfh");
  const from = row.fromDate;
  const to = row.toDate;
  const period =
    from && to
      ? from === to
        ? formatDate(from)
        : `${formatDate(from)} – ${formatDate(to)}`
      : formatDate(from || to) || "—";
  return {
    id: `wfh:${row.wfhId || row.requestId || row.id}`,
    requestId: row.wfhId || row.requestId || row.id,
    typeKey: "wfh",
    typeLabel: type?.title || "WFH Request",
    href: type?.href || "/requests/wfh",
    summary: row.reason
      ? String(row.reason).slice(0, 72)
      : "Work from home",
    period,
    status: row.statusLabel || row.status || "—",
    statusBucket: statusBucket(row.status),
    createdAt: row.createdAt || row.fromDate || null,
    reason: row.reason || "",
  };
}

function mapOnDutyRow(row) {
  const type = getRequestTypeByKey("onDuty");
  const from = row.fromDate;
  const to = row.toDate;
  const period =
    from && to
      ? from === to
        ? formatDate(from)
        : `${formatDate(from)} – ${formatDate(to)}`
      : formatDate(from || to) || "—";
  return {
    id: `onDuty:${row.onDutyId || row.requestId || row.id}`,
    requestId: row.onDutyId || row.requestId || row.id,
    typeKey: "onDuty",
    typeLabel: type?.title || "On Duty",
    href: type?.href || "/requests/on-duty",
    summary: row.purpose
      ? String(row.purpose).slice(0, 72)
      : row.location
        ? String(row.location).slice(0, 72)
        : "On-duty request",
    period,
    status: row.statusLabel || row.status || "—",
    statusBucket: statusBucket(row.status),
    createdAt: row.createdAt || row.fromDate || null,
    reason: row.purpose || row.location || "",
  };
}

function mapLoanRow(row) {
  const type = getRequestTypeByKey("loans");
  const amount = row.approvedAmount ?? row.loanAmount;
  return {
    id: `loans:${row.loanId || row.requestId || row.id}`,
    requestId: row.loanId || row.requestId || row.id,
    typeKey: "loans",
    typeLabel: type?.title || "Loans",
    href: type?.href || "/requests/loans",
    summary: row.reason
      ? String(row.reason).slice(0, 72)
      : amount != null
        ? `Loan · ${amount}`
        : "Loan request",
    period: formatDate(row.startMonth) || "—",
    status: row.statusLabel || row.status || "—",
    statusBucket: statusBucket(row.status),
    createdAt: row.createdAt || row.startMonth || null,
    reason: row.reason || "",
  };
}

function mapAdvanceRow(row) {
  const type = getRequestTypeByKey("advances");
  return {
    id: `advances:${row.advanceId || row.requestId || row.id}`,
    requestId: row.advanceId || row.requestId || row.id,
    typeKey: "advances",
    typeLabel: type?.title || "Advances",
    href: type?.href || "/requests/advances",
    summary: row.reason
      ? String(row.reason).slice(0, 72)
      : row.amount != null
        ? `Advance · ${row.amount}`
        : "Advance request",
    period: formatDate(row.requestDate) || "—",
    status: row.statusLabel || row.status || "—",
    statusBucket: statusBucket(row.status),
    createdAt: row.createdAt || row.requestDate || null,
    reason: row.reason || "",
  };
}

/**
 * Aggregates live request types into one list for the All Requests hub.
 */
export function useAllRequests() {
  const { canShowRequestTile, loading: modulesLoading } = useModules();
  const [rows, setRows] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [reloadTick, setReloadTick] = useState(0);

  const sources = useMemo(() => {
    const list = [];
    if (canShowRequestTile("leave")) list.push("leave");
    if (canShowRequestTile("encashment")) list.push("encashment");
    if (canShowRequestTile("attendanceChange")) list.push("attendanceChange");
    if (canShowRequestTile("shiftChange")) list.push("shiftChange");
    if (canShowRequestTile("compOff")) list.push("compOff");
    if (canShowRequestTile("overtime")) list.push("overtime");
    if (canShowRequestTile("wfh")) list.push("wfh");
    if (canShowRequestTile("onDuty")) list.push("onDuty");
    if (canShowRequestTile("loans")) list.push("loans");
    if (canShowRequestTile("advances")) list.push("advances");
    return list;
  }, [canShowRequestTile]);

  const refetch = useCallback(() => {
    setReloadTick((n) => n + 1);
  }, []);

  const sourcesKey = sources.join(",");

  useEffect(() => {
    if (modulesLoading) return undefined;

    let alive = true;
    (async () => {
      setLoading(true);
      setError("");
      try {
        const sourceList = sourcesKey ? sourcesKey.split(",") : [];
        const tasks = [];

        if (sourceList.includes("leave")) {
          tasks.push(
            listLeaveRequests({ status: "all", page: 1, limit: FETCH_LIMIT }).then(
              (res) => (res.rows || []).map(mapLeaveRow)
            )
          );
        }
        if (sourceList.includes("encashment")) {
          tasks.push(
            listEncashmentRequests({
              status: "all",
              page: 1,
              limit: FETCH_LIMIT,
            }).then((res) => {
              if (res.disabled) return [];
              return (res.rows || []).map(mapEncashRow);
            })
          );
        }
        if (sourceList.includes("attendanceChange")) {
          tasks.push(
            listAttendanceChangeRequests({
              status: "all",
              page: 1,
              limit: FETCH_LIMIT,
            }).then((res) => (res.rows || []).map(mapAttendanceChangeRow))
          );
        }
        if (sourceList.includes("shiftChange")) {
          tasks.push(
            listShiftChangeRequests({
              status: "all",
              page: 1,
              limit: FETCH_LIMIT,
            }).then((res) => (res.rows || []).map(mapShiftChangeRow))
          );
        }
        if (sourceList.includes("compOff")) {
          tasks.push(
            listCompOffRequests({
              status: "all",
              page: 1,
              limit: FETCH_LIMIT,
            }).then((res) => (res.rows || []).map(mapCompOffRow))
          );
        }
        if (sourceList.includes("overtime")) {
          tasks.push(
            listOvertimeRequests({
              status: "all",
              page: 1,
              limit: FETCH_LIMIT,
            }).then((res) => (res.rows || []).map(mapOvertimeRow))
          );
        }
        if (sourceList.includes("wfh")) {
          tasks.push(
            listWfhRequests({
              status: "all",
              page: 1,
              limit: FETCH_LIMIT,
            }).then((res) => (res.rows || []).map(mapWfhRow))
          );
        }
        if (sourceList.includes("onDuty")) {
          tasks.push(
            listOnDutyRequests({
              status: "all",
              page: 1,
              limit: FETCH_LIMIT,
            }).then((res) => (res.rows || []).map(mapOnDutyRow))
          );
        }
        if (sourceList.includes("loans")) {
          tasks.push(
            listLoansRequests({
              status: "all",
              page: 1,
              limit: FETCH_LIMIT,
            }).then((res) => (res.rows || []).map(mapLoanRow))
          );
        }
        if (sourceList.includes("advances")) {
          tasks.push(
            listAdvancesRequests({
              status: "all",
              page: 1,
              limit: FETCH_LIMIT,
            }).then((res) => (res.rows || []).map(mapAdvanceRow))
          );
        }

        const parts = await Promise.all(
          tasks.map((p) =>
            p.catch((err) => {
              console.warn("[useAllRequests]", err?.message || err);
              return [];
            })
          )
        );

        if (!alive) return;

        const merged = parts.flat().sort((a, b) => {
          const ta = new Date(a.createdAt || 0).getTime();
          const tb = new Date(b.createdAt || 0).getTime();
          return tb - ta;
        });
        setRows(merged);
      } catch (err) {
        if (alive) {
          setError(err?.message || "Failed to load requests");
          setRows([]);
        }
      } finally {
        if (alive) setLoading(false);
      }
    })();

    return () => {
      alive = false;
    };
  }, [modulesLoading, sourcesKey, reloadTick]);

  return {
    rows,
    loading: modulesLoading || loading,
    error,
    refetch,
    sources,
  };
}
