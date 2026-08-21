"use client";

import { useCallback, useEffect, useState } from "react";
import { getMyShift } from "@/api/shift";

export function useMyShift() {
  const [shift, setShift] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [reloadTick, setReloadTick] = useState(0);

  const refetch = useCallback(() => {
    setReloadTick((n) => n + 1);
  }, []);

  useEffect(() => {
    let alive = true;
    (async () => {
      setLoading(true);
      setError("");
      try {
        const data = await getMyShift();
        if (!alive) return;
        setShift(data);
      } catch (err) {
        if (!alive) return;
        setError(err?.message || "Failed to load current shift");
        setShift(null);
      } finally {
        if (alive) setLoading(false);
      }
    })();

    return () => {
      alive = false;
    };
  }, [reloadTick]);

  return { shift, loading, error, refetch };
}
