"use client";

import { RequestComingSoon } from "@/components/requests/RequestComingSoon";
import { useModules } from "@/components/modules/ModulesProvider";
import { ComingSoon } from "@/components/ui/ComingSoon";
import { PageLoader } from "@/components/ui/Spinner";

export default function ShiftChangeRequestPage() {
  const { canShowRequestTile, loading } = useModules();

  if (loading) {
    return (
      <PageLoader label="Loading" hint="Checking shift change access…" />
    );
  }

  if (!canShowRequestTile("shiftChange")) {
    return (
      <ComingSoon
        title="Shift Change"
        description="This request module is not enabled for your company."
      />
    );
  }

  return (
    <RequestComingSoon
      title="Shift Change"
      description="Request a change to your assigned shift."
    />
  );
}
