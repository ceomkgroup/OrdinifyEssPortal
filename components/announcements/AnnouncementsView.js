"use client";

import Image from "next/image";
import { useEffect, useMemo, useState } from "react";
import {
  CheckCheck,
  Inbox,
  Megaphone,
  MessageCircle,
  Pin,
  RefreshCw,
  Send,
  ShieldCheck,
} from "lucide-react";
import { resolveMediaUrl } from "@/lib/media";
import { formatDateTime } from "@/lib/format";
import { Button } from "@/components/ui/Button";
import { FlashBanner } from "@/components/ui/FlashBanner";
import { Avatar } from "@/components/ui/Avatar";
import { PageLoader } from "@/components/ui/Spinner";
import { SlideOver } from "@/components/ui/SlideOver";
import {
  acknowledge,
  clearReaction,
  markAllRead,
  postComment,
  setReaction,
  useAnnouncementComments,
  useAnnouncementDetail,
  useAnnouncementsList,
} from "@/hooks/useAnnouncements";
import { useAnnouncementsBadge } from "@/components/announcements/AnnouncementsBadgeContext";

const REACTION_OPTIONS = ["👍", "❤️", "🎉", "👏", "😮", "🙏"];

const CATEGORY_LABELS = {
  holiday: "Holiday",
  general: "General",
  policy: "Policy",
  hr: "HR",
  event: "Event",
  urgent: "Urgent",
};

function categoryLabel(value) {
  const key = String(value || "").toLowerCase();
  if (!key) return "General";
  return CATEGORY_LABELS[key] || key.charAt(0).toUpperCase() + key.slice(1);
}

function priorityTone(priority) {
  const p = String(priority || "").toLowerCase();
  if (p === "high" || p === "urgent") {
    return "bg-[var(--danger-soft)] text-[var(--danger)]";
  }
  if (p === "low") {
    return "bg-[var(--muted)]/15 text-[var(--muted)]";
  }
  return "bg-[var(--lavender-soft)] text-[var(--violet)]";
}

/** Light markdown-ish: *bold* and keep newlines */
function renderDescription(text) {
  if (!text) return null;
  const parts = String(text).split(/(\*[^*]+\*)/g);
  return parts.map((part, i) => {
    if (part.startsWith("*") && part.endsWith("*") && part.length > 2) {
      return (
        <strong key={i} className="font-semibold text-[var(--text)]">
          {part.slice(1, -1)}
        </strong>
      );
    }
    return <span key={i}>{part}</span>;
  });
}

function StatPill({ label, value }) {
  return (
    <div className="rounded-2xl border border-[var(--border)] bg-[var(--surface)] px-4 py-3 shadow-[var(--card-shadow)]">
      <p className="text-[11px] font-semibold uppercase tracking-wide text-[var(--muted)]">
        {label}
      </p>
      <p className="mt-1 text-[20px] font-bold tabular-nums text-[var(--text)]">
        {value}
      </p>
    </div>
  );
}

