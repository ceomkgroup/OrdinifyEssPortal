"use client";

import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useState,
} from "react";
import { getCompanyModules } from "@/api/portal";
import { useAuth } from "@/components/auth/AuthProvider";
import {
  canAccessRoute,
  canShowRequestTile,
  canShowDocumentTile,
  canShowAssetTile,
  canShowWidget,
  hasAnyScreen,
  hasFlag,
  hasScreen,
  normalizeModules,
} from "@/lib/modules";

const ModulesContext = createContext(null);

export function useModules() {
  const ctx = useContext(ModulesContext);
  if (!ctx) {
    throw new Error("useModules must be used inside ModulesProvider");
  }
  return ctx;
}

export function useModulesOptional() {
  return useContext(ModulesContext);
}

export function ModulesProvider({ children }) {
  const { isAuthenticated } = useAuth();
  const [raw, setRaw] = useState(null);
  const [loading, setLoading] = useState(Boolean(isAuthenticated));
  const [error, setError] = useState(null);

  useEffect(() => {
    let alive = true;

    if (!isAuthenticated) {
      queueMicrotask(() => {
        if (!alive) return;
        setRaw(null);
        setError(null);
        setLoading(false);
      });
      return () => {
        alive = false;
      };
    }

    queueMicrotask(() => {
      if (alive) setLoading(true);
    });

    (async () => {
      try {
        const data = await getCompanyModules();
        if (!alive) return;
        setRaw(data);
        setError(null);
      } catch (err) {
        if (!alive) return;
        setError(err.message || "Failed to load modules");
      } finally {
        if (alive) setLoading(false);
      }
    })();

    return () => {
      alive = false;
    };
  }, [isAuthenticated]);

  const refetch = useCallback(async () => {
    if (!isAuthenticated) return null;
    setLoading(true);
    setError(null);
    try {
      const data = await getCompanyModules({ force: true });
      setRaw(data);
      return data;
    } catch (err) {
      setError(err.message || "Failed to load modules");
      return null;
    } finally {
      setLoading(false);
    }
  }, [isAuthenticated]);

  const modules = useMemo(
    () => (raw ? normalizeModules(raw) : null),
    [raw]
  );

  const value = useMemo(
    () => ({
      modules,
      raw,
      loading,
      error,
      refetch,
      hasScreen: (key) => hasScreen(modules, key),
      hasAnyScreen: (keys) => hasAnyScreen(modules, keys),
      hasFlag: (flag) => hasFlag(modules, flag),
      canAccessRoute: (href) => canAccessRoute(modules, href),
      canShowWidget: (key) => canShowWidget(modules, key),
      canShowRequestTile: (key) => canShowRequestTile(modules, key),
      canShowDocumentTile: (key) => canShowDocumentTile(modules, key),
      canShowAssetTile: (key) => canShowAssetTile(modules, key),
    }),
    [modules, raw, loading, error, refetch]
  );

  return (
    <ModulesContext.Provider value={value}>{children}</ModulesContext.Provider>
  );
}
