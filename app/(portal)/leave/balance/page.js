"use client";

import { LeaveView } from "@/components/leave/LeaveView";
import { useModules } from "@/components/modules/ModulesProvider";
import { ComingSoon } from "@/components/ui/ComingSoon";
import { PageLoader } from "@/components/ui/Spinner";

export default function LeaveBalancePage() {
  const { canShowLeaveTile, loading } = useModules();

  if (loading) {
    return (
      <PageLoader
        label="Loading leave balance"
        hint="Checking leave module access…"
      />
    );
  }

  if (!canShowLeaveTile("leaveBalance")) {
    return (
      <ComingSoon
        title="Leave Balance"
        description="Leave module is not enabled for your company."
      />
    );
  }

  return <LeaveView section="balance" />;
}
