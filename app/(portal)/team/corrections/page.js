"use client";

import { TeamAttendanceView } from "@/components/team/TeamAttendanceView";
import { TeamGate } from "@/components/team/TeamGate";

export default function TeamCorrectionsPage() {
  return (
    <TeamGate title="Corrections">
      <TeamAttendanceView section="corrections" />
    </TeamGate>
  );
}
