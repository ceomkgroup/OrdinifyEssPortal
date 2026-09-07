"use client";

import { useCallback, useEffect, useState } from "react";
import {
  acknowledgeAssetAssignment,
  confirmAssetVerification,
  disputeAssetVerification,
  getAssetHistory,
  listAssetIncidents,
  listAssetVerifications,
  listMyAssets,
  reportAssetIncident,
} from "@/api/assets";
import { getApiErrorMessage } from "@/lib/api-error";

export function useMyAssets({ enabled = true } = {}) {
  const [rows, setRows] = useState([]);
  const [loading, setLoading] = useState(Boolean(enabled));
  const [error, setError] = useState(null);
  const [reloadTick, setReloadTick] = useState(0);

  useEffect(() => {
    if (!enabled) {
      setLoading(false);
      setRows([]);
      setError(null);
      return undefined;
    }
    let alive = true;
    (async () => {
      setLoading(true);
      setError(null);
      try {
        const res = await listMyAssets();
        if (!alive) return;
        setRows(res.rows);
      } catch (err) {
        if (!alive) return;
        setError(getApiErrorMessage(err, "Failed to load assets"));
        setRows([]);
      } finally {
        if (alive) setLoading(false);
      }
    })();
    return () => {
      alive = false;
    };
  }, [enabled, reloadTick]);

  const refetch = useCallback(() => setReloadTick((n) => n + 1), []);
  return { rows, loading, error, refetch };
}

export function useAssetHistory(assetId, { enabled = true, page = 1, limit = 20 } = {}) {
  const [rows, setRows] = useState([]);
  const [meta, setMeta] = useState({ total: 0, page: 1, limit: 20, totalPages: 1 });
  const [loading, setLoading] = useState(Boolean(enabled && assetId));
  const [error, setError] = useState(null);
  const [reloadTick, setReloadTick] = useState(0);

  useEffect(() => {
    if (!enabled || !assetId) {
      setLoading(false);
      setRows([]);
      setError(null);
      return undefined;
    }
    let alive = true;
    (async () => {
      setLoading(true);
      setError(null);
      try {
        const res = await getAssetHistory(assetId, { page, limit });
        if (!alive) return;
        setRows(res.rows);
        setMeta(res.meta);
      } catch (err) {
        if (!alive) return;
        setError(getApiErrorMessage(err, "Failed to load history"));
        setRows([]);
      } finally {
        if (alive) setLoading(false);
      }
    })();
    return () => {
      alive = false;
    };
  }, [assetId, enabled, page, limit, reloadTick]);

  const refetch = useCallback(() => setReloadTick((n) => n + 1), []);
  return { rows, meta, loading, error, refetch };
}

export function useAssetVerifications({
  page = 1,
  limit = 20,
  enabled = true,
} = {}) {
  const [rows, setRows] = useState([]);
  const [meta, setMeta] = useState({ total: 0, page: 1, limit: 20, totalPages: 1 });
  const [loading, setLoading] = useState(Boolean(enabled));
  const [error, setError] = useState(null);
  const [reloadTick, setReloadTick] = useState(0);

  useEffect(() => {
    if (!enabled) {
      setLoading(false);
      setRows([]);
      setError(null);
      return undefined;
    }
    let alive = true;
    (async () => {
      setLoading(true);
      setError(null);
      try {
        const res = await listAssetVerifications({ page, limit });
        if (!alive) return;
        setRows(res.rows);
        setMeta(res.meta);
      } catch (err) {
        if (!alive) return;
        setError(getApiErrorMessage(err, "Failed to load verifications"));
        setRows([]);
      } finally {
        if (alive) setLoading(false);
      }
    })();
    return () => {
      alive = false;
    };
  }, [page, limit, enabled, reloadTick]);

  const refetch = useCallback(() => setReloadTick((n) => n + 1), []);
  return { rows, meta, loading, error, refetch };
}

export function useAssetIncidents({
  page = 1,
  limit = 20,
  enabled = true,
} = {}) {
  const [rows, setRows] = useState([]);
  const [meta, setMeta] = useState({ total: 0, page: 1, limit: 20, totalPages: 1 });
  const [loading, setLoading] = useState(Boolean(enabled));
  const [error, setError] = useState(null);
  const [reloadTick, setReloadTick] = useState(0);

  useEffect(() => {
    if (!enabled) {
      setLoading(false);
      setRows([]);
      setError(null);
      return undefined;
    }
    let alive = true;
    (async () => {
      setLoading(true);
      setError(null);
      try {
        const res = await listAssetIncidents({ page, limit });
        if (!alive) return;
        setRows(res.rows);
        setMeta(res.meta);
      } catch (err) {
        if (!alive) return;
        setError(getApiErrorMessage(err, "Failed to load incidents"));
        setRows([]);
      } finally {
        if (alive) setLoading(false);
      }
    })();
    return () => {
      alive = false;
    };
  }, [page, limit, enabled, reloadTick]);

  const refetch = useCallback(() => setReloadTick((n) => n + 1), []);
  return { rows, meta, loading, error, refetch };
}

export async function acknowledgeAssignment(assignmentId) {
  return acknowledgeAssetAssignment(assignmentId);
}

export async function confirmVerification(verificationId) {
  return confirmAssetVerification(verificationId);
}

export async function disputeVerification(verificationId, payload) {
  return disputeAssetVerification(verificationId, payload);
}

export async function submitAssetIncident(payload) {
  return reportAssetIncident(payload);
}
