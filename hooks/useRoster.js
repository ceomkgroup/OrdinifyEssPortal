"use client";

import { useCallback, useEffect, useState } from "react";
import { getRoster } from "@/api/roster";

function toYmd(date) {
  const y = date.getFullYear();
  const m = String(date.getMonth() + 1).padStart(2, "0");
  const d = String(date.getDate()).padStart(2, "0");
  return `${y}-${m}-${d}`;
}

export function defaultRosterRange(days = 29) {
  const from = new Date();
  from.setHours(0, 0, 0, 0);
  const to = new Date(from);
  to.setDate(to.getDate() + days);
  return { from: toYmd(from), to: toYmd(to) };
}

export function useRoster({ from, to } = {}) {
  const [rows, setRows] = useState([]);
  const [meta, setMeta] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [reloadTick, setReloadTick] = useState(0);

  const refetch = useCallback(() => {
    setReloadTick((n) => n + 1);
  }, []);

  useEffect(() => {
    if (!from || !to) return undefined;

    let alive = true;
    (async () => {
      setLoading(true);
      setError("");
      try {
        const res = await getRoster({ from, to });
        if (!alive) return;
        setRows(res.rows || []);
        setMeta(res.meta || { from, to });
      } catch (err) {
        if (!alive) return;
        setError(err?.message || "Failed to load shift roster");
        setRows([]);
        setMeta({ from, to });
      } finally {
        if (alive) setLoading(false);
      }
    })();

    return () => {
      alive = false;
    };
  }, [from, to, reloadTick]);

  return { rows, meta, loading, error, refetch };
}
