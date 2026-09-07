"use client";

import { Suspense } from "react";
import { MyAssetsView } from "@/components/assets/MyAssetsView";
import { useModules } from "@/components/modules/ModulesProvider";
import { ComingSoon } from "@/components/ui/ComingSoon";
import { PageLoader } from "@/components/ui/Spinner";
import { useCompanySettings } from "@/hooks/useCompanySettings";

function MyAssetsContent() {
  const { canAccessRoute, loading } = useModules();
  const { settings } = useCompanySettings();

  if (loading) {
    return <PageLoader label="Loading" hint="Checking assets access…" />;
  }

  if (!canAccessRoute("/assets/my")) {
    return (
      <ComingSoon
        title="My Assets"
        description="This module is not enabled for your company."
      />
    );
  }

  return (
    <MyAssetsView
      dateFormat={settings.dateFormat || "DD/MM/YYYY"}
      timeFormat={settings.timeFormat || "12h"}
    />
  );
}

export default function MyAssetsPage() {
  return (
    <Suspense
      fallback={<PageLoader label="Loading" hint="Opening my assets…" />}
    >
      <MyAssetsContent />
    </Suspense>
  );
}
