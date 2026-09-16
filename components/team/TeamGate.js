"use client";

import { useTeam } from "@/components/team/TeamCapabilitiesProvider";
import { ComingSoon } from "@/components/ui/ComingSoon";
import { PageLoader } from "@/components/ui/Spinner";

export function TeamGate({ title, children }) {
  const { canShowTeam, loading, isManager } = useTeam();

  if (loading) {
    return (
      <PageLoader
        label="Loading team"
        hint="Checking manager access…"
      />
    );
  }

  if (!canShowTeam) {
    return (
      <ComingSoon
        title={title || "Team"}
        description={
          isManager
            ? "Team is not enabled for your company."
            : "Team is only available if you have direct reports."
        }
      />
    );
  }

  return children;
}
