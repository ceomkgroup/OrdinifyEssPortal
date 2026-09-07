"use client";

import { useCallback, useEffect, useState } from "react";
import {
  cancelCompOffRequest,
  createCompOffRequest,
  listCompOffRequests,
} from "@/api/comp-off";
import {
  emptyRequestStats,
  statsFromListResponse,
} from "@/lib/request-stats";

const EMPTY_STATS = emptyRequestStats({ used: 0 });

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
  const [stats, setStats] = useState(EMPTY_STATS);
  const [loading, setLoading] = useState(Boolean(enabled));
  const [error, setError] = useState(null);
  const [reloadTick, setReloadTick] = useState(0);

  useEffect(() => {
    if (!enabled) {
      setLoading(false);
      setRows([]);
      setError(null);
      setMeta({ total: 0, page: 1, limit: 10, totalPages: 1 });
      setStats(EMPTY_STATS);
      return undefined;
    }

    let alive = true;
    (async () => {
      setLoading(true);
      setError(null);
      try {
        const res = await listCompOffRequests({ status, page, limit });
        if (!alive) return;
        const list = res.rows || [];
        const nextMeta = res.meta || { total: 0, page, limit, totalPages: 1 };
        setRows(list);
        setMeta(nextMeta);
        setStats((prev) =>
          statsFromListResponse(prev, list, nextMeta, status, ["used"])
        );
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

  return { rows, meta, stats, loading, error, refetch };
}

export async function submitCompOff(payload) {
  return createCompOffRequest(payload);
}

export async function cancelCompOff(compOffId) {
  return cancelCompOffRequest(compOffId);
}
