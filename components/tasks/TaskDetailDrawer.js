"use client";

import { useEffect, useRef, useState } from "react";
import {
  Calendar,
  CheckSquare,
  Clock3,
  ExternalLink,
  ListChecks,
  MessageSquare,
  Paperclip,
  Trash2,
  UserRound,
} from "lucide-react";
import { TeamRowMenu } from "@/components/team/TeamRowMenu";
import { Button } from "@/components/ui/Button";
import { SlideOver } from "@/components/ui/SlideOver";
import { useAuth } from "@/components/auth/AuthProvider";
import {
  addChecklistItem,
  addTaskComment,
  deleteChecklistItem,
  deleteTaskAttachment,
  getAttachmentDownload,
  getTask,
  requestTimeCorrection,
  startTaskTimer,
  stopTaskTimer,
  updateChecklistItem,
  updateTaskStatus,
  uploadTaskAttachment,
} from "@/api/tasks";
import { formatDate, formatDateTime } from "@/lib/format";
import {
  formatTracked,
  personName,
  priorityLabel,
  statusMeta,
  TASK_STATUSES,
} from "@/lib/task-labels";

const fieldClass =
  "h-10 w-full rounded-xl border border-[var(--border)] bg-[var(--surface)] px-3 text-[13px] font-medium text-[var(--text)] outline-none focus:border-[var(--violet)] focus:ring-2 focus:ring-[var(--lavender-soft)]";

