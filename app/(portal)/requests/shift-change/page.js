"use client";

import { Suspense, useState } from "react";
import { useSearchParams } from "next/navigation";
import { ShiftChangeView } from "@/components/requests/ShiftChangeView";
import { useModules } from "@/components/modules/ModulesProvider";
import { ComingSoon } from "@/components/ui/ComingSoon";
import { PageLoader } from "@/components/ui/Spinner";
import { useDashboard } from "@/hooks/useDashboard";

function ShiftChangeContent() {
  const { canShowRequestTile, loading } = useModules();
  const { data } = useDashboard();
  const searchParams = useSearchParams();
  const settings = data?.companySettings || {};
  // Capture once — avoid URL replace remounts that re-fire all APIs
  const [openFormOnce] = useState(
    () => searchParams?.get("new") === "1"
  );

  if (loading) {
    return (
      <PageLoader label="Loading" hint="Checking shift change access…" />
    );
  }

  if (!canShowRequestTile("shiftChange")) {
    return (
      <ComingSoon
        title="Shift Change"
        description="This request module is not enabled for your company."
      />
    );
  }

  return (
    <ShiftChangeView
      timeFormat={settings.timeFormat || "12h"}
      dateFormat={settings.dateFormat || "DD/MM/YYYY"}
      initialOpenForm={openFormOnce}
    />
  );
}

export default function ShiftChangeRequestPage() {
  return (
    <Suspense
      fallback={
        <PageLoader label="Loading" hint="Opening shift change…" />
      }
    >
      <ShiftChangeContent />
    </Suspense>
  );
}
