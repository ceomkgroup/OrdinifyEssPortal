"use client";

import { RequestComingSoon } from "@/components/requests/RequestComingSoon";
import { useModules } from "@/components/modules/ModulesProvider";
import { ComingSoon } from "@/components/ui/ComingSoon";
import { PageLoader } from "@/components/ui/Spinner";

export default function WfhRequestPage() {
  const { canShowRequestTile, loading } = useModules();

  if (loading) {
    return (
      <PageLoader label="Loading" hint="Checking WFH request access…" />
    );
  }

  if (!canShowRequestTile("wfh")) {
    return (
      <ComingSoon
        title="WFH Request"
        description="This request module is not enabled for your company."
      />
    );
  }

  return (
    <RequestComingSoon
      title="WFH Request"
      description="Apply for work-from-home days."
    />
  );
}
