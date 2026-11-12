"use client";

import { TasksWorkspace } from "@/components/tasks/TasksWorkspace";
import { TeamGate } from "@/components/team/TeamGate";

export default function TeamTasksPage() {
  return (
    <TeamGate title="Team tasks">
      <TasksWorkspace scope="team" />
    </TeamGate>
  );
}
