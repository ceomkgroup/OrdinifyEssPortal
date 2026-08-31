"use client";

import { useCallback, useEffect, useState } from "react";
import {
  cancelAttendanceChangeRequest,
  createAttendanceChangeRequest,
  getAttendanceChangeRequest,
  listAttendanceChangeRequests,
} from "@/api/attendance-change";

export function useAttendanceChangeList({ status = "all", page = 1, limit = 10 } = {}) {
  const [rows, setRows] = useState([]);
  const [meta, setMeta] = useState({ total: 0, page: 1, limit: 10, totalPages: 1 });
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [reloadTick, setReloadTick] = useState(0);

  useEffect(() => {
    let alive = true;
    (async () => {
      setLoading(true);
      setError(null);
      try {
        const res = await listAttendanceChangeRequests({ status, page, limit });
        if (!alive) return;
        setRows(res.rows);
        setMeta(res.meta || { total: 0, page, limit, totalPages: 1 });
      } catch (err) {
        if (!alive) return;
        setError(err.message || "Failed to load requests");
        setRows([]);
      } finally {
        if (alive) setLoading(false);
      }
    })();
    return () => {
      alive = false;
    };
  }, [status, page, limit, reloadTick]);

  const refetch = useCallback(() => setReloadTick((n) => n + 1), []);

  return { rows, meta, loading, error, refetch };
}

/** Best-effort status counts from a larger all-status page. */
export function useAttendanceChangeStats({ enabled = true } = {}) {
  const [stats, setStats] = useState({
    total: 0,
    pending: 0,
    approved: 0,
    cancelled: 0,
  });
  const [loading, setLoading] = useState(Boolean(enabled));
  const [reloadTick, setReloadTick] = useState(0);

  useEffect(() => {
    if (!enabled) {
      setLoading(false);
      return undefined;
    }
    let alive = true;
    (async () => {
      setLoading(true);
      try {
        const res = await listAttendanceChangeRequests({
          status: "all",
          page: 1,
          limit: 100,
        });
        if (!alive) return;
        const next = {
          total: Number(res.meta?.total) || (res.rows || []).length,
          pending: 0,
          approved: 0,
          cancelled: 0,
        };
        for (const row of res.rows || []) {
          const s = String(row.status || "").toLowerCase();
          if (s === "rejected" || s === "cancelled" || s === "canceled") {
            next.cancelled += 1;
          } else if (s in next) {
            next[s] += 1;
          }
        }
        setStats(next);
      } catch {
        if (alive) {
          setStats({
            total: 0,
            pending: 0,
            approved: 0,
            cancelled: 0,
          });
        }
      } finally {
        if (alive) setLoading(false);
      }
    })();
    return () => {
      alive = false;
    };
  }, [enabled, reloadTick]);

  const refetch = useCallback(() => setReloadTick((n) => n + 1), []);

  return { stats, loading, refetch };
}

export function useAttendanceChangeDetail(requestId) {
  const [detail, setDetail] = useState(null);
  const [loading, setLoading] = useState(Boolean(requestId));
  const [error, setError] = useState(null);

  const load = useCallback(async (id) => {
    if (!id) {
      setDetail(null);
      setLoading(false);
      return null;
    }
    setLoading(true);
    setError(null);
    try {
      const data = await getAttendanceChangeRequest(id);
      setDetail(data);
      return data;
    } catch (err) {
      setDetail(null);
      setError(err.message || "Failed to load request");
      return null;
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    load(requestId);
  }, [requestId, load]);

  return { detail, loading, error, refetch: () => load(requestId) };
}

export async function submitAttendanceChange(payload) {
  return createAttendanceChangeRequest(payload);
}

export async function cancelAttendanceChange(requestId) {
  return cancelAttendanceChangeRequest(requestId);
}
