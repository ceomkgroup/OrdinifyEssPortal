"use client";

import { WfhView } from "@/components/requests/WfhView";
import { useModules } from "@/components/modules/ModulesProvider";
import { ComingSoon } from "@/components/ui/ComingSoon";
import { PageLoader } from "@/components/ui/Spinner";
import { useCompanySettings } from "@/hooks/useCompanySettings";

export default function WfhRequestPage() {
  const { canShowRequestTile, loading } = useModules();
  const { settings } = useCompanySettings();

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
    <WfhView
      timeFormat={settings.timeFormat || "12h"}
      dateFormat={settings.dateFormat || "DD/MM/YYYY"}
    />
  );
}
