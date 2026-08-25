"use client";

import { useCallback, useEffect, useState } from "react";
import { getAttendancePolicy } from "@/api/attendance-policy";

let cachedPolicy = null;
let cachedAt = 0;
const CACHE_MS = 5 * 60 * 1000;

/**
 * Cached attendance policy for the logged-in employee.
 * Used by punch/breaks and Attendance policy summary.
 */
export function useAttendancePolicy({ enabled = true } = {}) {
  const [policy, setPolicy] = useState(cachedPolicy);
  const [loading, setLoading] = useState(Boolean(enabled) && !cachedPolicy);
  const [error, setError] = useState(null);
  const [reloadTick, setReloadTick] = useState(0);

  useEffect(() => {
    if (!enabled) {
      setLoading(false);
      return undefined;
    }

    if (cachedPolicy && Date.now() - cachedAt < CACHE_MS) {
      setPolicy(cachedPolicy);
      setLoading(false);
      setError(null);
      return undefined;
    }

    let alive = true;
    (async () => {
      setLoading(true);
      setError(null);
      try {
        const next = await getAttendancePolicy();
        if (!alive) return;
        cachedPolicy = next;
        cachedAt = Date.now();
        setPolicy(next);
      } catch (err) {
        if (!alive) return;
        setError(err.message || "Failed to load attendance policy");
        if (!cachedPolicy) setPolicy(null);
      } finally {
        if (alive) setLoading(false);
      }
    })();

    return () => {
      alive = false;
    };
  }, [enabled, reloadTick]);

  const refetch = useCallback(() => {
    cachedPolicy = null;
    cachedAt = 0;
    setReloadTick((n) => n + 1);
  }, []);

  return { policy, loading, error, refetch };
}

export function clearAttendancePolicyCache() {
  cachedPolicy = null;
  cachedAt = 0;
}
