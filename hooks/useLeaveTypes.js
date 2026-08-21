"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import { getLeaveTypesDropdown } from "@/api/dropdowns";

export function matchLeaveType(rowOrId, types = []) {
  const list = Array.isArray(types) ? types : [];
  if (!list.length || rowOrId == null) return null;

  if (typeof rowOrId === "string" || typeof rowOrId === "number") {
    const key = String(rowOrId).trim().toLowerCase();
    return (
      list.find(
        (t) =>
          String(t.id || "").toLowerCase() === key ||
          String(t.leaveTypeId || "").toLowerCase() === key ||
          String(t.text || "").toLowerCase() === key
      ) || null
    );
  }

  const id = String(rowOrId.leaveTypeId || rowOrId.id || rowOrId.recno || "")
    .trim()
    .toLowerCase();
  const name = String(
    rowOrId.leaveTypeName || rowOrId.text || rowOrId.name || ""
  )
    .trim()
    .toLowerCase();

  return (
    list.find((t) => id && String(t.id || "").toLowerCase() === id) ||
    list.find((t) => name && String(t.text || "").toLowerCase() === name) ||
    null
  );
}

export function resolveLeaveTypeName(rowOrId, types = [], fallback = "—") {
  if (typeof rowOrId === "object" && rowOrId?.leaveTypeName) {
    return rowOrId.leaveTypeName;
  }
  const matched = matchLeaveType(rowOrId, types);
  if (matched?.text) return matched.text;
  if (typeof rowOrId === "string" || typeof rowOrId === "number") {
    return fallback;
  }
  return rowOrId?.leaveTypeName || fallback;
}

export function buildLeaveTypeFilterOptions(types = []) {
  return [
    { value: "all", label: "All leave types" },
    ...(types || []).map((t) => ({
      value: t.id,
      label: t.text,
    })),
  ];
}

export function useLeaveTypes({ enabled = true } = {}) {
  const [types, setTypes] = useState([]);
  const [loading, setLoading] = useState(Boolean(enabled));
  const [error, setError] = useState(null);

  const load = useCallback(async (force = false) => {
    setLoading(true);
    setError(null);
    try {
      const list = await getLeaveTypesDropdown({ force });
      setTypes(list);
      return list;
    } catch (err) {
      setTypes([]);
      setError(err.message || "Failed to load leave types");
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
        const list = await getLeaveTypesDropdown();
        if (!alive) return;
        setTypes(list);
      } catch (err) {
        if (!alive) return;
        setTypes([]);
        setError(err.message || "Failed to load leave types");
      } finally {
        if (alive) setLoading(false);
      }
    })();
    return () => {
      alive = false;
    };
  }, [enabled]);

  const filterOptions = useMemo(
    () => buildLeaveTypeFilterOptions(types),
    [types]
  );

  const resolveType = useCallback(
    (rowOrId) => matchLeaveType(rowOrId, types),
    [types]
  );

  const resolveName = useCallback(
    (rowOrId, fallback = "—") =>
      resolveLeaveTypeName(rowOrId, types, fallback),
    [types]
  );

  return {
    types,
    filterOptions,
    loading,
    error,
    refetch: () => load(true),
    resolveType,
    resolveName,
  };
}
