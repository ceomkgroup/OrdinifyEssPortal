"use client";

import { RequestComingSoon } from "@/components/requests/RequestComingSoon";
import { useModules } from "@/components/modules/ModulesProvider";
import { ComingSoon } from "@/components/ui/ComingSoon";
import { PageLoader } from "@/components/ui/Spinner";

export default function AdvancesRequestPage() {
  const { canShowRequestTile, loading } = useModules();

  if (loading) {
    return (
      <PageLoader label="Loading" hint="Checking advances access…" />
    );
  }

  if (!canShowRequestTile("advances")) {
    return (
      <ComingSoon
        title="Advances"
        description="This request module is not enabled for your company."
      />
    );
  }

  return (
    <RequestComingSoon
      title="Advances"
      description="Request salary advances."
    />
  );
}