function AnnouncementCard({ item, active, onOpen, dateFormat, timeFormat }) {
  return (
    <button
      type="button"
      onClick={() => onOpen(item)}
      className={`w-full rounded-2xl border p-4 text-left transition ${
        active
          ? "border-[var(--violet)] bg-[var(--lavender-soft)] shadow-[var(--card-shadow)]"
          : "border-[var(--border)] bg-[var(--surface)] shadow-[var(--card-shadow)] hover:border-[var(--lavender)] hover:bg-[var(--lavender-soft)]/40"
      } ${!item.isRead ? "ring-1 ring-[var(--violet)]/25" : ""}`}
    >
      <div className="flex items-start gap-3">
        <div
          className={`mt-0.5 flex h-10 w-10 shrink-0 items-center justify-center rounded-xl ${
            item.isPinned
              ? "bg-[var(--violet)] text-white"
              : "bg-[var(--lavender-soft)] text-[var(--violet)]"
          }`}
        >
          {item.isPinned ? (
            <Pin className="h-4 w-4" strokeWidth={2} />
          ) : (
            <Megaphone className="h-4 w-4" strokeWidth={1.8} />
          )}
        </div>

        <div className="min-w-0 flex-1">
          <div className="flex flex-wrap items-center gap-1.5">
            {!item.isRead ? (
              <span className="rounded-full bg-[var(--violet)] px-2 py-0.5 text-[10px] font-bold uppercase tracking-wide text-white">
                New
              </span>
            ) : null}
            {item.isPinned ? (
              <span className="rounded-full bg-[var(--lavender-soft)] px-2 py-0.5 text-[10px] font-semibold text-[var(--violet)]">
                Pinned
              </span>
            ) : null}
            <span className="rounded-full bg-[var(--lavender-soft)] px-2 py-0.5 text-[10px] font-semibold text-[var(--muted)]">
              {categoryLabel(item.category)}
            </span>
            <span
              className={`rounded-full px-2 py-0.5 text-[10px] font-semibold capitalize ${priorityTone(item.priority)}`}
            >
              {item.priority || "normal"}
            </span>
            {item.requireAck && !item.isAcknowledged ? (
              <span className="rounded-full bg-[var(--warning-soft)] px-2 py-0.5 text-[10px] font-semibold text-[var(--warning)]">
                Ack needed
              </span>
            ) : null}
            {item.requireAck && item.isAcknowledged ? (
              <span className="rounded-full bg-[var(--success-soft)] px-2 py-0.5 text-[10px] font-semibold text-[var(--success)]">
                Acknowledged
              </span>
            ) : null}
          </div>

          <h3 className="mt-2 truncate text-[15px] font-semibold text-[var(--text)]">
            {item.title}
          </h3>
          <p className="mt-1 text-[12px] text-[var(--muted)]">
            {formatDateTime(item.publishedAt, dateFormat, timeFormat) || "—"}
            {item.expiresAt
              ? ` · Expires ${formatDateTime(item.expiresAt, dateFormat, timeFormat)}`
              : ""}
          </p>

          <div className="mt-2 flex flex-wrap items-center gap-3 text-[12px] text-[var(--muted)]">
            {item.commentsEnabled ? (
              <span className="inline-flex items-center gap-1">
                <MessageCircle className="h-3.5 w-3.5" />
                Comments on
              </span>
            ) : null}
            <span className="text-[var(--muted)]">
              {item.reactionsEnabled
                ? item.myReaction
                  ? `Reacted ${item.myReaction}`
                  : "Reactions on"
                : "Reactions off"}
            </span>
          </div>
        </div>
      </div>
    </button>
  );
}

