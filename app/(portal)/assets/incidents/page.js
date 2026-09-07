"use client";

import { Suspense } from "react";
import { AssetIncidentsView } from "@/components/assets/AssetIncidentsView";
import { useModules } from "@/components/modules/ModulesProvider";
import { ComingSoon } from "@/components/ui/ComingSoon";
import { PageLoader } from "@/components/ui/Spinner";
import { useCompanySettings } from "@/hooks/useCompanySettings";

function IncidentsContent() {
  const { canAccessRoute, loading } = useModules();
  const { settings } = useCompanySettings();

  if (loading) {
    return <PageLoader label="Loading" hint="Checking incidents access…" />;
  }

  if (!canAccessRoute("/assets/incidents")) {
    return (
      <ComingSoon
        title="Asset Incidents"
        description="This module is not enabled for your company."
      />
    );
  }

  return (
    <AssetIncidentsView
      dateFormat={settings.dateFormat || "DD/MM/YYYY"}
      timeFormat={settings.timeFormat || "12h"}
    />
  );
}

export default function AssetIncidentsPage() {
  return (
    <Suspense
      fallback={<PageLoader label="Loading" hint="Opening incidents…" />}
    >
      <IncidentsContent />
    </Suspense>
  );
}