export function TaskDetailDrawer({ open, taskId, focus, onClose, onChanged }) {
  const { employee } = useAuth();
  const commentsRef = useRef(null);
  const [task, setTask] = useState(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [checkText, setCheckText] = useState("");
  const [comment, setComment] = useState("");
  const [showCorrection, setShowCorrection] = useState(false);
  const [correction, setCorrection] = useState({
    type: "add",
    timeLogId: "",
    startedAt: "",
    endedAt: "",
    reason: "",
  });

  useEffect(() => {
    if (!open || !taskId) return undefined;
    let alive = true;
    setLoading(true);
    setError("");
    setShowCorrection(false);
    getTask(taskId)
      .then((row) => {
        if (alive) setTask(row);
      })
      .catch((err) => {
        if (alive) setError(err.message || "Failed to load task");
      })
      .finally(() => {
        if (alive) setLoading(false);
      });
    return () => {
      alive = false;
    };
  }, [open, taskId]);

  useEffect(() => {
    if (!open || loading || focus !== "comments") return undefined;
    const frame = requestAnimationFrame(() => {
      commentsRef.current?.scrollIntoView({ block: "start" });
    });
    return () => cancelAnimationFrame(frame);
  }, [open, loading, focus, task?.taskId]);

  const locked = task?.status === "done";
  const isAssignee =
    task &&
    employee?.employeeId &&
    task.assignedToEmployeeId === employee.employeeId;
  const status = statusMeta(task?.status);

  async function reload() {
    const row = await getTask(taskId);
    setTask(row);
    onChanged?.();
    return row;
  }

  async function run(action) {
    setError("");
    try {
      await action();
      await reload();
    } catch (err) {
      setError(err.message || "Something went wrong");
    }
  }

  return (
    <SlideOver
      open={open}
      wide
      title={task?.title || "Task"}
      subtitle={task?.projectName || "Task details"}
      onClose={onClose}
      footer={
        <div className="flex justify-end">
          <Button type="button" variant="outline" onClick={onClose}>
            Close
          </Button>
        </div>
      }
    >
      {loading ? <p className="text-[13px] text-[var(--muted)]">Loading task…</p> : null}
      {error ? (
        <p className="mb-3 rounded-xl bg-[var(--danger-soft)] px-3 py-2 text-[12px] text-[var(--danger)]">
          {error}
        </p>
      ) : null}
      {task ? (
        <div className="space-y-3">
          <div className="flex flex-wrap gap-1.5">
            <span className="inline-flex items-center rounded-full bg-[var(--lavender-soft)] px-2.5 py-1 text-[11px] font-semibold text-[var(--violet)]">
              {status.label}
            </span>
            <span className="inline-flex items-center rounded-full bg-[var(--panel-soft)] px-2.5 py-1 text-[11px] font-semibold text-[var(--text)]">
              {priorityLabel(task.priority)}
            </span>
            <span className="inline-flex items-center gap-1 rounded-full bg-[var(--panel-soft)] px-2.5 py-1 text-[11px] font-semibold text-[var(--text)]">
              <UserRound className="h-3 w-3" />
              {task.assigneeName || "You"}
            </span>
            <span className="inline-flex items-center gap-1 rounded-full bg-[var(--panel-soft)] px-2.5 py-1 text-[11px] font-semibold text-[var(--text)]">
              <Calendar className="h-3 w-3" />
              Due {formatDate(task.dueDate)}
            </span>
          </div>

          <Section icon={ListChecks} title="Overview">
            <p className="text-[13px] text-[var(--text)]">
              {task.description || "No description."}
            </p>
          </Section>

          <Section icon={CheckSquare} title="Status">
            <div className="flex flex-wrap gap-1.5">
              {TASK_STATUSES.map((item) => {
                const active = task.status === item.value;
                return (
                  <button
                    key={item.value}
                    type="button"
                    disabled={locked || active}
                    onClick={() => run(() => updateTaskStatus(task.taskId, item.value))}
                    className={`rounded-full px-3 py-1 text-[12px] font-semibold ${
                      active
                        ? "bg-[var(--violet)] text-white"
                        : "bg-[var(--panel-soft)] text-[var(--muted)] hover:text-[var(--text)]"
                    } disabled:cursor-default`}
                  >
                    {item.label}
                  </button>
                );
              })}
            </div>
            {locked ? (
              <p className="mt-2 text-[12px] text-[var(--muted)]">
                Completed tasks can no longer be changed.
              </p>
            ) : null}
          </Section>

          <Section icon={ListChecks} title="Checklist">
            {task.checklistItems.length === 0 ? (
              <p className="text-[13px] text-[var(--muted)]">No checklist items.</p>
            ) : (
              <ul className="space-y-1">
                {task.checklistItems.map((item) => (
                  <li key={item.itemId} className="flex items-center gap-2">
                    <input
                      type="checkbox"
                      checked={Boolean(item.isDone)}
                      disabled={locked}
                      onChange={() =>
                        run(() =>
                          updateChecklistItem(task.taskId, item.itemId, {
                            isDone: !item.isDone,
                          })
                        )
                      }
                    />
                    <span
                      className={`min-w-0 flex-1 text-[13px] ${
                        item.isDone ? "text-[var(--muted)] line-through" : "text-[var(--text)]"
                      }`}
                    >
                      {item.title}
                    </span>
                    {locked ? null : (
                      <TeamRowMenu
                        menuId={`check-${item.itemId}`}
                        items={[
                          {
                            label: "Delete",
                            tone: "danger",
                            icon: <Trash2 className="h-4 w-4" />,
                            onClick: () => run(() => deleteChecklistItem(task.taskId, item.itemId)),
                          },
                        ]}
                      />
                    )}
                  </li>
                ))}
              </ul>
            )}
            {locked ? null : (
              <div className="mt-2 flex gap-2">
                <input
                  className={fieldClass}
                  value={checkText}
                  placeholder="Add a checklist item..."
                  onChange={(event) => setCheckText(event.target.value)}
                />
                <Button
                  type="button"
                  variant="outline"
                  onClick={() => {
                    const next = checkText.trim();
                    if (!next) return;
                    setCheckText("");
                    run(() => addChecklistItem(task.taskId, next));
                  }}
                >
                  Add
                </Button>
              </div>
            )}
          </Section>

          <Section
            icon={Paperclip}
            title="Attachments"
            action={
              locked ? null : (
                <label className="inline-flex cursor-pointer items-center rounded-lg border border-[var(--border)] px-3 py-1.5 text-[12px] font-semibold text-[var(--violet)]">
                  Upload
                  <input
                    type="file"
                    className="hidden"
                    onChange={(event) => {
                      const file = event.target.files?.[0];
                      event.target.value = "";
                      if (file) run(() => uploadTaskAttachment(task.taskId, file));
                    }}
                  />
                </label>
              )
            }
          >
            <p className="text-[12px] text-[var(--muted)]">
              Max 800 KB per file — image, PDF, Word, Excel, CSV or ZIP.
            </p>
            {task.attachments.length === 0 ? (
              <p className="mt-2 text-[13px] text-[var(--muted)]">No files attached.</p>
            ) : (
              <ul className="mt-2 space-y-1">
                {task.attachments.map((file) => (
                  <li key={file.attachmentId} className="flex items-center justify-between gap-2 text-[13px]">
                    <span className="truncate font-medium text-[var(--text)]">{file.fileName}</span>
                    <TeamRowMenu
                      menuId={`file-${file.attachmentId}`}
                      items={[
                        {
                          label: "Open",
                          icon: <ExternalLink className="h-4 w-4 text-[var(--violet)]" />,
                          onClick: () =>
                            run(async () => {
                              const data = await getAttachmentDownload(task.taskId, file.attachmentId);
                              if (data?.url) window.open(data.url, "_blank", "noopener,noreferrer");
                            }),
                        },
                        {
                          label: "Delete",
                          tone: "danger",
                          separated: true,
                          icon: <Trash2 className="h-4 w-4" />,
                          onClick: () => run(() => deleteTaskAttachment(task.taskId, file.attachmentId)),
                        },
                      ]}
                    />
                  </li>
                ))}
              </ul>
            )}
          </Section>

          <Section
            icon={Clock3}
            title="Time"
            action={
              isAssignee ? (
                <button
                  type="button"
                  className="rounded-lg border border-[var(--violet)] px-3 py-1.5 text-[12px] font-semibold text-[var(--violet)]"
                  onClick={() => setShowCorrection((value) => !value)}
                >
                  Request correction
                </button>
              ) : null
            }
          >
            <div className="grid grid-cols-3 gap-2">
              <TimeStat label="Estimated" value={task.estimatedHours != null ? `${task.estimatedHours}h` : "—"} />
              <TimeStat label="Tracked" value={formatTracked(task.trackedSeconds)} />
              <TimeStat label="Entries" value={String(task.timeLogs.length)} />
            </div>
            {task.timeLogs.length === 0 ? (
              <p className="mt-2 text-[13px] text-[var(--muted)]">No time tracked yet.</p>
            ) : (
              <ul className="mt-2 space-y-1 text-[12px] text-[var(--muted)]">
                {task.timeLogs.map((log) => (
                  <li key={log.timeLogId}>
                    {formatDateTime(log.startedAt)} – {log.endedAt ? formatDateTime(log.endedAt) : "Running"} · {formatTracked(log.durationSeconds)}
                  </li>
                ))}
              </ul>
            )}
            {isAssignee && !locked ? (
              <div className="mt-2 flex gap-2">
                <Button type="button" onClick={() => run(() => startTaskTimer(task.taskId))}>
                  Start timer
                </Button>
                <Button type="button" variant="outline" onClick={() => run(() => stopTaskTimer(task.taskId))}>
                  Stop timer
                </Button>
              </div>
            ) : null}
            {showCorrection && isAssignee ? (
              <div className="mt-3 grid grid-cols-2 gap-2">
                <label className="flex flex-col gap-1 text-[11px] font-semibold uppercase tracking-wide text-[var(--muted)]">
                  Correction
                  <select
                    className={fieldClass}
                    value={correction.type}
                    onChange={(event) => setCorrection((prev) => ({ ...prev, type: event.target.value }))}
                  >
                    <option value="add">Add missed time</option>
                    <option value="edit">Edit an entry</option>
                  </select>
                </label>
                {correction.type === "edit" ? (
                  <label className="flex flex-col gap-1 text-[11px] font-semibold uppercase tracking-wide text-[var(--muted)]">
                    Entry
                    <select
                      className={fieldClass}
                      value={correction.timeLogId}
                      onChange={(event) => setCorrection((prev) => ({ ...prev, timeLogId: event.target.value }))}
                    >
                      <option value="">Select an entry</option>
                      {task.timeLogs.filter((log) => log.endedAt).map((log) => (
                        <option key={log.timeLogId} value={log.timeLogId}>
                          {formatDateTime(log.startedAt)}
                        </option>
                      ))}
                    </select>
                  </label>
                ) : null}
                <label className="flex flex-col gap-1 text-[11px] font-semibold uppercase tracking-wide text-[var(--muted)]">
                  Started
                  <input
                    className={fieldClass}
                    type="datetime-local"
                    value={correction.startedAt}
                    onChange={(event) => setCorrection((prev) => ({ ...prev, startedAt: event.target.value }))}
                  />
                </label>
                <label className="flex flex-col gap-1 text-[11px] font-semibold uppercase tracking-wide text-[var(--muted)]">
                  Ended
                  <input
                    className={fieldClass}
                    type="datetime-local"
                    value={correction.endedAt}
                    onChange={(event) => setCorrection((prev) => ({ ...prev, endedAt: event.target.value }))}
                  />
                </label>
                <label className="col-span-2 flex flex-col gap-1 text-[11px] font-semibold uppercase tracking-wide text-[var(--muted)]">
                  Reason
                  <input
                    className={fieldClass}
                    value={correction.reason}
                    placeholder="Why this time needs a correction"
                    onChange={(event) => setCorrection((prev) => ({ ...prev, reason: event.target.value }))}
                  />
                </label>
                <Button
                  type="button"
                  variant="outline"
                  onClick={() =>
                    run(() =>
                      requestTimeCorrection(task.taskId, {
                        type: correction.type,
                        timeLogId: correction.type === "edit" ? correction.timeLogId : undefined,
                        startedAt: correction.startedAt ? new Date(correction.startedAt).toISOString() : undefined,
                        endedAt: correction.endedAt ? new Date(correction.endedAt).toISOString() : undefined,
                        reason: correction.reason.trim(),
                      })
                    )
                  }
                >
                  Submit correction
                </Button>
              </div>
            ) : null}
          </Section>

          <div ref={commentsRef}>
            <Section icon={MessageSquare} title="Comments">
              {task.comments.length === 0 ? (
                <p className="text-[13px] text-[var(--muted)]">No comments yet.</p>
              ) : (
                <ul className="space-y-2">
                  {task.comments.map((item) => (
                    <li key={item.commentId} className="rounded-xl bg-[var(--panel-soft)] px-3 py-2">
                      <p className="text-[12px] font-semibold text-[var(--text)]">{personName(item.employee)}</p>
                      <p className="text-[13px] text-[var(--text)]">{item.comment}</p>
                    </li>
                  ))}
                </ul>
              )}
              <div className="mt-2 flex gap-2">
                <input
                  className={fieldClass}
                  value={comment}
                  placeholder="Write a comment..."
                  onChange={(event) => setComment(event.target.value)}
                />
                <Button
                  type="button"
                  variant="outline"
                  onClick={() => {
                    const next = comment.trim();
                    if (!next) return;
                    setComment("");
                    run(() => addTaskComment(task.taskId, { comment: next }));
                  }}
                >
                  Send
                </Button>
              </div>
            </Section>
          </div>
        </div>
      ) : null}
    </SlideOver>
  );
}

function Section({ icon: Icon, title, action, children }) {
  return (
    <section className="rounded-2xl border border-[var(--border)] p-3">
      <div className="mb-2 flex items-center justify-between gap-2">
        <h3 className="flex items-center gap-2 text-[13px] font-semibold text-[var(--text)]">
          <Icon className="h-4 w-4 text-[var(--violet)]" />
          {title}
        </h3>
        {action}
      </div>
      {children}
    </section>
  );
}

function TimeStat({ label, value }) {
  return (
    <div className="rounded-xl bg-[var(--panel-soft)] px-2 py-2 text-center">
      <p className="text-[10px] font-semibold uppercase tracking-wide text-[var(--muted)]">{label}</p>
      <p className="mt-1 text-[13px] font-semibold text-[var(--text)]">{value}</p>
    </div>
  );
}
