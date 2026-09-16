"use client";

import { TeamMembersView } from "@/components/team/TeamMembersView";
import { TeamGate } from "@/components/team/TeamGate";

export default function TeamPage() {
  return (
    <TeamGate title="Team">
      <TeamMembersView />
    </TeamGate>
  );
}
