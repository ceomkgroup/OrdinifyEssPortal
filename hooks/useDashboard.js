"use client";

import { useCallback, useEffect, useState } from "react";
import { getPortalDashboard } from "@/api/portal";

export function useDashboard() {
  const [data, setData] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  const load = useCallback(async (options = { showLoader: true }) => {
    if (options.showLoader) setLoading(true);
    setError(null);

    try {
      const result = await getPortalDashboard();
      setData(result);
      return result;
    } catch (err) {
      setData(null);
      setError(err.message || "Failed to load dashboard");
      return null;
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    let alive = true;

    (async () => {
      try {
        const result = await getPortalDashboard();
        if (!alive) return;
        setData(result);
        setError(null);
      } catch (err) {
        if (!alive) return;
        setData(null);
        setError(err.message || "Failed to load dashboard");
      } finally {
        if (alive) setLoading(false);
      }
    })();

    return () => {
      alive = false;
    };
  }, []);

  return {
    data,
    loading,
    error,
    refetch: () => load({ showLoader: true }),
  };
}
