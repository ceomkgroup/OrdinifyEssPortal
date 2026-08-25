"use client";

import { useCallback, useEffect, useState } from "react";
import {
  cancelCompOffRequest,
  createCompOffRequest,
  listCompOffRequests,
} from "@/api/comp-off";

export function useCompOffList({
  status = "all",
  page = 1,
  limit = 10,
  enabled = true,
} = {}) {
  const [rows, setRows] = useState([]);
  const [meta, setMeta] = useState({
    total: 0,
    page: 1,
    limit: 10,
    totalPages: 1,
  });
  const [loading, setLoading] = useState(Boolean(enabled));
  const [error, setError] = useState(null);
  const [reloadTick, setReloadTick] = useState(0);

  useEffect(() => {
    if (!enabled) {
      setLoading(false);
      setRows([]);
      setError(null);
      setMeta({ total: 0, page: 1, limit: 10, totalPages: 1 });
      return undefined;
    }

    let alive = true;
    (async () => {
      setLoading(true);
      setError(null);
      try {
        const res = await listCompOffRequests({ status, page, limit });
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
  }, [status, page, limit, reloadTick, enabled]);

  const refetch = useCallback(() => setReloadTick((n) => n + 1), []);

  return { rows, meta, loading, error, refetch };
}

/** Best-effort status counts from a larger all-status page. */
export function useCompOffStats({ enabled = true } = {}) {
  const [stats, setStats] = useState({
    total: 0,
    pending: 0,
    approved: 0,
    used: 0,
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
        const res = await listCompOffRequests({
          status: "all",
          page: 1,
          limit: 100,
        });
        if (!alive) return;
        const next = {
          total: Number(res.meta?.total) || (res.rows || []).length,
          pending: 0,
          approved: 0,
          used: 0,
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
            used: 0,
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

export async function submitCompOff(payload) {
  return createCompOffRequest(payload);
}

export async function cancelCompOff(compOffId) {
  return cancelCompOffRequest(compOffId);
}
