"use client";

import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useState,
} from "react";
import { listNotifications } from "@/api/notifications";
import { useAuth } from "@/components/auth/AuthProvider";

const NotificationsBadgeContext = createContext(null);

export function NotificationsBadgeProvider({ children }) {
  const { isAuthenticated } = useAuth();
  const [unreadCount, setUnreadCount] = useState(0);

  const refreshUnread = useCallback(async () => {
    if (!isAuthenticated) {
      setUnreadCount(0);
      return 0;
    }
    try {
      const res = await listNotifications({
        page: 1,
        limit: 1,
        unreadOnly: false,
      });
      const count = Number(res.meta?.unreadCount) || 0;
      setUnreadCount(count);
      return count;
    } catch {
      return 0;
    }
  }, [isAuthenticated]);

  useEffect(() => {
    if (!isAuthenticated) {
      setUnreadCount(0);
      return undefined;
    }
    refreshUnread();
    return undefined;
  }, [isAuthenticated, refreshUnread]);

  const value = useMemo(
    () => ({
      unreadCount,
      setUnreadCount,
      refreshUnread,
    }),
    [unreadCount, refreshUnread]
  );

  return (
    <NotificationsBadgeContext.Provider value={value}>
      {children}
    </NotificationsBadgeContext.Provider>
  );
}

export function useNotificationsBadge() {
  const ctx = useContext(NotificationsBadgeContext);
  return (
    ctx || {
      unreadCount: 0,
      setUnreadCount: () => {},
      refreshUnread: async () => 0,
    }
  );
}
