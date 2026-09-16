"use client";

import { useCallback, useEffect, useState } from "react";
import { getTeamMemberKpi, listTeamKpi } from "@/api/team";
import { getApiErrorMessage } from "@/lib/api-error";

export function useTeamKpiList({ periodId, enabled = true } = {}) {
  const [rows, setRows] = useState([]);
  const [meta, setMeta] = useState({ allowed: true, total: 0 });
  const [loading, setLoading] = useState(Boolean(enabled && periodId));
  const [error, setError] = useState(null);
  const [reloadTick, setReloadTick] = useState(0);

  useEffect(() => {
    let alive = true;

    if (!enabled || !periodId) {
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
        const res = await listTeamKpi(periodId);
        if (!alive) return;
        setRows(res.rows);
        setMeta(res.meta);
        if (res.meta?.allowed === false && res.message) {
          setError(res.message);
        }
      } catch (err) {
        if (!alive) return;
        setError(getApiErrorMessage(err, "Failed to load team KPIs"));
        setRows([]);
      } finally {
        if (alive) setLoading(false);
      }
    })();

    return () => {
      alive = false;
    };
  }, [enabled, periodId, reloadTick]);

  const refetch = useCallback(() => setReloadTick((n) => n + 1), []);

  return { rows, meta, loading, error, refetch };
}

export function useTeamMemberKpi({
  employeeId,
  periodId,
  enabled = true,
} = {}) {
  const [summary, setSummary] = useState(null);
  const [loading, setLoading] = useState(
    Boolean(enabled && employeeId && periodId)
  );
  const [error, setError] = useState(null);
  const [reloadTick, setReloadTick] = useState(0);

  useEffect(() => {
    let alive = true;

    if (!enabled || !employeeId || !periodId) {
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
        const res = await getTeamMemberKpi(employeeId, periodId);
        if (!alive) return;
        setSummary(res.summary);
      } catch (err) {
        if (!alive) return;
        setError(
          getApiErrorMessage(err, "Failed to load this member’s KPIs")
        );
        setSummary(null);
      } finally {
        if (alive) setLoading(false);
      }
    })();

    return () => {
      alive = false;
    };
  }, [enabled, employeeId, periodId, reloadTick]);

  const refetch = useCallback(() => setReloadTick((n) => n + 1), []);

  return { summary, loading, error, refetch };
}
