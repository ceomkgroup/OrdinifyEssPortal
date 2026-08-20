"use client";

import { RequestComingSoon } from "@/components/requests/RequestComingSoon";
import { useModules } from "@/components/modules/ModulesProvider";
import { ComingSoon } from "@/components/ui/ComingSoon";
import { PageLoader } from "@/components/ui/Spinner";

export default function OnDutyRequestPage() {
  const { canShowRequestTile, loading } = useModules();

  if (loading) {
    return (
      <PageLoader label="Loading" hint="Checking on-duty access…" />
    );
  }

  if (!canShowRequestTile("onDuty")) {
    return (
      <ComingSoon
        title="On Duty"
        description="This request module is not enabled for your company."
      />
    );
  }

  return (
    <RequestComingSoon
      title="On Duty"
      description="Submit on-duty / outdoor duty requests."
    />
  );
}
