"use client";

import { useCallback, useEffect, useState } from "react";
import { getMyKpiPeriod, listKpiPeriods } from "@/api/kpi";
import { getApiErrorMessage } from "@/lib/api-error";

export function useKpiPeriods({ enabled = true } = {}) {
  const [rows, setRows] = useState([]);
  const [meta, setMeta] = useState({ allowed: true });
  const [loading, setLoading] = useState(Boolean(enabled));
  const [error, setError] = useState(null);
  const [reloadTick, setReloadTick] = useState(0);

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
        const res = await listKpiPeriods();
        if (!alive) return;
        setRows(res.rows);
        setMeta(res.meta);
      } catch (err) {
        if (!alive) return;
        setError(getApiErrorMessage(err, "Failed to load KPI periods"));
        setRows([]);
      } finally {
        if (alive) setLoading(false);
      }
    })();

    return () => {
      alive = false;
    };
  }, [enabled, reloadTick]);

  const refetch = useCallback(() => setReloadTick((n) => n + 1), []);

  return { rows, meta, loading, error, refetch };
}

export function useMyKpiPeriod({ periodId, enabled = true } = {}) {
  const [summary, setSummary] = useState(null);
  const [meta, setMeta] = useState({ allowed: true });
  const [loading, setLoading] = useState(Boolean(enabled && periodId));
  const [error, setError] = useState(null);
  const [reloadTick, setReloadTick] = useState(0);

  useEffect(() => {
    let alive = true;

    if (!enabled || !periodId) {
      queueMicrotask(() => {
        if (!alive) return;
        setLoading(false);
        setSummary(null);
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
        const res = await getMyKpiPeriod(periodId);
        if (!alive) return;
        setSummary(res.summary);
        setMeta(res.meta);
      } catch (err) {
        if (!alive) return;
        setError(getApiErrorMessage(err, "Failed to load your KPIs"));
        setSummary(null);
      } finally {
        if (alive) setLoading(false);
      }
    })();

    return () => {
      alive = false;
    };
  }, [enabled, periodId, reloadTick]);

  const refetch = useCallback(() => setReloadTick((n) => n + 1), []);

  return { summary, meta, loading, error, refetch };
}
