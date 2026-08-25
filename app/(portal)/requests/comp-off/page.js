"use client";

import { CompOffView } from "@/components/requests/CompOffView";
import { useModules } from "@/components/modules/ModulesProvider";
import { ComingSoon } from "@/components/ui/ComingSoon";
import { PageLoader } from "@/components/ui/Spinner";
import { useCompanySettings } from "@/hooks/useCompanySettings";

export default function CompOffRequestPage() {
  const { canShowRequestTile, loading } = useModules();
  const { settings } = useCompanySettings();

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
    <CompOffView
      timeFormat={settings.timeFormat || "12h"}
      dateFormat={settings.dateFormat || "DD/MM/YYYY"}
    />
  );
}
