"use client";

import { useCallback, useEffect, useState } from "react";
import {
  cancelExpenseClaim,
  createExpenseClaim,
  getExpenseCategories,
  listExpenseClaims,
  submitExpenseClaim,
} from "@/api/expense-claims";
import { getApiErrorMessage } from "@/lib/api-error";
import {
  emptyRequestStats,
  statsFromListResponse,
} from "@/lib/request-stats";

const EMPTY_STATS = emptyRequestStats({ draft: 0 });

export function useExpenseClaimsList({
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
        const res = await listExpenseClaims({ status, page, limit });
        if (!alive) return;
        const list = res.rows || [];
        const nextMeta = res.meta || { total: 0, page, limit, totalPages: 1 };
        setRows(list);
        setMeta(nextMeta);
        setStats((prev) =>
          statsFromListResponse(prev, list, nextMeta, status, ["draft"])
        );
      } catch (err) {
        if (!alive) return;
        setError(getApiErrorMessage(err, "Failed to load expense claims"));
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

export function useExpenseCategories({ enabled = true } = {}) {
  const [categories, setCategories] = useState([]);
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
        const rows = await getExpenseCategories();
        if (!alive) return;
        setCategories(rows);
      } catch (err) {
        if (!alive) return;
        setError(getApiErrorMessage(err, "Failed to load categories"));
        setCategories([]);
      } finally {
        if (alive) setLoading(false);
      }
    })();
    return () => {
      alive = false;
    };
  }, [enabled]);

  return { categories, loading, error };
}

export async function createClaim(payload) {
  return createExpenseClaim(payload);
}

export async function submitClaim(id) {
  return submitExpenseClaim(id);
}

export async function cancelClaim(id) {
  return cancelExpenseClaim(id);
}
