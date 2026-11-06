"use client";

import { Suspense, useState } from "react";
import { useSearchParams } from "next/navigation";
import { ShiftSwapView } from "@/components/requests/ShiftSwapView";
import { useModules } from "@/components/modules/ModulesProvider";
import { ComingSoon } from "@/components/ui/ComingSoon";
import { PageLoader } from "@/components/ui/Spinner";
import { useCompanySettings } from "@/hooks/useCompanySettings";

function ShiftSwapContent() {
  const { canShowRequestTile, loading } = useModules();
  const { settings } = useCompanySettings();
  const searchParams = useSearchParams();
  const [openFormOnce] = useState(() => searchParams?.get("new") === "1");

  if (loading) {
    return <PageLoader label="Loading" hint="Checking shift swap access…" />;
  }

  if (!canShowRequestTile("shiftSwap")) {
    return (
      <ComingSoon
        title="Shift Swap"
        description="This request module is not enabled for your company."
      />
    );
  }

  return (
    <ShiftSwapView
      timeFormat={settings.timeFormat || "12h"}
      dateFormat={settings.dateFormat || "DD/MM/YYYY"}
      initialOpenForm={openFormOnce}
    />
  );
}

export default function ShiftSwapRequestPage() {
  return (
    <Suspense
      fallback={<PageLoader label="Loading" hint="Opening shift swap…" />}
    >
      <ShiftSwapContent />
    </Suspense>
  );
}
