"use client";

import { useCallback, useEffect, useState } from "react";
import {
  cancelShiftSwapRequest,
  createShiftSwapRequest,
  decideShiftSwapPeer,
  listShiftSwapRequests,
  listSwapPeers,
} from "@/api/shift-swap";
import {
  emptyRequestStats,
  statsFromListResponse,
} from "@/lib/request-stats";

const EMPTY_STATS = emptyRequestStats();

const PENDING_STATUSES = new Set([
  "pending",
  "pending_peer",
  "pending_approval",
  "submitted",
  "in_progress",
]);

function countSwapStats(rows, meta) {
  let pending = 0;
  let approved = 0;
  let cancelled = 0;
  for (const row of rows || []) {
    const status = String(row.status || "").toLowerCase();
    if (status === "approved") approved += 1;
    else if (
      status === "rejected" ||
      status === "cancelled" ||
      status === "canceled"
    ) {
      cancelled += 1;
    } else if (PENDING_STATUSES.has(status)) {
      pending += 1;
    }
  }
  const total = Number(meta?.total);
  return {
    total: Number.isFinite(total) ? total : (rows || []).length,
    pending,
    approved,
    cancelled,
  };
}

export function useShiftSwapList({
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
        const res = await listShiftSwapRequests({ status, page, limit });
        if (!alive) return;
        const list = res.rows || [];
        const nextMeta = res.meta || { total: 0, page, limit, totalPages: 1 };
        setRows(list);
        setMeta(nextMeta);
        setStats((prev) => {
          const next = statsFromListResponse(prev, list, nextMeta, status, [
            "pending_peer",
            "pending_approval",
          ]);
          const statusKey = String(status || "all").toLowerCase();
          if (statusKey === "all") return countSwapStats(list, nextMeta);
          if (PENDING_STATUSES.has(statusKey)) {
            const count = Number(nextMeta.total);
            next.pending = Number.isFinite(count) ? count : list.length;
          }
          return next;
        });
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

export function useSwapPeers({ enabled = true } = {}) {
  const [peers, setPeers] = useState([]);
  const [loading, setLoading] = useState(Boolean(enabled));
  const [error, setError] = useState(null);

  useEffect(() => {
    if (!enabled) {
      setLoading(false);
      return undefined;
    }

    let alive = true;
    (async () => {
      setLoading(true);
      setError(null);
      try {
        const list = await listSwapPeers();
        if (!alive) return;
        setPeers(list || []);
      } catch (err) {
        if (!alive) return;
        setPeers([]);
        setError(err.message || "Failed to load colleagues");
      } finally {
        if (alive) setLoading(false);
      }
    })();
    return () => {
      alive = false;
    };
  }, [enabled]);

  return { peers, loading, error };
}

export async function submitShiftSwap(payload) {
  return createShiftSwapRequest(payload);
}

export async function cancelShiftSwap(requestId) {
  return cancelShiftSwapRequest(requestId);
}

export async function decideShiftSwap(requestId, payload) {
  return decideShiftSwapPeer(requestId, payload);
}
