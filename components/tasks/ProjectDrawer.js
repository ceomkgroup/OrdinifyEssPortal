"use client";

import { useEffect, useState } from "react";
import { UserMinus } from "lucide-react";
import { TeamRowMenu } from "@/components/team/TeamRowMenu";
import { Button } from "@/components/ui/Button";
import { SlideOver } from "@/components/ui/SlideOver";
import {
  addProjectMembers,
  createProject,
  listProjectMembers,
  removeProjectMember,
  updateProject,
} from "@/api/tasks";
import { personName, PROJECT_STATUSES } from "@/lib/task-labels";

const fieldClass =
  "h-10 w-full rounded-xl border border-[var(--border)] bg-[var(--surface)] px-3 text-[13px] font-medium text-[var(--text)] outline-none focus:border-[var(--violet)] focus:ring-2 focus:ring-[var(--lavender-soft)]";
const labelClass =
  "text-[11px] font-semibold uppercase tracking-wide text-[var(--muted)]";

export function ProjectDrawer({ open, project, members, onClose, onSaved }) {
  const editing = Boolean(project?.projectId);
  const [name, setName] = useState("");
  const [description, setDescription] = useState("");
  const [status, setStatus] = useState("active");
  const [selected, setSelected] = useState([]);
  const [currentMembers, setCurrentMembers] = useState([]);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState("");

  useEffect(() => {
    if (!open) return;
    setName(project?.projectName || "");
    setDescription(project?.description || "");
    setStatus(project?.bucket || project?.status || "active");
    setSelected([]);
    setError("");
    setCurrentMembers([]);
    if (!project?.projectId) return undefined;
    let alive = true;
    listProjectMembers(project.projectId)
      .then((rows) => {
        if (alive) setCurrentMembers(rows);
      })
      .catch((err) => {
        if (alive) setError(err.message || "Failed to load members");
      });
    return () => {
      alive = false;
    };
  }, [open, project]);

  const memberIds = new Set(
    currentMembers.map((row) => row.employeeId || row.employee?.employeeId)
  );
  const available = members.filter((member) => !memberIds.has(member.employeeId));

  async function submit(event) {
    event.preventDefault();
    if (!name.trim()) {
      setError("Project name is required.");
      return;
    }
    setSaving(true);
    setError("");
    try {
      if (!editing) {
        await createProject({
          projectName: name.trim(),
          description: description.trim() || undefined,
        });
      } else {
        await updateProject(project.projectId, {
          projectName: name.trim(),
          description: description.trim(),
          status,
        });
        if (selected.length) {
          await addProjectMembers(project.projectId, selected);
        }
      }
      onSaved?.();
      onClose?.();
    } catch (err) {
      setError(err.message || "Failed to save project");
    } finally {
      setSaving(false);
    }
  }

  async function removeMember(employeeId) {
    setError("");
    try {
      await removeProjectMember(project.projectId, employeeId);
      setCurrentMembers((rows) =>
        rows.filter(
          (row) => (row.employeeId || row.employee?.employeeId) !== employeeId
        )
      );
      onSaved?.();
    } catch (err) {
      setError(err.message || "Failed to remove member");
    }
  }

  return (
    <SlideOver
      open={open}
      wide
      title={editing ? "Edit project" : "New project"}
      subtitle={
        editing
          ? "Update the project and who on your team can work in it."
          : "You become a member automatically and can add your team afterwards."
      }
      onClose={onClose}
      footer={
        <div className="flex justify-end gap-2">
          <Button type="button" variant="outline" onClick={onClose} disabled={saving}>
            Cancel
          </Button>
          <Button type="submit" form="project-form" disabled={saving}>
            {saving ? "Saving…" : editing ? "Save project" : "Create project"}
          </Button>
        </div>
      }
    >
      <form id="project-form" className="space-y-4" onSubmit={submit}>
        {error ? (
          <p className="rounded-xl bg-[var(--danger-soft)] px-3 py-2 text-[12px] text-[var(--danger)]">
            {error}
          </p>
        ) : null}
        <label className="flex flex-col gap-1">
          <span className={labelClass}>Project name</span>
          <input
            className={fieldClass}
            value={name}
            placeholder="e.g. Website redesign"
            onChange={(e) => setName(e.target.value)}
          />
        </label>
        <label className="flex flex-col gap-1">
          <span className={labelClass}>Description</span>
          <textarea
            className="min-h-24 w-full rounded-xl border border-[var(--border)] bg-[var(--surface)] px-3 py-2 text-[13px] text-[var(--text)] outline-none focus:border-[var(--violet)] focus:ring-2 focus:ring-[var(--lavender-soft)]"
            value={description}
            placeholder="What is this project about? (optional)"
            onChange={(e) => setDescription(e.target.value)}
          />
        </label>
        {editing ? (
          <label className="flex flex-col gap-1">
            <span className={labelClass}>Status</span>
            <select
              className={fieldClass}
              value={status}
              onChange={(e) => setStatus(e.target.value)}
            >
              {PROJECT_STATUSES.map((item) => (
                <option key={item.value} value={item.value}>
                  {item.label}
                </option>
              ))}
            </select>
          </label>
        ) : null}
        {editing ? (
          <div className="space-y-2">
            <p className={labelClass}>Members</p>
            {currentMembers.length === 0 ? (
              <p className="text-[12px] text-[var(--muted)]">No members loaded yet.</p>
            ) : (
              <ul className="divide-y divide-[var(--border)] rounded-xl border border-[var(--border)]">
                {currentMembers.map((row) => {
                  const employee = row.employee || row;
                  const employeeId = row.employeeId || employee.employeeId;
                  return (
                    <li
                      key={employeeId}
                      className="flex items-center justify-between gap-2 px-3 py-2"
                    >
                      <div className="min-w-0">
                        <p className="truncate text-[13px] font-medium text-[var(--text)]">
                          {personName(employee)}
                        </p>
                        <p className="text-[11px] text-[var(--muted)]">
                          {row.isCreator ? "Creator" : "Member"}
                        </p>
                      </div>
                      {row.isCreator ? null : (
                        <TeamRowMenu
                          menuId={`member-${employeeId}`}
                          items={[
                            {
                              label: "Remove",
                              tone: "danger",
                              icon: <UserMinus className="h-4 w-4" />,
                              onClick: () => removeMember(employeeId),
                            },
                          ]}
                        />
                      )}
                    </li>
                  );
                })}
              </ul>
            )}
            <label className="flex flex-col gap-1">
              <span className={labelClass}>Add team members</span>
              <select
                multiple
                className="min-h-28 w-full rounded-xl border border-[var(--border)] bg-[var(--surface)] px-3 py-2 text-[13px] text-[var(--text)] outline-none focus:border-[var(--violet)]"
                value={selected}
                onChange={(e) =>
                  setSelected(Array.from(e.target.selectedOptions, (option) => option.value))
                }
              >
                {available.map((member) => (
                  <option key={member.employeeId} value={member.employeeId}>
                    {member.name || member.employeeName}
                  </option>
                ))}
              </select>
              <span className="text-[11px] text-[var(--muted)]">
                Hold Cmd or Ctrl to select more than one. Only your direct reports can be added.
              </span>
            </label>
          </div>
        ) : null}
      </form>
    </SlideOver>
  );
}
