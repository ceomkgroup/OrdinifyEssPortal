"use client";

import { Suspense } from "react";
import { AttendanceChangeView } from "@/components/requests/AttendanceChangeView";
import { useModules } from "@/components/modules/ModulesProvider";
import { ComingSoon } from "@/components/ui/ComingSoon";
import { PageLoader } from "@/components/ui/Spinner";
import { useCompanySettings } from "@/hooks/useCompanySettings";

function AttendanceChangeContent() {
  const { hasScreen } = useModules();
  const { settings } = useCompanySettings();

  if (!hasScreen("attendanceChange")) {
    return (
      <ComingSoon
        badge="Unavailable"
        title="Attendance Change"
        description="Attendance change is not enabled for your company."
      />
    );
  }

  return (
    <AttendanceChangeView
      timeFormat={settings.timeFormat || "12h"}
      dateFormat={settings.dateFormat || "DD/MM/YYYY"}
    />
  );
}

export default function AttendanceChangePage() {
  return (
    <Suspense fallback={<PageLoader label="Loading" hint="Opening attendance change…" />}>
      <AttendanceChangeContent />
    </Suspense>
  );
}
