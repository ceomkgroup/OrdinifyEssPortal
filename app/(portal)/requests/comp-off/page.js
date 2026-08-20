"use client";

import { RequestComingSoon } from "@/components/requests/RequestComingSoon";
import { useModules } from "@/components/modules/ModulesProvider";
import { ComingSoon } from "@/components/ui/ComingSoon";
import { PageLoader } from "@/components/ui/Spinner";

export default function CompOffRequestPage() {
  const { canShowRequestTile, loading } = useModules();

  if (loading) {
    return (
      <PageLoader label="Loading" hint="Checking comp-off access…" />
    );
  }

  if (!canShowRequestTile("compOff")) {
    return (
      <ComingSoon
        title="Comp Off"
        description="This request module is not enabled for your company."
      />
    );
  }

  return (
    <RequestComingSoon
      title="Comp Off"
      description="Request compensatory off for worked holidays or OT."
    />
  );
}
