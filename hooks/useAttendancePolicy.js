"use client";

import { useCallback, useEffect, useState } from "react";
import {
  clearAttendancePolicyApiCache,
  getAttendancePolicy,
} from "@/api/attendance-policy";

/**
 * Cached attendance policy for the logged-in employee.
 * Used by punch/breaks and Attendance policy summary.
 */
export function useAttendancePolicy({ enabled = true } = {}) {
  const [policy, setPolicy] = useState(null);
  const [loading, setLoading] = useState(Boolean(enabled));
  const [error, setError] = useState(null);
  const [reloadTick, setReloadTick] = useState(0);

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
        const next = await getAttendancePolicy();
        if (!alive) return;
        setPolicy(next);
      } catch (err) {
        if (!alive) return;
        setError(err.message || "Failed to load attendance policy");
        setPolicy(null);
      } finally {
        if (alive) setLoading(false);
      }
    })();

    return () => {
      alive = false;
    };
  }, [enabled, reloadTick]);

  const refetch = useCallback(() => {
    clearAttendancePolicyApiCache();
    setReloadTick((n) => n + 1);
  }, []);

  return { policy, loading, error, refetch };
}

export function clearAttendancePolicyCache() {
  clearAttendancePolicyApiCache();
}
