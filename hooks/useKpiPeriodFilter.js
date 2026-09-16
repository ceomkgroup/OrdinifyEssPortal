"use client";

import { useEffect, useMemo, useState } from "react";
import {
  periodEndYmd,
  periodOptionLabel,
  periodStartYmd,
  pickDefaultPeriodId,
  pickPeriodForDateRange,
  resolveKpiPeriodId,
} from "@/lib/kpi";

/**
 * Drawer drafts + applied KPI period. Apply always loads the chosen period
 * (refetch even when the id did not change).
 */
export function useKpiPeriodFilter(periodRows = [], periodFromUrl = "") {
  const defaultPeriodId = useMemo(
    () => pickDefaultPeriodId(periodRows),
    [periodRows]
  );
  const [periodId, setPeriodId] = useState(periodFromUrl);
  const selectedPeriodId = resolveKpiPeriodId(periodRows, periodId);
  const activePeriod = useMemo(
    () =>
      periodRows.find((row) => row.periodId === selectedPeriodId) || null,
    [periodRows, selectedPeriodId]
  );
  const appliedFrom = periodStartYmd(activePeriod);
  const appliedTo = periodEndYmd(activePeriod);

  const [draftPeriodId, setDraftPeriodId] = useState("");
  const [draftFrom, setDraftFrom] = useState("");
  const [draftTo, setDraftTo] = useState("");

  const periodOptions = useMemo(
    () =>
      periodRows.map((row) => ({
        value: row.periodId,
        label: periodOptionLabel(row),
        name: periodOptionLabel(row),
      })),
    [periodRows]
  );

  useEffect(() => {
    let alive = true;
    queueMicrotask(() => {
      if (!alive) return;
      setDraftPeriodId(selectedPeriodId);
      setDraftFrom(appliedFrom);
      setDraftTo(appliedTo);
    });
    return () => {
      alive = false;
    };
  }, [selectedPeriodId, appliedFrom, appliedTo]);

  function syncDraftToPeriod(id) {
    const row = periodRows.find((item) => item.periodId === id);
    setDraftPeriodId(id || "");
    setDraftFrom(periodStartYmd(row));
    setDraftTo(periodEndYmd(row));
  }

  function onDraftPeriodChange(id) {
    syncDraftToPeriod(id);
  }

  function onDraftFromChange(next) {
    setDraftFrom(next);
    const matched = pickPeriodForDateRange(periodRows, next, draftTo);
    if (matched) {
      setDraftPeriodId(matched);
      if (!draftTo) {
        const row = periodRows.find((item) => item.periodId === matched);
        setDraftTo(periodEndYmd(row));
      }
    }
  }

  function onDraftToChange(next) {
    setDraftTo(next);
    const matched = pickPeriodForDateRange(periodRows, draftFrom, next);
    if (matched) setDraftPeriodId(matched);
  }

  function apply(refetch) {
    const nextId =
      draftPeriodId ||
      pickPeriodForDateRange(periodRows, draftFrom, draftTo) ||
      selectedPeriodId;
    setPeriodId(nextId);
    refetch?.();
    return nextId;
  }

  function reset(refetch) {
    const wasDefault = selectedPeriodId === defaultPeriodId;
    setPeriodId(defaultPeriodId);
    syncDraftToPeriod(defaultPeriodId);
    if (wasDefault) refetch?.();
  }

  const filterActive = Boolean(
    selectedPeriodId &&
      defaultPeriodId &&
      selectedPeriodId !== defaultPeriodId
  );

  return {
    selectedPeriodId,
    activePeriod,
    defaultPeriodId,
    draftPeriodId,
    draftFrom,
    draftTo,
    periodOptions,
    filterActive,
    onDraftPeriodChange,
    onDraftFromChange,
    onDraftToChange,
    apply,
    reset,
  };
}
