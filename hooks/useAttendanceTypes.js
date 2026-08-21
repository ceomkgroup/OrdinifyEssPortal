"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import { getAttendanceTypesDropdown } from "@/api/dropdowns";
import {
  buildAttendanceTypeFilterOptions,
  matchAttendanceType,
} from "@/lib/attendance-history";

export function useAttendanceTypes({ enabled = true } = {}) {
  const [types, setTypes] = useState([]);
  const [loading, setLoading] = useState(Boolean(enabled));
  const [error, setError] = useState(null);

  const load = useCallback(async (force = false) => {
    setLoading(true);
    setError(null);
    try {
      const list = await getAttendanceTypesDropdown({ force });
      setTypes(list);
      return list;
    } catch (err) {
      setTypes([]);
      setError(err.message || "Failed to load attendance types");
      return [];
    } finally {
      setLoading(false);
    }
  }, []);

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
        const list = await getAttendanceTypesDropdown();
        if (!alive) return;
        setTypes(list);
      } catch (err) {
        if (!alive) return;
        setTypes([]);
        setError(err.message || "Failed to load attendance types");
      } finally {
        if (alive) setLoading(false);
      }
    })();
    return () => {
      alive = false;
    };
  }, [enabled]);

  const filterOptions = useMemo(
    () => buildAttendanceTypeFilterOptions(types),
    [types]
  );

  const resolveType = useCallback(
    (rowOrCode) => matchAttendanceType(rowOrCode, types),
    [types]
  );

  return {
    types,
    filterOptions,
    loading,
    error,
    refetch: () => load(true),
    resolveType,
  };
}
