"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import {
  getAttendanceGeofenceInfo,
  getAttendanceHistory,
  getAttendanceMonthlySummary,
  getAttendanceToday,
  resolveAttendanceLogId,
} from "@/api/attendance";
import { useModules } from "@/components/modules/ModulesProvider";
import {
  readQueryInt,
  readQueryString,
  usePortalQuery,
} from "@/hooks/usePortalQuery";

function toYmd(d) {
  const y = d.getFullYear();
  const m = String(d.getMonth() + 1).padStart(2, "0");
  const day = String(d.getDate()).padStart(2, "0");
  return `${y}-${m}-${day}`;
}

function startOfWeekMonday(d) {
  const x = new Date(d.getFullYear(), d.getMonth(), d.getDate(), 12, 0, 0);
  const day = x.getDay();
  const diff = day === 0 ? -6 : 1 - day;
  x.setDate(x.getDate() + diff);
  return x;
}

function endOfWeekSunday(d) {
  const start = startOfWeekMonday(d);
  const end = new Date(start);
  end.setDate(start.getDate() + 6);
  return end;
}

/** Resolve preset → { from, to } (YYYY-MM-DD). */
export function resolveAttendanceRange(preset, customFrom, customTo) {
  const now = new Date();
  now.setHours(12, 0, 0, 0);

  if (preset === "week") {
    return {
      from: toYmd(startOfWeekMonday(now)),
      to: toYmd(endOfWeekSunday(now)),
    };
  }

  if (preset === "lastMonth") {
    const y = now.getMonth() === 0 ? now.getFullYear() - 1 : now.getFullYear();
    const m = now.getMonth() === 0 ? 12 : now.getMonth();
    const last = new Date(y, m, 0).getDate();
    return {
      from: `${y}-${String(m).padStart(2, "0")}-01`,
      to: `${y}-${String(m).padStart(2, "0")}-${String(last).padStart(2, "0")}`,
    };
  }

  if (preset === "year") {
    const y = now.getFullYear();
    return { from: `${y}-01-01`, to: `${y}-12-31` };
  }

  if (preset === "custom" && customFrom && customTo) {
    return {
      from: customFrom <= customTo ? customFrom : customTo,
      to: customFrom <= customTo ? customTo : customFrom,
    };
  }

  // thisMonth (default)
  const y = now.getFullYear();
  const m = now.getMonth() + 1;
  const last = new Date(y, m, 0).getDate();
  return {
    from: `${y}-${String(m).padStart(2, "0")}-01`,
    to: `${y}-${String(m).padStart(2, "0")}-${String(last).padStart(2, "0")}`,
  };
}

