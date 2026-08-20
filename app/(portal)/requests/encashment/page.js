"use client";

import { LeaveView } from "@/components/leave/LeaveView";
import { useModules } from "@/components/modules/ModulesProvider";
import { ComingSoon } from "@/components/ui/ComingSoon";
import { PageLoader } from "@/components/ui/Spinner";

export default function EncashmentRequestPage() {
  const { canShowRequestTile, loading } = useModules();

  if (loading) {
    return (
      <PageLoader
        label="Loading encashment"
        hint="Checking encashment access…"
      />
    );
  }

  if (!canShowRequestTile("encashment")) {
    return (
      <ComingSoon
        title="Leave Encashment"
        description="Leave encashment is not enabled for your company."
      />
    );
  }

  return <LeaveView initialTab="encashment" />;
}
