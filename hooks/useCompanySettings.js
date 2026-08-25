"use client";

import { useCallback, useEffect, useState } from "react";
import { getCompanySettings } from "@/api/portal";

/**
 * Company date/time formats without treating the page as a dashboard consumer.
 * Uses the shared dashboard cache (see getPortalDashboard TTL).
 */
export function useCompanySettings() {
  const [settings, setSettings] = useState({
    dateFormat: "DD/MM/YYYY",
    timeFormat: "12h",
  });
  const [loading, setLoading] = useState(true);

  const load = useCallback(async () => {
    try {
      const next = await getCompanySettings();
      setSettings({
        dateFormat: next.dateFormat || "DD/MM/YYYY",
        timeFormat: next.timeFormat || "12h",
        timezone: next.timezone || null,
        ...next,
      });
    } catch {
      // Keep safe defaults.
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    let alive = true;
    (async () => {
      try {
        const next = await getCompanySettings();
        if (!alive) return;
        setSettings({
          dateFormat: next.dateFormat || "DD/MM/YYYY",
          timeFormat: next.timeFormat || "12h",
          timezone: next.timezone || null,
          ...next,
        });
      } catch {
        // defaults
      } finally {
        if (alive) setLoading(false);
      }
    })();
    return () => {
      alive = false;
    };
  }, []);

  return { settings, loading, refetch: load };
}
