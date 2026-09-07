"use client";

import { ExpenseClaimsView } from "@/components/requests/ExpenseClaimsView";
import { useModules } from "@/components/modules/ModulesProvider";
import { ComingSoon } from "@/components/ui/ComingSoon";
import { PageLoader } from "@/components/ui/Spinner";
import { useCompanySettings } from "@/hooks/useCompanySettings";

export default function ExpenseClaimsRequestPage() {
  const { canShowRequestTile, loading } = useModules();
  const { settings } = useCompanySettings();

  if (loading) {
    return (
      <PageLoader label="Loading" hint="Checking expense claims access…" />
    );
  }

  if (!canShowRequestTile("expenseClaims")) {
    return (
      <ComingSoon
        title="Expense Claims"
        description="This request module is not enabled for your company."
      />
    );
  }

  return (
    <ExpenseClaimsView
      timeFormat={settings.timeFormat || "12h"}
      dateFormat={settings.dateFormat || "DD/MM/YYYY"}
      currency={settings.currency || "PKR"}
    />
  );
}
