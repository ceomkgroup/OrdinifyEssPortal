"use client";

import { createContext, useCallback, useContext, useMemo, useState } from "react";

const AnnouncementsBadgeContext = createContext(null);

export function AnnouncementsBadgeProvider({ children }) {
  const [unreadCount, setUnreadCount] = useState(0);

  const syncFromRows = useCallback((rows) => {
    const list = Array.isArray(rows) ? rows : [];
    setUnreadCount(list.filter((r) => !r.isRead).length);
  }, []);

  const value = useMemo(
    () => ({
      unreadCount,
      setUnreadCount,
      syncFromRows,
    }),
    [unreadCount, syncFromRows]
  );

  return (
    <AnnouncementsBadgeContext.Provider value={value}>
      {children}
    </AnnouncementsBadgeContext.Provider>
  );
}

export function useAnnouncementsBadge() {
  const ctx = useContext(AnnouncementsBadgeContext);
  return (
    ctx || {
      unreadCount: 0,
      setUnreadCount: () => {},
      syncFromRows: () => {},
    }
  );
}
