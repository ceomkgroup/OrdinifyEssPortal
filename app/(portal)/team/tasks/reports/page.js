"use client";

import { TaskReportsView } from "@/components/tasks/TaskReportsView";
import { TeamGate } from "@/components/team/TeamGate";

export default function TeamTaskReportsPage() {
  return (
    <TeamGate title="Task reports">
      <TaskReportsView />
    </TeamGate>
  );
}
