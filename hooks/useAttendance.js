"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import {
  getAttendanceGeofenceInfo,
  getAttendanceHistory,
  getAttendanceMonthlySummary,
  getAttendanceToday,
} from "@/api/attendance";
import { useModules } from "@/components/modules/ModulesProvider";

function monthRange(year, month) {
  const from = `${year}-${String(month).padStart(2, "0")}-01`;
  const last = new Date(year, month, 0).getDate();
  const to = `${year}-${String(month).padStart(2, "0")}-${String(last).padStart(2, "0")}`;
  return { from, to };
}

export function useAttendancePage() {
  const { hasFlag } = useModules();
  const geofenceEnabled = hasFlag("geofence");

  const now = useMemo(() => new Date(), []);
  const [year, setYear] = useState(now.getFullYear());
  const [month, setMonth] = useState(now.getMonth() + 1);
  const [page, setPage] = useState(1);
  const [limit, setLimit] = useState(30);

  const [today, setToday] = useState(null);
  const [todayMessage, setTodayMessage] = useState("");
  const [summary, setSummary] = useState(null);
  const [history, setHistory] = useState([]);
  const [meta, setMeta] = useState({ total: 0, page: 1, limit: 30, totalPages: 1 });
  const [geofence, setGeofence] = useState(null);

  const [loading, setLoading] = useState(true);
  const [historyLoading, setHistoryLoading] = useState(false);
  const [error, setError] = useState(null);
  const [reloadTick, setReloadTick] = useState(0);

  useEffect(() => {
    let alive = true;

    queueMicrotask(() => {
      if (alive) {
        setLoading(true);
        setError(null);
      }
    });

    (async () => {
      try {
        const requests = [
          getAttendanceToday(),
          getAttendanceMonthlySummary({ year, month }),
        ];

        // Only call geofence API when company has geofence module allocated.
        if (geofenceEnabled) {
          requests.push(getAttendanceGeofenceInfo().catch(() => null));
        }

        const [todayRes, summaryRes, geoRes] = await Promise.all(requests);
        if (!alive) return;
        setToday(todayRes.today);
        setTodayMessage(todayRes.message || "");
        setSummary(summaryRes);
        setGeofence(geofenceEnabled ? geoRes || null : null);
      } catch (err) {
        if (!alive) return;
        setError(err.message || "Failed to load attendance");
      } finally {
        if (alive) setLoading(false);
      }
    })();

    return () => {
      alive = false;
    };
  }, [year, month, reloadTick, geofenceEnabled]);

  useEffect(() => {
    let alive = true;

    queueMicrotask(() => {
      if (alive) setHistoryLoading(true);
    });

    (async () => {
      try {
        const { from, to } = monthRange(year, month);
        const res = await getAttendanceHistory({ from, to, page, limit });
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
  }, [year, month, page, limit, reloadTick]);

  const setPeriod = useCallback((nextYear, nextMonth) => {
    setYear(nextYear);
    setMonth(nextMonth);
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
    year,
    month,
    page,
    limit,
    setPage,
    setPageSize,
    setPeriod,
    today,
    todayMessage,
    summary,
    history,
    meta,
    geofence: geofenceEnabled ? geofence : null,
    geofenceEnabled,
    loading,
    historyLoading,
    error,
    refetch,
  };
}

/** Lightweight fetch for dashboard widgets */
export function useAttendanceLive() {
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
        const requests = [
          getAttendanceToday(),
          getAttendanceMonthlySummary({
            year: current.getFullYear(),
            month: current.getMonth() + 1,
          }),
        ];

        if (geofenceEnabled) {
          requests.push(getAttendanceGeofenceInfo().catch(() => null));
        }

        const [todayRes, summaryRes, geoRes] = await Promise.all(requests);
        if (!alive) return;
        setToday(todayRes.today);
        setSummary(summaryRes);
        setGeofence(geofenceEnabled ? geoRes || null : null);
      } catch {
        // Dashboard can fall back to portal dashboard payload.
        if (alive) setGeofence(null);
      } finally {
        if (alive) setLoading(false);
      }
    })();
    return () => {
      alive = false;
    };
  }, [reloadTick, geofenceEnabled]);

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
        logId: data.logId,
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
        logId: data.logId ?? prev?.logId,
        checkInTime: data.checkInTime ?? prev?.checkInTime,
        checkOutTime: data.checkOutTime ?? data.checkOutAt ?? new Date().toISOString(),
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
            logId: data.logId ?? base.logId,
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
          logId: data.logId ?? base.logId,
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
