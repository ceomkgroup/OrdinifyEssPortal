"use client";

import { TeamApprovalsView } from "@/components/team/TeamApprovalsView";
import { TeamGate } from "@/components/team/TeamGate";
import { useTeam } from "@/components/team/TeamCapabilitiesProvider";
import { ComingSoon } from "@/components/ui/ComingSoon";
import { Inbox } from "lucide-react";

export default function TeamRequestsPage() {
  const { visibleApprovalTypes, loading, canShowTeam } = useTeam();

  return (
    <TeamGate title="Team approvals">
      {!loading && canShowTeam && visibleApprovalTypes.length === 0 ? (
        <ComingSoon
          title="Team approvals"
          description="You are a manager, but no approval types are enabled for you yet."
          icon={Inbox}
        />
      ) : (
        <TeamApprovalsView />
      )}
    </TeamGate>
  );
}
