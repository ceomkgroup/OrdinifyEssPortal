"use client";

import { useCallback, useEffect, useState } from "react";
import {
  getPortalProfile,
  updatePortalProfile,
  uploadPortalProfilePhoto,
} from "@/api/portal";

export function usePortalProfile() {
  const [profile, setProfile] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  const refetch = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const data = await getPortalProfile();
      setProfile(data);
      return data;
    } catch (err) {
      setError(err.message || "Failed to load profile");
      return null;
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    let alive = true;
    (async () => {
      try {
        const data = await getPortalProfile();
        if (!alive) return;
        setProfile(data);
        setError(null);
      } catch (err) {
        if (!alive) return;
        setError(err.message || "Failed to load profile");
      } finally {
        if (alive) setLoading(false);
      }
    })();
    return () => {
      alive = false;
    };
  }, []);

  const update = useCallback(async (payload) => {
    const data = await updatePortalProfile(payload);
    setProfile((prev) => ({ ...(prev || {}), ...(data || {}) }));
    return data;
  }, []);

  const uploadPhoto = useCallback(async (file) => {
    const data = await uploadPortalProfilePhoto(
      file,
      profile?.employeeId || profile?.id || undefined
    );
    setProfile((prev) => ({ ...(prev || {}), ...(data || {}) }));
    return data;
  }, [profile?.employeeId, profile?.id]);

  return {
    profile,
    loading,
    error,
    refetch,
    update,
    uploadPhoto,
    setProfile,
  };
}
