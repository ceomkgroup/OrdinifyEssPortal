"use client";

import { TeamAttendanceView } from "@/components/team/TeamAttendanceView";
import { TeamGate } from "@/components/team/TeamGate";

export default function TeamAttendancePage() {
  return (
    <TeamGate title="Attendance log">
      <TeamAttendanceView section="logs" />
    </TeamGate>
  );
}
