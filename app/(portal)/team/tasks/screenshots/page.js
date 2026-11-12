"use client";

import { ScreenshotsView } from "@/components/tasks/ScreenshotsView";
import { TeamGate } from "@/components/team/TeamGate";

export default function TeamScreenshotsPage() {
  return (
    <TeamGate title="Screenshots">
      <ScreenshotsView />
    </TeamGate>
  );
}
