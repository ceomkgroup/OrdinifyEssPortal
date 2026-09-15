"use client";

import { useCallback, useEffect, useState } from "react";
import {
  getPayslip,
  getTaxCertificate,
  listPayslips,
} from "@/api/payslips";
import { getApiErrorMessage } from "@/lib/api-error";

export function usePayslipList({ page = 1, limit = 10, enabled = true } = {}) {
  const [rows, setRows] = useState([]);
  const [meta, setMeta] = useState({
    total: 0,
    page: 1,
    limit: 10,
    totalPages: 1,
  });
  const [loading, setLoading] = useState(Boolean(enabled));
  const [error, setError] = useState(null);
  const [reloadTick, setReloadTick] = useState(0);

  useEffect(() => {
    let alive = true;

    if (!enabled) {
      queueMicrotask(() => {
        if (!alive) return;
        setLoading(false);
        setRows([]);
        setError(null);
      });
      return () => {
        alive = false;
      };
    }

    (async () => {
      setLoading(true);
      setError(null);
      try {
        const res = await listPayslips({ page, limit });
        if (!alive) return;
        setRows(res.rows);
        setMeta(res.meta);
      } catch (err) {
        if (!alive) return;
        setError(getApiErrorMessage(err, "Failed to load payslips"));
        setRows([]);
      } finally {
        if (alive) setLoading(false);
      }
    })();

    return () => {
      alive = false;
    };
  }, [page, limit, reloadTick, enabled]);

  const refetch = useCallback(() => setReloadTick((n) => n + 1), []);

  return { rows, meta, loading, error, refetch };
}

export function usePayslipDetail(payslipId, { enabled = true } = {}) {
  const [data, setData] = useState(null);
  const [loading, setLoading] = useState(Boolean(enabled && payslipId));
  const [error, setError] = useState(null);
  const [reloadTick, setReloadTick] = useState(0);

  useEffect(() => {
    let alive = true;

    if (!enabled || !payslipId) {
      queueMicrotask(() => {
        if (!alive) return;
        setLoading(false);
        setData(null);
        setError(payslipId ? null : "Missing payslip id.");
      });
      return () => {
        alive = false;
      };
    }

    (async () => {
      setLoading(true);
      setError(null);
      try {
        const detail = await getPayslip(payslipId);
        if (!alive) return;
        setData(detail);
      } catch (err) {
        if (!alive) return;
        setError(getApiErrorMessage(err, "Failed to load payslip"));
        setData(null);
      } finally {
        if (alive) setLoading(false);
      }
    })();

    return () => {
      alive = false;
    };
  }, [payslipId, enabled, reloadTick]);

  const refetch = useCallback(() => setReloadTick((n) => n + 1), []);

  return { data, loading, error, refetch };
}

export function useTaxCertificate(fiscalYearStart, { enabled = true } = {}) {
  const [data, setData] = useState(null);
  const [loading, setLoading] = useState(Boolean(enabled));
  const [error, setError] = useState(null);
  const [reloadTick, setReloadTick] = useState(0);

  useEffect(() => {
    let alive = true;

    if (!enabled) {
      queueMicrotask(() => {
        if (alive) setLoading(false);
      });
      return () => {
        alive = false;
      };
    }

    (async () => {
      setLoading(true);
      setError(null);
      try {
        const cert = await getTaxCertificate({ fiscalYearStart });
        if (!alive) return;
        setData(cert);
      } catch (err) {
        if (!alive) return;
        setError(getApiErrorMessage(err, "Failed to load tax certificate"));
        setData(null);
      } finally {
        if (alive) setLoading(false);
      }
    })();

    return () => {
      alive = false;
    };
  }, [fiscalYearStart, enabled, reloadTick]);

  const refetch = useCallback(() => setReloadTick((n) => n + 1), []);

  return { data, loading, error, refetch };
}
