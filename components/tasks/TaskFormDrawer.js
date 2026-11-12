"use client";

import { useEffect, useState } from "react";
import { Button } from "@/components/ui/Button";
import { FilterDate } from "@/components/ui/ListFilters";
import { SlideOver } from "@/components/ui/SlideOver";
import { createTask } from "@/api/tasks";
import { TASK_PRIORITIES, toIsoDate } from "@/lib/task-labels";

const fieldClass =
  "h-10 w-full rounded-xl border border-[var(--border)] bg-[var(--surface)] px-3 text-[13px] font-medium text-[var(--text)] outline-none focus:border-[var(--violet)] focus:ring-2 focus:ring-[var(--lavender-soft)]";
const labelClass =
  "text-[11px] font-semibold uppercase tracking-wide text-[var(--muted)]";

const EMPTY = {
  title: "",
  projectId: "",
  assignedToEmployeeId: "",
  description: "",
  priority: "medium",
  dueDate: "",
};

export function TaskFormDrawer({
  open,
  scope,
  projects,
  members,
  onClose,
  onCreated,
}) {
  const [form, setForm] = useState(EMPTY);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState("");

  useEffect(() => {
    if (!open) return;
    setForm(EMPTY);
    setError("");
  }, [open]);

  function set(key, value) {
    setForm((prev) => ({ ...prev, [key]: value }));
  }

  async function submit(event) {
    event.preventDefault();
    if (!form.title.trim()) {
      setError("Task name is required.");
      return;
    }
    if (!form.projectId) {
      setError("Select a project.");
      return;
    }
    if (scope === "team" && !form.assignedToEmployeeId) {
      setError("Select a team member.");
      return;
    }
    setSaving(true);
    setError("");
    try {
      const created = await createTask({
        projectId: form.projectId,
        title: form.title.trim(),
        description: form.description.trim() || undefined,
        priority: form.priority || "medium",
        dueDate: toIsoDate(form.dueDate),
        assignedToEmployeeId:
          scope === "team" ? form.assignedToEmployeeId : undefined,
      });
      onCreated?.(created);
      onClose?.();
    } catch (err) {
      setError(err.message || "Failed to create task");
    } finally {
      setSaving(false);
    }
  }

  return (
    <SlideOver
      open={open}
      title={scope === "team" ? "Assign task" : "New task"}
      subtitle={
        scope === "team"
          ? "Give a task to someone who reports to you. They are added to the project."
          : "Add a task for yourself in one of your projects."
      }
      onClose={onClose}
      footer={
        <div className="flex justify-end gap-2">
          <Button type="button" variant="outline" onClick={onClose} disabled={saving}>
            Cancel
          </Button>
          <Button type="submit" form="task-form" disabled={saving}>
            {saving ? "Saving…" : scope === "team" ? "Assign task" : "Create task"}
          </Button>
        </div>
      }
    >
      <form id="task-form" className="space-y-3" onSubmit={submit}>
        {error ? (
          <p className="rounded-xl bg-[var(--danger-soft)] px-3 py-2 text-[12px] text-[var(--danger)]">
            {error}
          </p>
        ) : null}
        <label className="flex flex-col gap-1">
          <span className={labelClass}>Task name</span>
          <input
            className={fieldClass}
            value={form.title}
            placeholder="e.g. Design the login screen"
            onChange={(e) => set("title", e.target.value)}
          />
        </label>
        <label className="flex flex-col gap-1">
          <span className={labelClass}>Project</span>
          <select
            className={fieldClass}
            value={form.projectId}
            onChange={(e) => set("projectId", e.target.value)}
          >
            <option value="">Select a project</option>
            {projects.map((project) => (
              <option key={project.projectId} value={project.projectId}>
                {project.projectName}
              </option>
            ))}
          </select>
          {projects.length === 0 ? (
            <span className="text-[11px] text-[var(--muted)]">
              You aren&apos;t a member of any active project yet.
            </span>
          ) : null}
        </label>
        {scope === "team" ? (
          <label className="flex flex-col gap-1">
            <span className={labelClass}>Assign to</span>
            <select
              className={fieldClass}
              value={form.assignedToEmployeeId}
              onChange={(e) => set("assignedToEmployeeId", e.target.value)}
            >
              <option value="">Select a team member</option>
              {members.map((member) => (
                <option key={member.employeeId} value={member.employeeId}>
                  {member.name || member.employeeName}
                </option>
              ))}
            </select>
            <span className="text-[11px] text-[var(--muted)]">
              Only people who report to you are listed.
            </span>
          </label>
        ) : null}
        <label className="flex flex-col gap-1">
          <span className={labelClass}>Description</span>
          <textarea
            className="min-h-24 w-full rounded-xl border border-[var(--border)] bg-[var(--surface)] px-3 py-2 text-[13px] text-[var(--text)] outline-none focus:border-[var(--violet)] focus:ring-2 focus:ring-[var(--lavender-soft)]"
            value={form.description}
            placeholder="Details, links or acceptance notes (optional)"
            onChange={(e) => set("description", e.target.value)}
          />
        </label>
        <div className="grid grid-cols-2 gap-3">
          <label className="flex flex-col gap-1">
            <span className={labelClass}>Priority</span>
            <select
              className={fieldClass}
              value={form.priority}
              onChange={(e) => set("priority", e.target.value)}
            >
              {TASK_PRIORITIES.map((item) => (
                <option key={item.value} value={item.value}>
                  {item.label}
                </option>
              ))}
            </select>
          </label>
          <FilterDate
            label="Due date"
            value={form.dueDate}
            onChange={(value) => set("dueDate", value)}
            clearable
          />
        </div>
      </form>
    </SlideOver>
  );
}
