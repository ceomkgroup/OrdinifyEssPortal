"use client";

import { LoansView } from "@/components/requests/LoansView";
import { useModules } from "@/components/modules/ModulesProvider";
import { ComingSoon } from "@/components/ui/ComingSoon";
import { PageLoader } from "@/components/ui/Spinner";
import { useCompanySettings } from "@/hooks/useCompanySettings";

export default function LoansRequestPage() {
  const { canShowRequestTile, loading } = useModules();
  const { settings } = useCompanySettings();

  if (loading) {
    return (
      <PageLoader label="Loading" hint="Checking loans access…" />
    );
  }

  if (!canShowRequestTile("loans")) {
    return (
      <ComingSoon
        title="Loans"
        description="This request module is not enabled for your company."
      />
    );
  }

  return (
    <LoansView
      timeFormat={settings.timeFormat || "12h"}
      dateFormat={settings.dateFormat || "DD/MM/YYYY"}
      currency={settings.currency || "PKR"}
    />
  );
}
