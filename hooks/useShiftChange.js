"use client";

import { useCallback, useEffect, useState } from "react";
import {
  cancelShiftChangeRequest,
  createShiftChangeRequest,
  listAvailableShifts,
  listShiftChangeRequests,
} from "@/api/shift-change";

export function useShiftChangeList({
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
        const res = await listShiftChangeRequests({ status, page, limit });
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

export function useAvailableShifts({ enabled = true } = {}) {
  const [shifts, setShifts] = useState([]);
  const [loading, setLoading] = useState(Boolean(enabled));

  useEffect(() => {
    if (!enabled) {
      setLoading(false);
      return undefined;
    }

    let alive = true;
    (async () => {
      setLoading(true);
      try {
        const list = await listAvailableShifts();
        if (!alive) return;
        setShifts(list);
      } catch {
        if (alive) setShifts([]);
      } finally {
        if (alive) setLoading(false);
      }
    })();
    return () => {
      alive = false;
    };
  }, [enabled]);

  return { shifts, loading };
}

export async function submitShiftChange(payload) {
  return createShiftChangeRequest(payload);
}

export async function cancelShiftChange(requestId) {
  return cancelShiftChangeRequest(requestId);
}
