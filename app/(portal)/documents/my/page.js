"use client";

import { Suspense } from "react";
import { MyDocumentsView } from "@/components/documents/MyDocumentsView";
import { useModules } from "@/components/modules/ModulesProvider";
import { ComingSoon } from "@/components/ui/ComingSoon";
import { PageLoader } from "@/components/ui/Spinner";
import { useCompanySettings } from "@/hooks/useCompanySettings";

function MyDocumentsContent() {
  const { canAccessRoute, loading } = useModules();
  const { settings } = useCompanySettings();

  if (loading) {
    return (
      <PageLoader label="Loading" hint="Checking documents access…" />
    );
  }

  if (!canAccessRoute("/documents/my")) {
    return (
      <ComingSoon
        title="My Documents"
        description="This module is not enabled for your company."
      />
    );
  }

  return (
    <MyDocumentsView
      dateFormat={settings.dateFormat || "DD/MM/YYYY"}
      timeFormat={settings.timeFormat || "12h"}
    />
  );
}

export default function MyDocumentsPage() {
  return (
    <Suspense
      fallback={
        <PageLoader label="Loading" hint="Opening my documents…" />
      }
    >
      <MyDocumentsContent />
    </Suspense>
  );
}