function DetailPanel({
  announcementId,
  onClose,
  onChanged,
  dateFormat,
  timeFormat,
}) {
  const { detail, loading, error, refetch, setDetail } = useAnnouncementDetail(
    announcementId,
    { enabled: Boolean(announcementId) }
  );
  const commentsEnabled = Boolean(detail?.commentsEnabled);
  const {
    rows: comments,
    loading: commentsLoading,
    refetch: refetchComments,
    setRows: setComments,
  } = useAnnouncementComments(announcementId, {
    enabled: Boolean(announcementId) && commentsEnabled,
  });

  const [commentText, setCommentText] = useState("");
  const [busy, setBusy] = useState("");
  const [flash, setFlash] = useState(null);

  useEffect(() => {
    setCommentText("");
    setFlash(null);
  }, [announcementId]);

  // Opening detail marks as read on the server — refresh list badges once.
  useEffect(() => {
    if (!detail?.announcementId) return undefined;
    const timer = window.setTimeout(() => onChanged?.({ soft: true }), 0);
    return () => window.clearTimeout(timer);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [detail?.announcementId]);

  async function handleAcknowledge() {
    if (!detail?.announcementId) return;
    setBusy("ack");
    setFlash(null);
    try {
      await acknowledge(detail.announcementId);
      setDetail((prev) =>
        prev ? { ...prev, isAcknowledged: true, isRead: true } : prev
      );
      setFlash({ tone: "success", message: "Acknowledged successfully" });
      onChanged?.();
    } catch (err) {
      setFlash({
        tone: "danger",
        message: err.message || "Could not acknowledge",
      });
    } finally {
      setBusy("");
    }
  }

  async function handleComment(e) {
    e.preventDefault();
    if (!detail?.announcementId || !commentText.trim()) return;
    setBusy("comment");
    setFlash(null);
    try {
      const created = await postComment(detail.announcementId, commentText);
      setCommentText("");
      if (created) {
        setComments((prev) => [created, ...prev]);
      } else {
        refetchComments();
      }
      setDetail((prev) =>
        prev
          ? { ...prev, totalComments: (prev.totalComments || 0) + 1 }
          : prev
      );
      setFlash({ tone: "success", message: "Comment posted" });
      onChanged?.();
    } catch (err) {
      setFlash({
        tone: "danger",
        message: err.message || "Could not post comment",
      });
    } finally {
      setBusy("");
    }
  }

  async function handleReact(emoji) {
    if (!detail?.announcementId || !detail.reactionsEnabled) return;
    setBusy(`react-${emoji}`);
    setFlash(null);
    try {
      const same = detail.myReaction === emoji;
      if (same) {
        await clearReaction(detail.announcementId);
        setDetail((prev) =>
          prev
            ? {
                ...prev,
                myReaction: null,
                totalReactions: Math.max(0, (prev.totalReactions || 0) - 1),
              }
            : prev
        );
      } else {
        const res = await setReaction(detail.announcementId, emoji);
        const next = res.myReaction ?? emoji;
        setDetail((prev) => {
          if (!prev) return prev;
          const had = Boolean(prev.myReaction);
          return {
            ...prev,
            myReaction: next,
            totalReactions: had
              ? prev.totalReactions
              : (prev.totalReactions || 0) + 1,
          };
        });
      }
      onChanged?.();
    } catch (err) {
      setFlash({
        tone: "danger",
        message: err.message || "Could not update reaction",
      });
    } finally {
      setBusy("");
    }
  }

  const bannerUrl = resolveMediaUrl(detail?.bannerImageUrl);

  return (
    <SlideOver
      open={Boolean(announcementId)}
      onClose={onClose}
      title={detail?.title || "Announcement"}
      wide
    >
      {flash?.message ? (
        <div className="mb-4">
          <FlashBanner
            message={flash.message}
            tone={flash.tone}
            onDismiss={() => setFlash(null)}
          />
        </div>
      ) : null}

      {loading ? (
        <PageLoader label="Loading" hint="Opening announcement…" />
      ) : error ? (
        <div className="rounded-2xl border border-[var(--danger)]/20 bg-[var(--danger-soft)] p-4 text-sm text-[var(--danger)]">
          {error}
          <div className="mt-3">
            <Button variant="outline" onClick={refetch}>
              Retry
            </Button>
          </div>
        </div>
      ) : detail ? (
        <div className="space-y-5">
          <div className="flex flex-wrap gap-1.5">
            <span className="rounded-full bg-[var(--lavender-soft)] px-2.5 py-1 text-[11px] font-semibold text-[var(--muted)]">
              {categoryLabel(detail.category)}
            </span>
            <span
              className={`rounded-full px-2.5 py-1 text-[11px] font-semibold capitalize ${priorityTone(detail.priority)}`}
            >
              {detail.priority || "normal"}
            </span>
            {detail.isPinned ? (
              <span className="rounded-full bg-[var(--lavender-soft)] px-2.5 py-1 text-[11px] font-semibold text-[var(--violet)]">
                Pinned
              </span>
            ) : null}
            {detail.isRead ? (
              <span className="rounded-full bg-[var(--success-soft)] px-2.5 py-1 text-[11px] font-semibold text-[var(--success)]">
                Read
              </span>
            ) : null}
          </div>

          {bannerUrl ? (
            <div className="relative overflow-hidden rounded-2xl border border-[var(--border)]">
              <Image
                src={bannerUrl}
                alt=""
                width={800}
                height={320}
                className="h-40 w-full object-cover sm:h-48"
                unoptimized
              />
            </div>
          ) : null}

          <div className="grid gap-2 text-[13px] text-[var(--muted)] sm:grid-cols-2">
            <p>
              <span className="font-semibold text-[var(--text)]">Published</span>
              <br />
              {formatDateTime(detail.publishedAt, dateFormat, timeFormat) ||
                "—"}
            </p>
            <p>
              <span className="font-semibold text-[var(--text)]">Expires</span>
              <br />
              {detail.expiresAt
                ? formatDateTime(detail.expiresAt, dateFormat, timeFormat)
                : "No expiry"}
            </p>
          </div>

          <div className="rounded-2xl border border-[var(--border)] bg-[var(--surface)] p-4">
            <p className="whitespace-pre-wrap text-[14px] leading-relaxed text-[var(--text)]">
              {renderDescription(detail.description) || "No description."}
            </p>
          </div>

          {Array.isArray(detail.attachments) && detail.attachments.length > 0 ? (
            <div>
              <p className="mb-2 text-[12px] font-semibold uppercase tracking-wide text-[var(--muted)]">
                Attachments
              </p>
              <ul className="space-y-2">
                {detail.attachments.map((file, idx) => {
                  const url = resolveMediaUrl(
                    file?.url || file?.fileUrl || file?.path || file
                  );
                  const label =
                    file?.name ||
                    file?.fileName ||
                    (typeof file === "string" ? file.split("/").pop() : null) ||
                    `Attachment ${idx + 1}`;
                  return (
                    <li key={idx}>
                      {url ? (
                        <a
                          href={url}
                          target="_blank"
                          rel="noreferrer"
                          className="text-sm font-medium text-[var(--violet)] underline-offset-2 hover:underline"
                        >
                          {label}
                        </a>
                      ) : (
                        <span className="text-sm text-[var(--muted)]">
                          {label}
                        </span>
                      )}
                    </li>
                  );
                })}
              </ul>
            </div>
          ) : null}

          {detail.requireAck ? (
            <div className="rounded-2xl border border-[var(--border)] bg-[var(--lavender-soft)]/50 p-4">
              {detail.isAcknowledged ? (
                <p className="inline-flex items-center gap-2 text-sm font-semibold text-[var(--success)]">
                  <ShieldCheck className="h-4 w-4" />
                  You acknowledged this announcement
                </p>
              ) : (
                <div className="flex flex-wrap items-center justify-between gap-3">
                  <p className="text-sm text-[var(--text)]">
                    This announcement requires your acknowledgement.
                  </p>
                  <Button
                    onClick={handleAcknowledge}
                    disabled={busy === "ack"}
                  >
                    {busy === "ack" ? "Saving…" : "Acknowledge"}
                  </Button>
                </div>
              )}
            </div>
          ) : null}

          <div>
            <p className="mb-2 text-[12px] font-semibold uppercase tracking-wide text-[var(--muted)]">
              Reactions
              {detail.reactionsEnabled && detail.totalReactions
                ? ` · ${detail.totalReactions}`
                : ""}
            </p>
            {detail.reactionsEnabled ? (
              <div className="flex flex-wrap gap-2">
                {REACTION_OPTIONS.map((emoji) => {
                  const selected = detail.myReaction === emoji;
                  return (
                    <button
                      key={emoji}
                      type="button"
                      disabled={Boolean(busy)}
                      onClick={() => handleReact(emoji)}
                      className={`inline-flex h-10 min-w-10 items-center justify-center rounded-xl border px-2 text-lg transition ${
                        selected
                          ? "border-[var(--violet)] bg-[var(--lavender-soft)]"
                          : "border-[var(--border)] bg-[var(--surface)] hover:border-[var(--lavender)]"
                      }`}
                      aria-label={`React ${emoji}`}
                      title={selected ? "Remove reaction" : "Add reaction"}
                    >
                      {emoji}
                    </button>
                  );
                })}
              </div>
            ) : (
              <p className="rounded-xl border border-dashed border-[var(--border)] bg-[var(--background)] px-3 py-2.5 text-[13px] text-[var(--muted)]">
                Reactions are turned off for this announcement. Emoji buttons
                (👍 ❤️ 🎉 …) show here only when the admin enables reactions.
              </p>
            )}
          </div>

          {commentsEnabled ? (
            <div className="space-y-3">
              <div className="flex items-center justify-between gap-2">
                <p className="text-[12px] font-semibold uppercase tracking-wide text-[var(--muted)]">
                  Comments
                  {detail.totalComments != null
                    ? ` · ${detail.totalComments}`
                    : ""}
                </p>
                <button
                  type="button"
                  onClick={refetchComments}
                  className="inline-flex items-center gap-1 text-[12px] font-medium text-[var(--violet)]"
                >
                  <RefreshCw className="h-3.5 w-3.5" />
                  Refresh
                </button>
              </div>

              <form onSubmit={handleComment} className="flex gap-2">
                <input
                  value={commentText}
                  onChange={(e) => setCommentText(e.target.value)}
                  placeholder="Write a comment…"
                  className="h-11 min-w-0 flex-1 rounded-xl border border-[var(--border)] bg-[var(--surface)] px-3 text-sm text-[var(--text)] outline-none focus:border-[var(--violet)]"
                  maxLength={1000}
                />
                <Button
                  type="submit"
                  disabled={busy === "comment" || !commentText.trim()}
                  className="shrink-0 px-3"
                  aria-label="Send comment"
                >
                  <Send className="h-4 w-4" />
                </Button>
              </form>

              {commentsLoading ? (
                <p className="text-sm text-[var(--muted)]">Loading comments…</p>
              ) : comments.length === 0 ? (
                <p className="text-sm text-[var(--muted)]">No comments yet.</p>
              ) : (
                <ul className="space-y-3">
                  {comments.map((c) => (
                    <li
                      key={c.commentId}
                      className="rounded-2xl border border-[var(--border)] bg-[var(--surface)] p-3"
                    >
                      <div className="flex items-start gap-2.5">
                        <Avatar
                          name={c.employeeName}
                          person={{ photoUrl: c.photoUrl }}
                          size={32}
                        />
                        <div className="min-w-0 flex-1">
                          <div className="flex flex-wrap items-baseline gap-x-2 gap-y-0.5">
                            <p className="text-[13px] font-semibold text-[var(--text)]">
                              {c.employeeName}
                            </p>
                            <p className="text-[11px] text-[var(--muted)]">
                              {formatDateTime(
                                c.createdAt,
                                dateFormat,
                                timeFormat
                              )}
                            </p>
                          </div>
                          <p className="mt-1 whitespace-pre-wrap text-[13px] text-[var(--text)]">
                            {c.comment}
                          </p>
                        </div>
                      </div>
                    </li>
                  ))}
                </ul>
              )}
            </div>
          ) : null}
        </div>
      ) : null}
    </SlideOver>
  );
}

export function AnnouncementsView({
  dateFormat = "DD/MM/YYYY",
  timeFormat = "12h",
}) {
  const [category, setCategory] = useState("all");
  const [listFilter, setListFilter] = useState("all");
  const [selectedId, setSelectedId] = useState(null);
  const [flash, setFlash] = useState(null);
  const [markingAll, setMarkingAll] = useState(false);

  const { rows, meta, loading, error, refetch, unreadCount, pendingAckCount } =
    useAnnouncementsList({
      page: 1,
      limit: 50,
      category: "all",
    });
  const { syncFromRows } = useAnnouncementsBadge();

  useEffect(() => {
    if (!loading) syncFromRows(rows);
  }, [rows, loading, syncFromRows]);

  const categories = useMemo(() => {
    const set = new Set();
    rows.forEach((r) => {
      if (r.category) set.add(r.category);
    });
    return Array.from(set).sort();
  }, [rows]);

  const filtered = useMemo(() => {
    return rows.filter((r) => {
      if (category !== "all" && r.category !== category) return false;
      if (listFilter === "unread") return !r.isRead;
      if (listFilter === "pinned") return r.isPinned;
      if (listFilter === "ack") return r.requireAck && !r.isAcknowledged;
      return true;
    });
  }, [rows, listFilter, category]);

  async function handleMarkAllRead() {
    setMarkingAll(true);
    setFlash(null);
    try {
      await markAllRead();
      setFlash({ tone: "success", message: "All announcements marked as read" });
      refetch();
    } catch (err) {
      setFlash({
        tone: "danger",
        message: err.message || "Could not mark all as read",
      });
    } finally {
      setMarkingAll(false);
    }
  }

  return (
    <div className="mx-auto max-w-5xl space-y-5">
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div>
          <h1 className="text-[22px] font-bold tracking-tight text-[var(--text)]">
            Announcements
          </h1>
          <p className="mt-1 text-sm text-[var(--muted)]">
            Company updates, holidays, and notices for you.
          </p>
        </div>
        <div className="flex flex-wrap gap-2">
          <Button
            variant="outline"
            onClick={refetch}
            disabled={loading}
            className="h-10"
          >
            <RefreshCw className="h-4 w-4" />
            Refresh
          </Button>
          <Button
            variant="outline"
            onClick={handleMarkAllRead}
            disabled={markingAll || unreadCount === 0}
            className="h-10"
          >
            <CheckCheck className="h-4 w-4" />
            {markingAll ? "Marking…" : "Mark all read"}
          </Button>
        </div>
      </div>

      {flash?.message ? (
        <FlashBanner
          message={flash.message}
          tone={flash.tone}
          onDismiss={() => setFlash(null)}
        />
      ) : null}

      <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
        <StatPill label="Total" value={meta?.total ?? rows.length} />
        <StatPill label="Unread" value={unreadCount} />
        <StatPill label="Ack pending" value={pendingAckCount} />
        <StatPill
          label="Pinned"
          value={rows.filter((r) => r.isPinned).length}
        />
      </div>

      <div className="flex flex-wrap items-center gap-2">
        {[
          { key: "all", label: "All" },
          { key: "unread", label: "Unread" },
          { key: "pinned", label: "Pinned" },
          { key: "ack", label: "Need ack" },
        ].map((f) => (
          <button
            key={f.key}
            type="button"
            onClick={() => setListFilter(f.key)}
            className={`rounded-full px-3 py-1.5 text-[12px] font-semibold transition ${
              listFilter === f.key
                ? "bg-[var(--violet)] text-white"
                : "border border-[var(--border)] bg-[var(--surface)] text-[var(--muted)] hover:border-[var(--lavender)] hover:text-[var(--violet)]"
            }`}
          >
            {f.label}
          </button>
        ))}

        <select
          value={category}
          onChange={(e) => setCategory(e.target.value)}
          className="ml-auto h-9 rounded-full border border-[var(--border)] bg-[var(--surface)] px-3 text-[12px] font-semibold text-[var(--text)] outline-none focus:border-[var(--violet)]"
          aria-label="Filter by category"
        >
          <option value="all">All categories</option>
          {categories.map((c) => (
            <option key={c} value={c}>
              {categoryLabel(c)}
            </option>
          ))}
        </select>
      </div>

      {loading ? (
        <PageLoader label="Loading" hint="Fetching announcements…" />
      ) : error ? (
        <div className="rounded-2xl border border-[var(--danger)]/20 bg-[var(--danger-soft)] p-5 text-sm text-[var(--danger)]">
          {error}
          <div className="mt-3">
            <Button variant="outline" onClick={refetch}>
              Retry
            </Button>
          </div>
        </div>
      ) : filtered.length === 0 ? (
        <div className="flex flex-col items-center justify-center rounded-2xl border border-dashed border-[var(--border)] bg-[var(--surface)] px-6 py-16 text-center">
          <Inbox className="mb-3 h-10 w-10 text-[var(--muted)]" />
          <p className="text-[15px] font-semibold text-[var(--text)]">
            No announcements
          </p>
          <p className="mt-1 max-w-sm text-sm text-[var(--muted)]">
            {listFilter === "all"
              ? "There are no published announcements for you right now."
              : "Nothing matches this filter."}
          </p>
        </div>
      ) : (
        <div className="space-y-3">
          {filtered.map((item) => (
            <AnnouncementCard
              key={item.announcementId}
              item={item}
              active={selectedId === item.announcementId}
              onOpen={(row) => setSelectedId(row.announcementId)}
              dateFormat={dateFormat}
              timeFormat={timeFormat}
            />
          ))}
        </div>
      )}

      <DetailPanel
        announcementId={selectedId}
        onClose={() => setSelectedId(null)}
        onChanged={refetch}
        dateFormat={dateFormat}
        timeFormat={timeFormat}
      />
    </div>
  );
}
