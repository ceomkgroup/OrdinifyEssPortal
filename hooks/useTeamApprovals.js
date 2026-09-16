"use client";

import { useCallback, useEffect, useState } from "react";
import { listTeamApprovals } from "@/api/team";
import { getApiErrorMessage } from "@/lib/api-error";

export function useTeamApprovalList(typeKey, { enabled = true } = {}) {
  const [rows, setRows] = useState([]);
  const [meta, setMeta] = useState({
    allowed: true,
    total: 0,
    page: 1,
    limit: 0,
    totalPages: 1,
  });
  const [loading, setLoading] = useState(Boolean(enabled && typeKey));
  const [error, setError] = useState(null);
  const [reloadTick, setReloadTick] = useState(0);

  useEffect(() => {
    let alive = true;

    if (!enabled || !typeKey) {
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
        const res = await listTeamApprovals(typeKey);
        if (!alive) return;
        setRows(res.rows);
        setMeta(res.meta);
      } catch (err) {
        if (!alive) return;
        setError(getApiErrorMessage(err, "Failed to load team requests"));
        setRows([]);
      } finally {
        if (alive) setLoading(false);
      }
    })();

    return () => {
      alive = false;
    };
  }, [typeKey, enabled, reloadTick]);

  const refetch = useCallback(() => setReloadTick((n) => n + 1), []);

  const removeRow = useCallback((id) => {
    const key = String(id || "");
    if (!key) return;
    setRows((prev) => prev.filter((row) => row.id !== key));
    setMeta((prev) => ({
      ...prev,
      total: Math.max(0, (Number(prev.total) || 1) - 1),
    }));
  }, []);

  return { rows, meta, loading, error, refetch, removeRow };
}
