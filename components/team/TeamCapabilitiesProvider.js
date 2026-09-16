"use client";

import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useState,
} from "react";
import {
  canApplyTeamType,
  canViewTeamType,
  getTeamCapabilities,
} from "@/api/team";
import { useAuth } from "@/components/auth/AuthProvider";
import { useModules } from "@/components/modules/ModulesProvider";
import { TEAM_APPROVAL_TYPES } from "@/lib/team-nav";

const TeamContext = createContext(null);

export function useTeam() {
  const ctx = useContext(TeamContext);
  if (!ctx) {
    throw new Error("useTeam must be used inside TeamCapabilitiesProvider");
  }
  return ctx;
}

export function useTeamOptional() {
  return useContext(TeamContext);
}

export function TeamCapabilitiesProvider({ children }) {
  const { isAuthenticated } = useAuth();
  const { canAccessRoute, loading: modulesLoading } = useModules();
  const moduleEnabled = canAccessRoute("/team");
  const [capabilities, setCapabilities] = useState(null);
  const [loading, setLoading] = useState(Boolean(isAuthenticated));
  const [error, setError] = useState(null);

  useEffect(() => {
    let alive = true;

    if (!isAuthenticated) {
      queueMicrotask(() => {
        if (!alive) return;
        setCapabilities(null);
        setError(null);
        setLoading(false);
      });
      return () => {
        alive = false;
      };
    }

    if (modulesLoading) {
      return () => {
        alive = false;
      };
    }

    if (!moduleEnabled) {
      queueMicrotask(() => {
        if (!alive) return;
        setCapabilities(null);
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
        const data = await getTeamCapabilities();
        if (!alive) return;
        setCapabilities(data);
        setError(null);
      } catch (err) {
        if (!alive) return;
        setCapabilities(null);
        setError(err.message || "Failed to load team access");
      } finally {
        if (alive) setLoading(false);
      }
    })();

    return () => {
      alive = false;
    };
  }, [isAuthenticated, moduleEnabled, modulesLoading]);

  const refetch = useCallback(async () => {
    if (!isAuthenticated || !moduleEnabled) return null;
    setLoading(true);
    setError(null);
    try {
      const data = await getTeamCapabilities();
      setCapabilities(data);
      return data;
    } catch (err) {
      setError(err.message || "Failed to load team access");
      return null;
    } finally {
      setLoading(false);
    }
  }, [isAuthenticated, moduleEnabled]);

  const isManager = Boolean(capabilities?.isManager);
  const canShowTeam = Boolean(moduleEnabled && isManager);

  const visibleApprovalTypes = useMemo(() => {
    if (!canShowTeam || !capabilities) return [];
    return TEAM_APPROVAL_TYPES.filter((item) =>
      canViewTeamType(capabilities, item.capabilityKey)
    );
  }, [canShowTeam, capabilities]);

  const value = useMemo(
    () => ({
      capabilities,
      loading: loading || modulesLoading,
      error,
      refetch,
      isManager,
      canShowTeam,
      visibleApprovalTypes,
      canViewType: (key) => {
        const type = TEAM_APPROVAL_TYPES.find((item) => item.key === key);
        return canViewTeamType(capabilities, type?.capabilityKey);
      },
      canApplyType: (key) => {
        const type = TEAM_APPROVAL_TYPES.find((item) => item.key === key);
        return canApplyTeamType(capabilities, type?.capabilityKey);
      },
    }),
    [
      capabilities,
      loading,
      modulesLoading,
      error,
      refetch,
      isManager,
      canShowTeam,
      visibleApprovalTypes,
    ]
  );

  return (
    <TeamContext.Provider value={value}>{children}</TeamContext.Provider>
  );
}
