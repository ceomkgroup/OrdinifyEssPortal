"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import { listLeaveRequests, listEncashmentRequests } from "@/api/leave";
import { listAttendanceChangeRequests } from "@/api/attendance-change";
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
