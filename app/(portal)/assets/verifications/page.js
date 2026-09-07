"use client";

import { Suspense } from "react";
import { AssetVerificationsView } from "@/components/assets/AssetVerificationsView";
import { useModules } from "@/components/modules/ModulesProvider";
import { ComingSoon } from "@/components/ui/ComingSoon";
import { PageLoader } from "@/components/ui/Spinner";
import { useCompanySettings } from "@/hooks/useCompanySettings";

function VerificationsContent() {
  const { canAccessRoute, loading } = useModules();
  const { settings } = useCompanySettings();

  if (loading) {
    return (
      <PageLoader label="Loading" hint="Checking verifications access…" />
    );
  }

  if (!canAccessRoute("/assets/verifications")) {
    return (
      <ComingSoon
        title="Asset Verifications"
        description="This module is not enabled for your company."
      />
    );
  }

  return (
    <AssetVerificationsView
      dateFormat={settings.dateFormat || "DD/MM/YYYY"}
      timeFormat={settings.timeFormat || "12h"}
    />
  );
}

export default function AssetVerificationsPage() {
  return (
    <Suspense
      fallback={
        <PageLoader label="Loading" hint="Opening verifications…" />
      }
    >
      <VerificationsContent />
    </Suspense>
  );
}
