"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import {
  listTeamAttendance,
  listTeamAttendanceAll,
  listTeamAttendanceRequests,
} from "@/api/team";
import { getApiErrorMessage } from "@/lib/api-error";
import {
  readQueryInt,
  readQueryString,
  usePortalQuery,
} from "@/hooks/usePortalQuery";
import { resolveAttendanceRange } from "@/hooks/useAttendance";

export function useTeamAttendanceLogs({ enabled = true } = {}) {
  const { searchParams } = usePortalQuery();

  const initialRange = readQueryString(searchParams, "range", "month");
  const validRange = ["week", "month", "lastMonth", "year", "custom"].includes(
    initialRange
  )
    ? initialRange
    : "month";

  const [rangePreset, setRangePreset] = useState(validRange);
  const [customFrom, setCustomFrom] = useState(
    readQueryString(searchParams, "from", "")
  );
  const [customTo, setCustomTo] = useState(
    readQueryString(searchParams, "to", "")
  );
  const [page, setPage] = useState(readQueryInt(searchParams, "page", 1));
  const [limit, setLimit] = useState(readQueryInt(searchParams, "limit", 30));
  const [reloadTick, setReloadTick] = useState(0);

  const range = useMemo(
    () => resolveAttendanceRange(rangePreset, customFrom, customTo),
    [rangePreset, customFrom, customTo]
  );

  const [rows, setRows] = useState([]);
  const [allRows, setAllRows] = useState([]);
  const [meta, setMeta] = useState({
    allowed: true,
    total: 0,
    page: 1,
    limit: 30,
    totalPages: 1,
  });
  const [loading, setLoading] = useState(Boolean(enabled));
  const [error, setError] = useState(null);
  const [allLoading, setAllLoading] = useState(false);

  useEffect(() => {
    let alive = true;

    if (!enabled) {
      queueMicrotask(() => {
        if (!alive) return;
        setLoading(false);
        setRows([]);
        setError(null);
      });
      return () => {
        alive = false;
      };
    }

    if (rangePreset === "custom" && (!customFrom || !customTo)) {
      return () => {
        alive = false;
      };
    }

    (async () => {
      setLoading(true);
      setError(null);
      try {
        const res = await listTeamAttendance({
          from: range.from,
          to: range.to,
          page,
          limit,
        });
        if (!alive) return;
        setRows(res.rows);
        setMeta(res.meta);
      } catch (err) {
        if (!alive) return;
        setError(getApiErrorMessage(err, "Failed to load team attendance"));
        setRows([]);
      } finally {
        if (alive) setLoading(false);
      }
    })();

    return () => {
      alive = false;
    };
  }, [
    enabled,
    range.from,
    range.to,
    rangePreset,
    customFrom,
    customTo,
    page,
    limit,
    reloadTick,
  ]);

  const loadAll = useCallback(async () => {
    setAllLoading(true);
    try {
      const res = await listTeamAttendanceAll({
        from: range.from,
        to: range.to,
      });
      setAllRows(res.rows);
      return res.rows;
    } finally {
      setAllLoading(false);
    }
  }, [range.from, range.to]);

  const setPreset = useCallback((next) => {
    setRangePreset(next);
    setPage(1);
  }, []);

  const setCustomRange = useCallback((from, to) => {
    setCustomFrom(from);
    setCustomTo(to);
    setRangePreset("custom");
    setPage(1);
  }, []);

  const setPageSize = useCallback((next) => {
    setLimit(next);
    setPage(1);
  }, []);

  const refetch = useCallback(() => setReloadTick((n) => n + 1), []);

  return {
    rangePreset,
    range,
    customFrom,
    customTo,
    setPreset,
    setCustomRange,
    page,
    limit,
    setPage,
    setPageSize,
    rows,
    allRows,
    loadAll,
    allLoading,
    meta,
    loading,
    error,
    refetch,
  };
}

export function useTeamAttendanceRequests({
  enabled = true,
  status,
  employeeId,
  from,
  to,
  page = 1,
  limit = 20,
} = {}) {
  const [rows, setRows] = useState([]);
  const [meta, setMeta] = useState({
    allowed: true,
    total: 0,
    page: 1,
    limit: 20,
    totalPages: 1,
  });
  const [loading, setLoading] = useState(Boolean(enabled));
  const [error, setError] = useState(null);
  const [reloadTick, setReloadTick] = useState(0);
  const [stats, setStats] = useState({
    total: 0,
    pending: 0,
    approved: 0,
    rejected: 0,
  });

  useEffect(() => {
    let alive = true;

    if (!enabled) {
      queueMicrotask(() => {
        if (!alive) return;
        setLoading(false);
        setRows([]);
        setError(null);
      });
      return () => {
        alive = false;
      };
    }

    (async () => {
      setLoading(true);
      setError(null);
      try {
        const res = await listTeamAttendanceRequests({
          status,
          employeeId,
          from,
          to,
          page,
          limit,
        });
        if (!alive) return;
        setRows(res.rows);
        setMeta(res.meta);
        if (res.message && !res.rows.length && res.meta?.allowed === false) {
          setError(res.message);
        }
      } catch (err) {
        if (!alive) return;
        setError(getApiErrorMessage(err, "Failed to load corrections"));
        setRows([]);
      } finally {
        if (alive) setLoading(false);
      }
    })();

    return () => {
      alive = false;
    };
  }, [enabled, status, employeeId, from, to, page, limit, reloadTick]);

  useEffect(() => {
    let alive = true;

    if (!enabled) {
      queueMicrotask(() => {
        if (!alive) return;
        setStats({ total: 0, pending: 0, approved: 0, rejected: 0 });
      });
      return () => {
        alive = false;
      };
    }

    (async () => {
      try {
        const [pending, approved, rejected] = await Promise.all([
          listTeamAttendanceRequests({
            status: "pending",
            from,
            to,
            page: 1,
            limit: 1,
          }),
          listTeamAttendanceRequests({
            status: "approved",
            from,
            to,
            page: 1,
            limit: 1,
          }),
          listTeamAttendanceRequests({
            status: "rejected",
            from,
            to,
            page: 1,
            limit: 1,
          }),
        ]);
        if (!alive) return;
        const pendingTotal = Number(pending.meta?.total) || 0;
        const approvedTotal = Number(approved.meta?.total) || 0;
        const rejectedTotal = Number(rejected.meta?.total) || 0;
        setStats({
          pending: pendingTotal,
          approved: approvedTotal,
          rejected: rejectedTotal,
          total: pendingTotal + approvedTotal + rejectedTotal,
        });
      } catch {
        if (!alive) return;
      }
    })();

    return () => {
      alive = false;
    };
  }, [enabled, from, to, reloadTick]);

  const refetch = useCallback(() => setReloadTick((n) => n + 1), []);

  return { rows, meta, loading, error, refetch, stats };
}
