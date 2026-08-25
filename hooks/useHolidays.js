"use client";

import { useCallback, useEffect, useState } from "react";
import { listHolidays } from "@/api/holidays";

export function useHolidays({ year, enabled = true } = {}) {
  const [rows, setRows] = useState([]);
  const [total, setTotal] = useState(0);
  const [loading, setLoading] = useState(Boolean(enabled));
  const [error, setError] = useState(null);
  const [reloadTick, setReloadTick] = useState(0);

  useEffect(() => {
    if (!enabled) {
      setLoading(false);
      setRows([]);
      setTotal(0);
      setError(null);
      return undefined;
    }

    let alive = true;
    (async () => {
      setLoading(true);
      setError(null);
      try {
        const res = await listHolidays({ year });
        if (!alive) return;
        setRows(res.rows || []);
        setTotal(res.total || 0);
      } catch (err) {
        if (!alive) return;
        setError(err.message || "Failed to load holidays");
        setRows([]);
        setTotal(0);
      } finally {
        if (alive) setLoading(false);
      }
    })();

    return () => {
      alive = false;
    };
  }, [year, enabled, reloadTick]);

  const refetch = useCallback(() => setReloadTick((n) => n + 1), []);

  return { rows, total, loading, error, refetch };
}