export function useAttendancePage() {
  const { searchParams } = usePortalQuery();

  const initialRange = readQueryString(searchParams, "range", "month");
  const validRange = [
    "week",
    "month",
    "lastMonth",
    "year",
    "custom",
  ].includes(initialRange)
    ? initialRange
    : "month";

  const [rangePreset, setRangePreset] = useState(validRange);
  const [customFrom, setCustomFrom] = useState(
    readQueryString(searchParams, "from", "")
  );
  const [customTo, setCustomTo] = useState(
    readQueryString(searchParams, "to", "")
  );
  const [page, setPage] = useState(readQueryInt(searchParams, "page", 1));
  const [limit, setLimit] = useState(readQueryInt(searchParams, "limit", 10));

  const range = useMemo(
    () => resolveAttendanceRange(rangePreset, customFrom, customTo),
    [rangePreset, customFrom, customTo]
  );

  const [history, setHistory] = useState([]);
  const [meta, setMeta] = useState({
    total: 0,
    page: 1,
    limit: 10,
    totalPages: 1,
  });
  const [summary, setSummary] = useState(null);
  const [summaryLoading, setSummaryLoading] = useState(false);

  const [historyLoading, setHistoryLoading] = useState(false);
  const [error, setError] = useState(null);
  const [reloadTick, setReloadTick] = useState(0);

  const summaryYear = Number(String(range.to || "").slice(0, 4)) || new Date().getFullYear();
  const summaryMonth =
    Number(String(range.to || "").slice(5, 7)) || new Date().getMonth() + 1;

  // Monthly summary for the month of the selected range end-date
  useEffect(() => {
    let alive = true;
    queueMicrotask(() => {
      if (alive) setSummaryLoading(true);
    });
    (async () => {
      try {
        const data = await getAttendanceMonthlySummary({
          year: summaryYear,
          month: summaryMonth,
        });
        if (!alive) return;
        setSummary(data);
      } catch {
        if (alive) setSummary(null);
      } finally {
        if (alive) setSummaryLoading(false);
      }
    })();
    return () => {
      alive = false;
    };
  }, [summaryYear, summaryMonth, reloadTick]);

  // History for selected range
  useEffect(() => {
    let alive = true;

    if (rangePreset === "custom" && (!customFrom || !customTo)) {
      queueMicrotask(() => {
        if (!alive) return;
        setHistory([]);
        setMeta({ total: 0, page: 1, limit, totalPages: 1 });
        setHistoryLoading(false);
      });
      return () => {
        alive = false;
      };
    }

    queueMicrotask(() => {
      if (alive) {
        setHistoryLoading(true);
        setError(null);
      }
    });

    (async () => {
      try {
        const res = await getAttendanceHistory({
          from: range.from,
          to: range.to,
          page,
          limit,
        });
        if (!alive) return;
        setHistory(res.rows);
        setMeta(res.meta || { total: 0, page, limit, totalPages: 1 });
      } catch (err) {
        if (!alive) return;
        setError(err.message || "Failed to load history");
      } finally {
        if (alive) setHistoryLoading(false);
      }
    })();

    return () => {
      alive = false;
    };
  }, [
    range.from,
    range.to,
    rangePreset,
    customFrom,
    customTo,
    page,
    limit,
    reloadTick,
  ]);

  const setPreset = useCallback((next) => {
    setRangePreset(next);
    setPage(1);
    if (next !== "custom") {
      setCustomFrom("");
      setCustomTo("");
    }
  }, []);

  const setCustomRange = useCallback((from, to) => {
    setCustomFrom(from || "");
    setCustomTo(to || "");
    setRangePreset("custom");
    setPage(1);
  }, []);

  const setPageSize = useCallback((nextLimit) => {
    setLimit(nextLimit);
    setPage(1);
  }, []);

  const refetch = useCallback(() => {
    setReloadTick((n) => n + 1);
  }, []);

  return {
    rangePreset,
    range,
    customFrom,
    customTo,
    setPreset,
    setCustomRange,
    page,
    limit,
    setPage,
    setPageSize,
    history,
    meta,
    summary,
    summaryYear,
    summaryMonth,
    summaryLoading,
    loading: historyLoading,
    historyLoading,
    error,
    refetch,
  };
}

