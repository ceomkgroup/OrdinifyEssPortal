"use client";

import { AdvancesView } from "@/components/requests/AdvancesView";
import { useModules } from "@/components/modules/ModulesProvider";
import { ComingSoon } from "@/components/ui/ComingSoon";
import { PageLoader } from "@/components/ui/Spinner";
import { useCompanySettings } from "@/hooks/useCompanySettings";

export default function AdvancesRequestPage() {
  const { canShowRequestTile, loading } = useModules();
  const { settings } = useCompanySettings();

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
    <AdvancesView
      timeFormat={settings.timeFormat || "12h"}
      dateFormat={settings.dateFormat || "DD/MM/YYYY"}
      currency={settings.currency || "PKR"}
    />
  );
}
