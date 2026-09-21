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

function yearsCovering(from, to) {
  const start = Number(String(from).slice(0, 4));
  const end = Number(String(to).slice(0, 4));
  if (!start || !end) return [];
  const years = [];
  for (let y = Math.min(start, end); y <= Math.max(start, end); y += 1) {
    years.push(y);
  }
  return years;
}

/** Holidays for an applied roster date range (from/to). */
export function useHolidaysRange({ from, to, enabled = true } = {}) {
  const [rows, setRows] = useState([]);
  const [loading, setLoading] = useState(Boolean(enabled && from && to));
  const [error, setError] = useState(null);
  const [reloadTick, setReloadTick] = useState(0);

  useEffect(() => {
    if (!enabled || !from || !to) {
      setLoading(false);
      setRows([]);
      setError(null);
      return undefined;
    }

    let alive = true;
    (async () => {
      setLoading(true);
      setError(null);
      try {
        const years = yearsCovering(from, to);
        const pages = await Promise.all(
          years.map((year) => listHolidays({ year, from, to }))
        );
        if (!alive) return;
        const seen = new Set();
        const merged = [];
        for (const page of pages) {
          for (const row of page.rows || []) {
            const key =
              row.occurrenceId ||
              `${row.holidayId || row.title}:${row.fromDate}:${row.toDate || ""}`;
            if (seen.has(key)) continue;
            seen.add(key);
            merged.push(row);
          }
        }
        setRows(merged);
      } catch (err) {
        if (!alive) return;
        setError(err.message || "Failed to load holidays");
        setRows([]);
      } finally {
        if (alive) setLoading(false);
      }
    })();

    return () => {
      alive = false;
    };
  }, [from, to, enabled, reloadTick]);

  const refetch = useCallback(() => setReloadTick((n) => n + 1), []);

  return { rows, loading, error, refetch };
}
