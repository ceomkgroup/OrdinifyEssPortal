"use client";

import { Suspense } from "react";
import { CompanyDocumentsView } from "@/components/documents/CompanyDocumentsView";
import { useModules } from "@/components/modules/ModulesProvider";
import { ComingSoon } from "@/components/ui/ComingSoon";
import { PageLoader } from "@/components/ui/Spinner";
import { useCompanySettings } from "@/hooks/useCompanySettings";

function CompanyDocumentsContent() {
  const { canAccessRoute, loading } = useModules();
  const { settings } = useCompanySettings();

  if (loading) {
    return (
      <PageLoader
        label="Loading"
        hint="Checking company documents access…"
      />
    );
  }

  if (!canAccessRoute("/documents/company")) {
    return (
      <ComingSoon
        title="Company Documents"
        description="This module is not enabled for your company."
      />
    );
  }

  return (
    <CompanyDocumentsView
      dateFormat={settings.dateFormat || "DD/MM/YYYY"}
      timeFormat={settings.timeFormat || "12h"}
    />
  );
}

export default function CompanyDocumentsPage() {
  return (
    <Suspense
      fallback={
        <PageLoader label="Loading" hint="Opening company documents…" />
      }
    >
      <CompanyDocumentsContent />
    </Suspense>
  );
}
