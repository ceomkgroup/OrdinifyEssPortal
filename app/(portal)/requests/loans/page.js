"use client";

import { RequestComingSoon } from "@/components/requests/RequestComingSoon";
import { useModules } from "@/components/modules/ModulesProvider";
import { ComingSoon } from "@/components/ui/ComingSoon";
import { PageLoader } from "@/components/ui/Spinner";

export default function LoansRequestPage() {
  const { canShowRequestTile, loading } = useModules();

  if (loading) {
    return (
      <PageLoader label="Loading" hint="Checking loans access…" />
    );
  }

  if (!canShowRequestTile("loans")) {
    return (
      <ComingSoon
        title="Loans"
        description="This request module is not enabled for your company."
      />
    );
  }

  return (
    <RequestComingSoon
      title="Loans"
      description="Apply for employee loan requests."
    />
  );
}
