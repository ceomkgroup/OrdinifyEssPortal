"use client";

import { useCallback, useEffect, useState } from "react";
import {
  createDocument,
  deleteDocument,
  getDocumentTypes,
  listMyDocuments,
} from "@/api/documents";
import { getApiErrorMessage } from "@/lib/api-error";

export function useMyDocumentsList({
  page = 1,
  limit = 20,
  enabled = true,
} = {}) {
  const [rows, setRows] = useState([]);
  const [meta, setMeta] = useState({
    total: 0,
    page: 1,
    limit: 20,
    totalPages: 1,
  });
  const [loading, setLoading] = useState(Boolean(enabled));
  const [error, setError] = useState(null);
  const [reloadTick, setReloadTick] = useState(0);

  useEffect(() => {
    if (!enabled) {
      setLoading(false);
      setRows([]);
      setError(null);
      setMeta({ total: 0, page: 1, limit: 20, totalPages: 1 });
      return undefined;
    }

    let alive = true;
    (async () => {
      setLoading(true);
      setError(null);
      try {
        const res = await listMyDocuments({ page, limit });
        if (!alive) return;
        setRows(res.rows);
        setMeta(res.meta || { total: 0, page, limit, totalPages: 1 });
      } catch (err) {
        if (!alive) return;
        setError(getApiErrorMessage(err, "Failed to load documents"));
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

export function useMyDocumentsStats({ enabled = true } = {}) {
  const [stats, setStats] = useState({
    total: 0,
    verified: 0,
    pending: 0,
  });
  const [loading, setLoading] = useState(Boolean(enabled));
  const [reloadTick, setReloadTick] = useState(0);

  useEffect(() => {
    if (!enabled) {
      setLoading(false);
      return undefined;
    }
    let alive = true;
    (async () => {
      setLoading(true);
      try {
        const res = await listMyDocuments({ page: 1, limit: 100 });
        if (!alive) return;
        const next = {
          total: Number(res.meta?.total) || (res.rows || []).length,
          verified: 0,
          pending: 0,
        };
        for (const row of res.rows || []) {
          const s = String(row.verificationStatus || "").toLowerCase();
          if (s === "verified" || s === "approved") next.verified += 1;
          else if (s === "pending" || s === "submitted") next.pending += 1;
        }
        setStats(next);
      } catch {
        if (alive) setStats({ total: 0, verified: 0, pending: 0 });
      } finally {
        if (alive) setLoading(false);
      }
    })();
    return () => {
      alive = false;
    };
  }, [enabled, reloadTick]);

  const refetch = useCallback(() => setReloadTick((n) => n + 1), []);
  return { stats, loading, refetch };
}

export function useDocumentTypes({ enabled = true } = {}) {
  const [types, setTypes] = useState([]);
  const [loading, setLoading] = useState(Boolean(enabled));
  const [error, setError] = useState(null);

  useEffect(() => {
    if (!enabled) {
      setLoading(false);
      setTypes([]);
      return undefined;
    }
    let alive = true;
    (async () => {
      setLoading(true);
      setError(null);
      try {
        const list = await getDocumentTypes();
        if (!alive) return;
        setTypes(list);
      } catch (err) {
        if (!alive) return;
        setError(getApiErrorMessage(err, "Failed to load document types"));
        setTypes([]);
      } finally {
        if (alive) setLoading(false);
      }
    })();
    return () => {
      alive = false;
    };
  }, [enabled]);

  return { types, loading, error };
}

export async function submitDocument(payload) {
  return createDocument(payload);
}

export async function removeDocument(docId) {
  return deleteDocument(docId);
}
