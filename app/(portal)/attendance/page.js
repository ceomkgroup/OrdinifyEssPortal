"use client";

import { Suspense } from "react";
import { AttendanceView } from "@/components/attendance/AttendanceView";
import { PageLoader } from "@/components/ui/Spinner";

export default function AttendancePage() {
  return (
    <Suspense
      fallback={
        <PageLoader label="Loading attendance" hint="Opening attendance…" />
      }
    >
      <AttendanceView />
    </Suspense>
  );
}
