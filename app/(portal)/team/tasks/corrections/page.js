"use client";

import { TimeCorrectionsView } from "@/components/tasks/TimeCorrectionsView";
import { TeamGate } from "@/components/team/TeamGate";

export default function TeamTimeCorrectionsPage() {
  return (
    <TeamGate title="Time corrections">
      <TimeCorrectionsView />
    </TeamGate>
  );
}
