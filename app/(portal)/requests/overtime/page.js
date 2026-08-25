"use client";

import { OvertimeView } from "@/components/requests/OvertimeView";
import { useModules } from "@/components/modules/ModulesProvider";
import { ComingSoon } from "@/components/ui/ComingSoon";
import { PageLoader } from "@/components/ui/Spinner";
import { useCompanySettings } from "@/hooks/useCompanySettings";

export default function OvertimeRequestPage() {
  const { canShowRequestTile, loading } = useModules();
  const { settings } = useCompanySettings();

  if (loading) {
    return (
      <PageLoader label="Loading" hint="Checking overtime access…" />
    );
  }

  if (!canShowRequestTile("overtime")) {
    return (
      <ComingSoon
        title="Overtime"
        description="This request module is not enabled for your company."
      />
    );
  }

  return (
    <OvertimeView
      timeFormat={settings.timeFormat || "12h"}
      dateFormat={settings.dateFormat || "DD/MM/YYYY"}
    />
  );
}
