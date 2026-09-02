"use client";

import { useCallback, useEffect, useState } from "react";
import {
  acknowledgeOrgDocument,
  downloadOrgDocument,
  getOrgDocument,
  listOrgDocumentCategories,
  listOrgDocuments,
} from "@/api/org-documents";
import { getApiErrorMessage } from "@/lib/api-error";

export function useOrgDocumentCategories({ enabled = true } = {}) {
  const [categories, setCategories] = useState([]);
  const [loading, setLoading] = useState(Boolean(enabled));
  const [error, setError] = useState(null);

  useEffect(() => {
    if (!enabled) {
      setLoading(false);
      setCategories([]);
      return undefined;
    }
    let alive = true;
    (async () => {
      setLoading(true);
      setError(null);
      try {
        const list = await listOrgDocumentCategories();
        if (!alive) return;
        setCategories(list);
      } catch (err) {
        if (!alive) return;
        setError(getApiErrorMessage(err, "Failed to load categories"));
        setCategories([]);
      } finally {
        if (alive) setLoading(false);
      }
    })();
    return () => {
      alive = false;
    };
  }, [enabled]);

  return { categories, loading, error };
}

export function useOrgDocumentsList({
  page = 1,
  limit = 20,
  categoryId = "",
  search = "",
  tag = "",
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
        const res = await listOrgDocuments({
          page,
          limit,
          categoryId: categoryId || undefined,
          search: search || undefined,
          tag: tag || undefined,
        });
        if (!alive) return;
        setRows(res.rows);
        setMeta(res.meta || { total: 0, page, limit, totalPages: 1 });
      } catch (err) {
        if (!alive) return;
        setError(getApiErrorMessage(err, "Failed to load company documents"));
        setRows([]);
      } finally {
        if (alive) setLoading(false);
      }
    })();
    return () => {
      alive = false;
    };
  }, [page, limit, categoryId, search, tag, reloadTick, enabled]);

  const refetch = useCallback(() => setReloadTick((n) => n + 1), []);

  return { rows, meta, loading, error, refetch };
}

export async function fetchOrgDocumentDetail(documentId) {
  return getOrgDocument(documentId);
}

export async function downloadOrgDoc(documentId) {
  return downloadOrgDocument(documentId);
}

export async function acknowledgeOrgDoc(documentId, payload) {
  return acknowledgeOrgDocument(documentId, payload);
}
