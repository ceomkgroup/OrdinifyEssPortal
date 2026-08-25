"use client";

import { HolidaysView } from "@/components/holidays/HolidaysView";
import { useModules } from "@/components/modules/ModulesProvider";
import { ComingSoon } from "@/components/ui/ComingSoon";
import { PageLoader } from "@/components/ui/Spinner";
import { useCompanySettings } from "@/hooks/useCompanySettings";

export default function HolidaysPage() {
  const { canAccessRoute, loading } = useModules();
  const { settings } = useCompanySettings();

  if (loading) {
    return (
      <PageLoader label="Loading" hint="Checking holidays access…" />
    );
  }

  if (!canAccessRoute("/holidays")) {
    return (
      <ComingSoon
        title="Holidays"
        description="Company holidays are not enabled for your company."
      />
    );
  }

  return (
    <HolidaysView dateFormat={settings.dateFormat || "DD/MM/YYYY"} />
  );
}
