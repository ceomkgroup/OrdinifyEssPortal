"use client";

import { useEffect, useMemo, useState } from "react";
import { Camera, ExternalLink } from "lucide-react";
import { TeamRowMenu } from "@/components/team/TeamRowMenu";
import { listTeamMembers } from "@/api/team";
import {
  getAttachmentDownload,
  listTaskAttachments,
  listTeamTasks,
} from "@/api/tasks";
import { PortalPage } from "@/components/ui/PortalPage";
import { formatDateTime } from "@/lib/format";

const PERIODS = [
  { value: "today", label: "Today" },
  { value: "week", label: "This week" },
  { value: "month", label: "This month" },
];

function periodStart(period) {
  const start = new Date();
  start.setHours(0, 0, 0, 0);
  if (period === "week") {
    const day = start.getDay();
    start.setDate(start.getDate() - (day === 0 ? 6 : day - 1));
  } else if (period === "month") {
    start.setDate(1);
  }
  return start;
}

function isImage(file) {
  const mime = String(file.mimeType || "").toLowerCase();
  if (mime.startsWith("image/")) return true;
  return /\.(png|jpe?g|gif|webp)$/i.test(file.fileName || "");
}

export function ScreenshotsView() {
  const [period, setPeriod] = useState("today");
  const [memberId, setMemberId] = useState("all");
  const [members, setMembers] = useState([]);
  const [shots, setShots] = useState([]);
  const [urls, setUrls] = useState({});
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [reloadKey, setReloadKey] = useState(0);

  useEffect(() => {
    let alive = true;
    setLoading(true);
    setError("");
    Promise.all([
      listTeamTasks({ limit: 100 }),
      listTeamMembers().catch(() => ({ rows: [] })),
    ])
      .then(async ([tasks, team]) => {
        if (!alive) return;
        setMembers(team.rows || []);
        const groups = await Promise.all(
          (tasks.rows || []).map(async (task) => {
            try {
              const files = await listTaskAttachments(task.taskId);
              return files.map((file) => ({
                ...file,
                taskId: task.taskId,
                taskTitle: task.title,
                assigneeId: task.assignedToEmployeeId,
                assigneeName: task.assigneeName,
              }));
            } catch {
              return [];
            }
          })
        );
        if (alive) setShots(groups.flat());
      })
      .catch((err) => {
        if (!alive) return;
        setError(err.message || "Failed to load screenshots");
        setShots([]);
      })
      .finally(() => {
        if (alive) setLoading(false);
      });
    return () => {
      alive = false;
    };
  }, [reloadKey]);

  const visible = useMemo(() => {
    const start = periodStart(period);
    return shots
      .filter((file) => {
        if (memberId !== "all" && file.assigneeId !== memberId) return false;
        const created = new Date(file.createdAt);
        return !Number.isNaN(created.getTime()) && created >= start;
      })
      .sort((a, b) => new Date(b.createdAt) - new Date(a.createdAt));
  }, [shots, period, memberId]);

  useEffect(() => {
    let alive = true;
    const images = visible.filter(isImage);
    if (!images.length) {
      setUrls({});
      return undefined;
    }
    Promise.all(
      images.map(async (file) => {
        try {
          const data = await getAttachmentDownload(file.taskId, file.attachmentId);
          return [file.attachmentId, data?.url || ""];
        } catch {
          return [file.attachmentId, ""];
        }
      })
    ).then((pairs) => {
      if (alive) setUrls(Object.fromEntries(pairs));
    });
    return () => {
      alive = false;
    };
  }, [visible]);

  async function openFile(file) {
    try {
      const data = await getAttachmentDownload(file.taskId, file.attachmentId);
      if (data?.url) window.open(data.url, "_blank", "noopener,noreferrer");
    } catch (err) {
      setError(err.message || "Failed to open the file");
    }
  }

  return (
    <PortalPage
      fill
      title="Team screenshots"
      subtitle="Task attachments for people who report to you."
      error={error}
    >
      <section className="flex min-h-[280px] flex-1 flex-col overflow-hidden rounded-2xl border border-[var(--border)] bg-[var(--surface)] shadow-[var(--card-shadow)]">
        <div className="flex flex-wrap items-center justify-between gap-2 border-b border-[var(--border)] px-3 py-2">
          <div className="flex flex-wrap items-center gap-2">
            <h2 className="heading-section">
              Team screenshots {visible.length} {visible.length === 1 ? "file" : "files"}
            </h2>
            <div className="flex gap-1">
              {PERIODS.map((item) => (
                <button
                  key={item.value}
                  type="button"
                  onClick={() => setPeriod(item.value)}
                  className={`rounded-md border px-2.5 py-1 text-[12px] font-medium ${
                    period === item.value
                      ? "border-[var(--violet)] bg-[var(--lavender-soft)] text-[var(--violet)]"
                      : "border-[var(--border)] text-[var(--muted)]"
                  }`}
                >
                  {item.label}
                </button>
              ))}
            </div>
          </div>
          <div className="flex items-center gap-2">
            <select
              value={memberId}
              onChange={(event) => setMemberId(event.target.value)}
              className="h-8 rounded-md border border-[var(--border)] bg-[var(--surface)] px-2 text-[12px] font-medium text-[var(--text)]"
            >
              <option value="all">All members</option>
              {members.map((member) => (
                <option key={member.employeeId} value={member.employeeId}>
                  {member.name || member.employeeName}
                </option>
              ))}
            </select>
            <button
              type="button"
              onClick={() => setReloadKey((value) => value + 1)}
              className="h-8 rounded-md border border-[var(--border)] px-2 text-[12px] font-medium text-[var(--muted)]"
            >
              Refresh
            </button>
          </div>
        </div>

        <div className="min-h-0 flex-1 overflow-auto p-3">
          {loading ? (
            <p className="py-16 text-center text-[13px] text-[var(--muted)]">Loading screenshots…</p>
          ) : visible.length === 0 ? (
            <div className="flex h-full flex-col items-center justify-center gap-2 text-center">
              <span className="inline-flex h-12 w-12 items-center justify-center rounded-2xl bg-[var(--lavender-soft)] text-[var(--violet)]">
                <Camera className="h-6 w-6" />
              </span>
              <p className="text-[14px] font-semibold text-[var(--text)]">
                No screenshots for this period
              </p>
            </div>
          ) : (
            <div className="grid grid-cols-2 gap-3 sm:grid-cols-3 lg:grid-cols-4">
              {visible.map((file) => (
                <div
                  key={file.attachmentId}
                  className="relative overflow-hidden rounded-xl border border-[var(--border)] bg-[var(--panel-soft)] text-left"
                >
                  <div className="absolute right-1.5 top-1.5 z-10">
                    <TeamRowMenu
                      menuId={file.attachmentId}
                      items={[
                        {
                          label: "Open",
                          icon: <ExternalLink className="h-4 w-4 text-[var(--violet)]" />,
                          onClick: () => openFile(file),
                        },
                      ]}
                    />
                  </div>
                  {isImage(file) && urls[file.attachmentId] ? (
                    <img
                      src={urls[file.attachmentId]}
                      alt={file.fileName || "Screenshot"}
                      className="h-36 w-full object-cover"
                    />
                  ) : (
                    <div className="flex h-36 items-center justify-center px-3 text-center text-[12px] font-medium text-[var(--muted)]">
                      {file.fileName || "Attachment"}
                    </div>
                  )}
                  <div className="space-y-0.5 px-3 py-2">
                    <p className="truncate text-[13px] font-semibold text-[var(--text)]">
                      {file.taskTitle || file.fileName}
                    </p>
                    <p className="truncate text-[11px] text-[var(--muted)]">
                      {file.assigneeName || "Team"} · {formatDateTime(file.createdAt)}
                    </p>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      </section>
    </PortalPage>
  );
}
