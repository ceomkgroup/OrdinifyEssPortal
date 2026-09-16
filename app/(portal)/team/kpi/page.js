"use client";

import { TeamKpiView } from "@/components/team/TeamKpiView";
import { TeamGate } from "@/components/team/TeamGate";

export default function TeamKpiPage() {
  return (
    <TeamGate title="Team KPI">
      <TeamKpiView />
    </TeamGate>
  );
}
