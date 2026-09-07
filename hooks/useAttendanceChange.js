"use client";

import { useCallback, useEffect, useState } from "react";
import {
  cancelAttendanceChangeRequest,
  createAttendanceChangeRequest,
  getAttendanceChangeRequest,
  listAttendanceChangeRequests,
} from "@/api/attendance-change";
import {
  emptyRequestStats,
  statsFromListResponse,
} from "@/lib/request-stats";

const EMPTY_STATS = emptyRequestStats();

export function useAttendanceChangeList({
  status = "all",
  page = 1,
  limit = 10,
} = {}) {
  const [rows, setRows] = useState([]);
  const [meta, setMeta] = useState({
    total: 0,
    page: 1,
    limit: 10,
    totalPages: 1,
  });
  const [stats, setStats] = useState(EMPTY_STATS);
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
        const list = res.rows || [];
        const nextMeta = res.meta || { total: 0, page, limit, totalPages: 1 };
        setRows(list);
        setMeta(nextMeta);
        setStats((prev) => statsFromListResponse(prev, list, nextMeta, status));
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

  return { rows, meta, stats, loading, error, refetch };
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