/** Lightweight helpers for dashboard punch — uses dashboard payload first. */
export function useAttendanceLive({
  fetchTodayOnMount = false,
  fetchSummaryOnMount = false,
} = {}) {
  const { hasFlag } = useModules();
  const geofenceEnabled = hasFlag("geofence");

  const [today, setToday] = useState(undefined);
  const [summary, setSummary] = useState(null);
  const [geofence, setGeofence] = useState(null);
  const [loading, setLoading] = useState(true);
  const [reloadTick, setReloadTick] = useState(0);

  useEffect(() => {
    let alive = true;
    (async () => {
      try {
        const current = new Date();
        const requests = [];
        const kinds = [];

        if (fetchTodayOnMount || reloadTick > 0) {
          requests.push(getAttendanceToday());
          kinds.push("today");
        }
        if (fetchSummaryOnMount || reloadTick > 0) {
          requests.push(
            getAttendanceMonthlySummary({
              year: current.getFullYear(),
              month: current.getMonth() + 1,
            })
          );
          kinds.push("summary");
        }
        if (geofenceEnabled) {
          requests.push(getAttendanceGeofenceInfo().catch(() => null));
          kinds.push("geo");
        }

        if (!requests.length) {
          if (alive) setLoading(false);
          return;
        }

        const results = await Promise.all(requests);
        if (!alive) return;

        kinds.forEach((kind, i) => {
          if (kind === "today") setToday(results[i]?.today);
          if (kind === "summary") setSummary(results[i]);
          if (kind === "geo") setGeofence(results[i] || null);
        });
        if (!geofenceEnabled) setGeofence(null);
      } catch {
        if (alive) setGeofence(null);
      } finally {
        if (alive) setLoading(false);
      }
    })();
    return () => {
      alive = false;
    };
  }, [reloadTick, geofenceEnabled, fetchTodayOnMount, fetchSummaryOnMount]);

  const refetch = useCallback(() => {
    setLoading(true);
    setReloadTick((n) => n + 1);
  }, []);

  const applyCheckInResult = useCallback(
    (result) => {
      const data = result?.data;
      if (!data) {
        refetch();
        return;
      }
      setToday({
        logId: resolveAttendanceLogId(data) || data.logId,
        checkInTime: data.checkInTime,
        checkOutTime: null,
        isCheckedIn: true,
        isCheckedOut: false,
        isOnBreak: false,
        lateMinutes: result?.meta?.lateMinutes ?? 0,
        attTypeName: data.attTypeName,
        shiftName: data.shiftName,
      });
    },
    [refetch]
  );

  const applyCheckOutResult = useCallback(
    (result) => {
      const data = result?.data;
      if (!data) {
        refetch();
        return;
      }
      setToday((prev) => ({
        ...(prev || {}),
        logId: resolveAttendanceLogId(data) || data.logId || prev?.logId,
        checkInTime: data.checkInTime ?? prev?.checkInTime,
        checkOutTime:
          data.checkOutTime ?? data.checkOutAt ?? new Date().toISOString(),
        isCheckedIn: false,
        isCheckedOut: true,
        isOnBreak: false,
        attTypeName: data.attTypeName ?? prev?.attTypeName,
        shiftName: data.shiftName ?? prev?.shiftName,
        lateMinutes: prev?.lateMinutes ?? 0,
        workingHours: data.workingHours ?? result?.meta?.workingHours,
      }));
    },
    [refetch]
  );

  const applyBreakResult = useCallback(
    (result, action) => {
      const data = result?.data;
      if (!data) {
        refetch();
        return;
      }

      setToday((prev) => {
        const base = { ...(prev || {}) };
        const nextLogs =
          data.breaks ||
          data.breakLogs ||
          data.breakHistory ||
          base.breaks ||
          base.breakLogs ||
          [];

        if (action === "out") {
          return {
            ...base,
            ...data,
            logId: resolveAttendanceLogId(data) || data.logId || base.logId,
            isCheckedIn: true,
            isCheckedOut: false,
            isOnBreak: true,
            currentBreakStart:
              data.breakOutTime ||
              data.currentBreakStart ||
              data.lastBreakOutTime ||
              new Date().toISOString(),
            breakOutTime:
              data.breakOutTime ||
              data.currentBreakStart ||
              new Date().toISOString(),
            breaks: nextLogs,
            breakLogs: nextLogs,
          };
        }

        return {
          ...base,
          ...data,
          logId: resolveAttendanceLogId(data) || data.logId || base.logId,
          isCheckedIn: true,
          isCheckedOut: false,
          isOnBreak: false,
          currentBreakStart: null,
          breakOutTime: null,
          breaks: nextLogs,
          breakLogs: nextLogs,
          breakMinutes:
            data.breakMinutes ??
            result?.meta?.breakMinutes ??
            base.breakMinutes,
          workingHours:
            data.workingHours ??
            result?.meta?.workingHours ??
            base.workingHours,
        };
      });
    },
    [refetch]
  );

  return {
    today,
    summary,
    geofence: geofenceEnabled ? geofence : null,
    geofenceEnabled,
    loading,
    refetch,
    applyCheckInResult,
    applyCheckOutResult,
    applyBreakResult,
  };
}
