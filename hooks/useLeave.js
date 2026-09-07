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

export function useLeavePage() {
  const { hasFlag } = useModules();
  const flagEncashment = hasFlag("allowLeaveEncashment");

  const currentYear = useMemo(() => new Date().getFullYear(), []);
  const [fiscalYear, setFiscalYear] = useState(currentYear);

  const [balances, setBalances] = useState([]);
  const [balanceLoading, setBalanceLoading] = useState(true);

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
  const [requestsLoading, setRequestsLoading] = useState(true);

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
  const [encashDisabled, setEncashDisabled] = useState(false);
  const [encashMessage, setEncashMessage] = useState("");
  const [encashLoading, setEncashLoading] = useState(true);
  const [encashProbed, setEncashProbed] = useState(false);

  const [error, setError] = useState("");
  const [reloadTick, setReloadTick] = useState(0);

  const refetch = useCallback(() => {
    setReloadTick((n) => n + 1);
  }, []);

  useEffect(() => {
    let alive = true;
    queueMicrotask(() => {
      if (alive) {
        setBalanceLoading(true);
        setError("");
      }
    });

    (async () => {
      try {
        const rows = await getLeaveBalance({ fiscalYear });
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
  }, [fiscalYear, reloadTick]);

  useEffect(() => {
    let alive = true;
    queueMicrotask(() => {
      if (alive) setRequestsLoading(true);
    });

    (async () => {
      try {
        const res = await listLeaveRequests({ status, page, limit });
        if (!alive) return;
        setRequests(res.rows);
        setMeta(res.meta || { total: 0, page, limit, totalPages: 1 });
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
  }, [status, page, limit, reloadTick]);

  // Encashment list — only when company flag allows (skip extra API on leave page).
  useEffect(() => {
    if (!flagEncashment) {
      setEncashLoading(false);
      setEncashDisabled(true);
      setEncashProbed(true);
      setEncashRows([]);
      setEncashMessage("");
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
        });
        if (!alive) return;
        setEncashRows(res.rows || []);
        setEncashMeta(
          res.meta || {
            total: 0,
            page: encashPage,
            limit: encashLimit,
            totalPages: 1,
          }
        );
        setEncashDisabled(Boolean(res.disabled));
        setEncashMessage(res.message || "");
      } catch (err) {
        if (!alive) return;
        // Soft-fail: don't block leave page if encashment errors
        setEncashRows([]);
        setEncashDisabled(true);
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
  }, [flagEncashment, encashStatus, encashPage, encashLimit, reloadTick]);

  // Show encashment when modules flag is on, OR API confirms it is enabled.
  const encashmentEnabled =
    flagEncashment || (encashProbed && !encashDisabled);

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

  /** Edit = cancel pending + create new (no dedicated update API). */
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
    status,
    setStatusFilter,
    page,
    setPage,
    limit,
    setLimit,
    requests,
    meta,
    requestsLoading,
    encashmentEnabled,
    encashStatus,
    setEncashStatusFilter,
    encashPage,
    setEncashPage,
    encashLimit,
    setEncashLimit,
    encashRows,
    encashMeta,
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
