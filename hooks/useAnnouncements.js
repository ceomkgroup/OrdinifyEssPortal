"use client";

import { useCallback, useEffect, useState } from "react";
import {
  acknowledgeAnnouncement,
  addAnnouncementComment,
  getAnnouncement,
  listAnnouncementComments,
  listAnnouncements,
  markAllAnnouncementsRead,
  reactToAnnouncement,
  removeAnnouncementReaction,
} from "@/api/announcements";

export function useAnnouncementsList({
  page = 1,
  limit = 20,
  category = "all",
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
      return undefined;
    }

    let alive = true;
    (async () => {
      setLoading(true);
      setError(null);
      try {
        const res = await listAnnouncements({
          page,
          limit,
          category,
          force: reloadTick > 0,
        });
        if (!alive) return;
        setRows(res.rows);
        setMeta(res.meta || { total: 0, page, limit, totalPages: 1 });
      } catch (err) {
        if (!alive) return;
        setError(err.message || "Failed to load announcements");
        setRows([]);
      } finally {
        if (alive) setLoading(false);
      }
    })();

    return () => {
      alive = false;
    };
  }, [page, limit, category, enabled, reloadTick]);

  const refetch = useCallback(() => setReloadTick((n) => n + 1), []);

  const unreadCount = rows.filter((r) => !r.isRead).length;
  const pendingAckCount = rows.filter(
    (r) => r.requireAck && !r.isAcknowledged
  ).length;

  return {
    rows,
    meta,
    loading,
    error,
    refetch,
    unreadCount,
    pendingAckCount,
    setRows,
  };
}

export function useAnnouncementDetail(id, { enabled = true } = {}) {
  const [detail, setDetail] = useState(null);
  const [loading, setLoading] = useState(Boolean(enabled && id));
  const [error, setError] = useState(null);
  const [reloadTick, setReloadTick] = useState(0);

  useEffect(() => {
    if (!enabled || !id) {
      setDetail(null);
      setLoading(false);
      setError(null);
      return undefined;
    }

    let alive = true;
    (async () => {
      setLoading(true);
      setError(null);
      try {
        const row = await getAnnouncement(id);
        if (!alive) return;
        setDetail(row);
      } catch (err) {
        if (!alive) return;
        setError(err.message || "Failed to load announcement");
        setDetail(null);
      } finally {
        if (alive) setLoading(false);
      }
    })();

    return () => {
      alive = false;
    };
  }, [id, enabled, reloadTick]);

  const refetch = useCallback(() => setReloadTick((n) => n + 1), []);

  return { detail, loading, error, refetch, setDetail };
}

export function useAnnouncementComments(id, { enabled = true, limit = 50 } = {}) {
  const [rows, setRows] = useState([]);
  const [meta, setMeta] = useState({ total: 0, page: 1, limit, totalPages: 1 });
  const [loading, setLoading] = useState(Boolean(enabled && id));
  const [error, setError] = useState(null);
  const [reloadTick, setReloadTick] = useState(0);

  useEffect(() => {
    if (!enabled || !id) {
      setRows([]);
      setLoading(false);
      return undefined;
    }

    let alive = true;
    (async () => {
      setLoading(true);
      setError(null);
      try {
        const res = await listAnnouncementComments(id, { page: 1, limit });
        if (!alive) return;
        setRows(res.rows);
        setMeta(res.meta);
      } catch (err) {
        if (!alive) return;
        setError(err.message || "Failed to load comments");
        setRows([]);
      } finally {
        if (alive) setLoading(false);
      }
    })();

    return () => {
      alive = false;
    };
  }, [id, enabled, limit, reloadTick]);

  const refetch = useCallback(() => setReloadTick((n) => n + 1), []);

  return { rows, meta, loading, error, refetch, setRows };
}

export async function markAllRead() {
  return markAllAnnouncementsRead();
}

export async function acknowledge(id) {
  return acknowledgeAnnouncement(id);
}

export async function postComment(id, comment) {
  return addAnnouncementComment(id, comment);
}

export async function setReaction(id, reaction) {
  return reactToAnnouncement(id, reaction);
}

export async function clearReaction(id) {
  return removeAnnouncementReaction(id);
}
