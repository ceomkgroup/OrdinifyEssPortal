"use client";

import { LeaveView } from "@/components/leave/LeaveView";
import { useModules } from "@/components/modules/ModulesProvider";
import { ComingSoon } from "@/components/ui/ComingSoon";
import { PageLoader } from "@/components/ui/Spinner";

export default function LeaveLogsPage() {
  const { canShowLeaveTile, loading } = useModules();

  if (loading) {
    return (
      <PageLoader label="Loading leave" hint="Checking leave module access…" />
    );
  }

  if (!canShowLeaveTile("leaveLogs")) {
    return (
      <ComingSoon
        title="Leave Logs"
        description="Leave module is not enabled for your company."
      />
    );
  }

  return <LeaveView section="logs" />;
}
