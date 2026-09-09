"use client";

import { useCallback, useEffect, useState } from "react";
import {
  listNotifications,
  markAllNotificationsRead,
  markNotificationRead,
} from "@/api/notifications";

export function useNotificationsList({
  page = 1,
  limit = 20,
  unreadOnly = false,
  enabled = true,
} = {}) {
  const [rows, setRows] = useState([]);
  const [meta, setMeta] = useState({
    page: 1,
    limit: 20,
    total: 0,
    totalPages: 1,
    unreadCount: 0,
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
        const res = await listNotifications({ page, limit, unreadOnly });
        if (!alive) return;
        setRows(res.rows);
        setMeta(res.meta);
      } catch (err) {
        if (!alive) return;
        setError(err.message || "Failed to load notifications");
        setRows([]);
      } finally {
        if (alive) setLoading(false);
      }
    })();

    return () => {
      alive = false;
    };
  }, [page, limit, unreadOnly, enabled, reloadTick]);

  const refetch = useCallback(() => setReloadTick((n) => n + 1), []);

  return { rows, meta, loading, error, refetch, setRows, setMeta };
}

export async function readOneNotification(id) {
  return markNotificationRead(id);
}

export async function readAllNotifications() {
  return markAllNotificationsRead();
}
