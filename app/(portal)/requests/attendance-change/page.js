"use client";

import { Suspense } from "react";
import { AttendanceChangeView } from "@/components/requests/AttendanceChangeView";
import { useModules } from "@/components/modules/ModulesProvider";
import { ComingSoon } from "@/components/ui/ComingSoon";
import { Spinner } from "@/components/ui/Spinner";
import { useDashboard } from "@/hooks/useDashboard";

function AttendanceChangeContent() {
  const { hasScreen } = useModules();
  const { data } = useDashboard();
  const settings = data?.companySettings || {};

  if (!hasScreen("attendanceChange")) {
    return (
      <ComingSoon
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
    <Suspense
      fallback={
        <div className="flex min-h-[40vh] items-center justify-center">
          <Spinner />
        </div>
      }
    >
      <AttendanceChangeContent />
    </Suspense>
  );
}
