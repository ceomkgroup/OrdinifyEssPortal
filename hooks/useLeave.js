"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import {
  cancelEncashmentRequest,
  cancelLeaveRequest,
  createEncashmentRequest,
  createLeaveRequest,
  getLeaveBalance,
  listEncashmentRequests,
  listLeaveRequests,
} from "@/api/leave";
import { useModules } from "@/components/modules/ModulesProvider";
import {
  emptyRequestStats,
  statsFromListResponse,
} from "@/lib/request-stats";

const EMPTY_STATS = emptyRequestStats();

/**
 * Leave data hooks — load only what the active screen needs.
 * - logs → leave requests
 * - encashment → encashment list
 * - balance → leave balance
 * Forms can call ensureBalances() when they open.
 */
export function useLeavePage({
  loadBalance = false,
  loadRequests = false,
  loadEncashment = false,
} = {}) {
  const { hasFlag } = useModules();
  const flagEncashment = hasFlag("allowLeaveEncashment");

  const currentYear = useMemo(() => new Date().getFullYear(), []);
  const [fiscalYear, setFiscalYear] = useState(currentYear);

  const [balances, setBalances] = useState([]);
  const [balanceLoading, setBalanceLoading] = useState(Boolean(loadBalance));

  const [status, setStatus] = useState("all");
  const [page, setPage] = useState(1);
  const [limit, setLimit] = useState(10);
  const [requests, setRequests] = useState([]);
  const [meta, setMeta] = useState({
    total: 0,
    page: 1,
    limit: 10,
    totalPages: 1,
  });
  const [requestsLoading, setRequestsLoading] = useState(Boolean(loadRequests));
  const [requestStats, setRequestStats] = useState(EMPTY_STATS);

  const [encashStatus, setEncashStatus] = useState("all");
  const [encashPage, setEncashPage] = useState(1);
  const [encashLimit, setEncashLimit] = useState(10);
  const [encashRows, setEncashRows] = useState([]);
  const [encashMeta, setEncashMeta] = useState({
    total: 0,
    page: 1,
    limit: 10,
    totalPages: 1,
  });
  const [encashStats, setEncashStats] = useState(EMPTY_STATS);
  const [encashDisabled, setEncashDisabled] = useState(false);
  const [encashMessage, setEncashMessage] = useState("");
  const [encashLoading, setEncashLoading] = useState(
    Boolean(loadEncashment && flagEncashment)
  );
  const [encashProbed, setEncashProbed] = useState(false);

  const [error, setError] = useState("");
  const [reloadTick, setReloadTick] = useState(0);

  const refetch = useCallback(() => {
    setReloadTick((n) => n + 1);
  }, []);

  const fetchBalances = useCallback(
    async ({ year = fiscalYear, force = false } = {}) => {
      if (!force && balances.length > 0 && year === fiscalYear) {
        return balances;
      }
      setBalanceLoading(true);
      try {
        const rows = await getLeaveBalance({ fiscalYear: year });
        setBalances(rows);
        return rows;
      } catch (err) {
        setBalances([]);
        throw err;
      } finally {
        setBalanceLoading(false);
      }
    },
    [balances, fiscalYear]
  );

  const ensureBalances = useCallback(async () => {
    try {
      return await fetchBalances({ force: balances.length === 0 });
    } catch {
      return [];
    }
  }, [fetchBalances, balances.length]);

  useEffect(() => {
    if (!loadBalance) {
      setBalanceLoading(false);
      return undefined;
    }

    let alive = true;
    queueMicrotask(() => {
      if (alive) {
        setBalanceLoading(true);
        setError("");
      }
    });

    (async () => {
      try {
        const rows = await getLeaveBalance({
          fiscalYear,
          force: reloadTick > 0,
        });
        if (!alive) return;
        setBalances(rows);
      } catch (err) {
        if (!alive) return;
        setError(err.message || "Failed to load leave balance");
        setBalances([]);
      } finally {
        if (alive) setBalanceLoading(false);
      }
    })();

    return () => {
      alive = false;
    };
  }, [fiscalYear, reloadTick, loadBalance]);

  useEffect(() => {
    if (!loadRequests) {
      setRequestsLoading(false);
      setRequestStats(EMPTY_STATS);
      return undefined;
    }

    let alive = true;
    queueMicrotask(() => {
      if (alive) setRequestsLoading(true);
    });

    (async () => {
      try {
        const res = await listLeaveRequests({
          status,
          page,
          limit,
          force: reloadTick > 0,
        });
        if (!alive) return;
        const list = res.rows || [];
        const nextMeta = res.meta || { total: 0, page, limit, totalPages: 1 };
        setRequests(list);
        setMeta(nextMeta);
        setRequestStats((prev) =>
          statsFromListResponse(prev, list, nextMeta, status)
        );
      } catch (err) {
        if (!alive) return;
        setError(err.message || "Failed to load leave requests");
        setRequests([]);
      } finally {
        if (alive) setRequestsLoading(false);
      }
    })();

    return () => {
      alive = false;
    };
  }, [status, page, limit, reloadTick, loadRequests]);

  useEffect(() => {
    if (!loadEncashment || !flagEncashment) {
      setEncashLoading(false);
      setEncashDisabled(!flagEncashment);
      setEncashProbed(true);
      setEncashRows([]);
      setEncashMessage("");
      setEncashStats(EMPTY_STATS);
      return undefined;
    }

    let alive = true;

    queueMicrotask(() => {
      if (alive) setEncashLoading(true);
    });

    (async () => {
      try {
        const res = await listEncashmentRequests({
          status: encashStatus,
          page: encashPage,
          limit: encashLimit,
          force: reloadTick > 0,
        });
        if (!alive) return;
        const list = res.rows || [];
        const nextMeta =
          res.meta || {
            total: 0,
            page: encashPage,
            limit: encashLimit,
            totalPages: 1,
          };
        setEncashRows(list);
        setEncashMeta(nextMeta);
        setEncashStats((prev) =>
          statsFromListResponse(prev, list, nextMeta, encashStatus)
        );
        setEncashDisabled(Boolean(res.disabled));
        setEncashMessage(res.message || "");
      } catch (err) {
        if (!alive) return;
        setEncashRows([]);
        setEncashMeta({
          total: 0,
          page: encashPage,
          limit: encashLimit,
          totalPages: 1,
        });
        setEncashMessage(err.message || "Failed to load encashment requests");
      } finally {
        if (alive) {
          setEncashLoading(false);
          setEncashProbed(true);
        }
      }
    })();

    return () => {
      alive = false;
    };
  }, [
    loadEncashment,
    flagEncashment,
    encashStatus,
    encashPage,
    encashLimit,
    reloadTick,
  ]);

  const showEncashment =
    loadEncashment &&
    (flagEncashment || (encashProbed && !encashDisabled));

  const submitLeave = useCallback(
    async (payload) => {
      const result = await createLeaveRequest(payload);
      refetch();
      return result;
    },
    [refetch]
  );

  const cancelLeave = useCallback(
    async (requestId) => {
      const result = await cancelLeaveRequest(requestId);
      refetch();
      return result;
    },
    [refetch]
  );

  const updateLeave = useCallback(
    async (requestId, payload) => {
      await cancelLeaveRequest(requestId);
      const result = await createLeaveRequest(payload);
      refetch();
      return result;
    },
    [refetch]
  );

  const submitEncashment = useCallback(
    async (payload) => {
      const result = await createEncashmentRequest(payload);
      refetch();
      return result;
    },
    [refetch]
  );

  const cancelEncashment = useCallback(
    async (encashmentId) => {
      const result = await cancelEncashmentRequest(encashmentId);
      refetch();
      return result;
    },
    [refetch]
  );

  const setStatusFilter = useCallback((next) => {
    setStatus(next);
    setPage(1);
  }, []);

  const setEncashStatusFilter = useCallback((next) => {
    setEncashStatus(next);
    setEncashPage(1);
  }, []);

  return {
    fiscalYear,
    setFiscalYear,
    balances,
    balanceLoading,
    ensureBalances,
    status,
    setStatusFilter,
    page,
    setPage,
    limit,
    setLimit,
    requests,
    meta,
    requestStats,
    requestsLoading,
    encashmentEnabled: showEncashment,
    encashStatus,
    setEncashStatusFilter,
    encashPage,
    setEncashPage,
    encashLimit,
    setEncashLimit,
    encashRows,
    encashMeta,
    encashStats,
    encashDisabled,
    encashMessage,
    encashLoading,
    error,
    setError,
    refetch,
    submitLeave,
    cancelLeave,
    updateLeave,
    submitEncashment,
    cancelEncashment,
  };
}
