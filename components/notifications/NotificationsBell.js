"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import Link from "next/link";
import { Bell, Check, CheckCheck, Inbox, Sparkles } from "lucide-react";
import { getNotificationHref } from "@/api/notifications";
import {
  formatRelativeTime,
  getNotificationVisual,
  groupNotificationsByDay,
} from "@/components/notifications/notification-ui";
import {
  readAllNotifications,
  readOneNotification,
  useNotificationsList,
} from "@/hooks/useNotifications";
import { useNotificationsBadge } from "@/components/notifications/NotificationsBadgeContext";
import { formatDateTime } from "@/lib/format";
import { LogoLoader } from "@/components/ui/Spinner";

const FILTER_TABS = [
  { value: "all", label: "All" },
  { value: "unread", label: "Unread" },
];

function NotificationRow({
  row,
  dateFormat,
  timeFormat,
  onMarkRead,
  onNavigate,
}) {
  const href = getNotificationHref(row);
  const visual = getNotificationVisual(row.eventType);
  const { Icon, toneClass, label } = visual;
  const relative = formatRelativeTime(row.createdAt);
  const fullTime = row.createdAt
    ? formatDateTime(row.createdAt, dateFormat, timeFormat)
    : "—";
  const isUnread = !row.isRead;

  const body = (
    <div
      className={`flex gap-3 border-l-[3px] px-3.5 py-3 pr-12 transition ${
        isUnread
          ? `${toneClass.unreadBorder} bg-[var(--lavender-soft)]/45 hover:bg-[var(--lavender-soft)]/70`
          : "border-l-transparent opacity-80 hover:bg-[var(--panel-soft)] hover:opacity-100"
      }`}
    >
      <span
        className={`mt-0.5 inline-flex h-9 w-9 shrink-0 items-center justify-center rounded-xl ${toneClass.icon}`}
      >
        <Icon className="h-4 w-4" strokeWidth={1.9} />
      </span>

      <div className="min-w-0 flex-1">
        <div className="flex flex-wrap items-center gap-1.5">
          <p
            className={`truncate text-[13px] leading-snug ${
              isUnread
                ? "font-semibold text-[var(--text)]"
                : "font-medium text-[var(--muted)]"
            }`}
          >
            {row.title}
          </p>
          {isUnread ? (
            <span className="inline-flex shrink-0 items-center rounded-full bg-[var(--violet)] px-1.5 py-0.5 text-[9px] font-bold uppercase tracking-wide text-white">
              New
            </span>
          ) : (
            <span className="inline-flex shrink-0 items-center rounded-full border border-[var(--border)] bg-[var(--surface)] px-1.5 py-0.5 text-[9px] font-semibold uppercase tracking-wide text-[var(--muted)]">
              Read
            </span>
          )}
        </div>
        <p className="mt-0.5 text-[10px] font-medium text-[var(--muted)]">
          {label}
        </p>
        <p
          className={`mt-1 line-clamp-2 text-[12px] leading-relaxed ${
            isUnread ? "text-[var(--text)]/85" : "text-[var(--muted)]"
          }`}
        >
          {row.body}
        </p>
        <p className="mt-1.5 text-[11px] text-[var(--muted)]" title={fullTime}>
          {relative || fullTime}
          {relative ? ` · ${fullTime}` : ""}
        </p>
      </div>
    </div>
  );

  return (
    <div className="group relative">
      {href ? (
        <Link
          href={href}
          className="block"
          onClick={() => {
            onMarkRead(row);
            onNavigate?.();
          }}
        >
          {body}
        </Link>
      ) : (
        <button
          type="button"
          className="block w-full text-left"
          onClick={() => onMarkRead(row)}
        >
          {body}
        </button>
      )}

      {isUnread ? (
        <button
          type="button"
          title="Mark as read"
          aria-label="Mark as read"
          onClick={(e) => {
            e.preventDefault();
            e.stopPropagation();
            onMarkRead(row);
          }}
          className="absolute right-3 top-3 z-10 inline-flex h-7 w-7 items-center justify-center rounded-lg border border-[var(--border)] bg-[var(--surface)] text-[var(--muted)] opacity-0 transition hover:border-[var(--violet)] hover:bg-[var(--violet-soft)] hover:text-[var(--violet)] group-hover:opacity-100"
        >
          <Check className="h-3.5 w-3.5" />
        </button>
      ) : (
        <span className="pointer-events-none absolute right-4 top-4 inline-flex h-2 w-2 rounded-full bg-[var(--border)]" />
      )}
    </div>
  );
}

export function NotificationsBell({
  dateFormat = "DD/MM/YYYY",
  timeFormat = "12h",
}) {
  const [open, setOpen] = useState(false);
  const [filter, setFilter] = useState("all");
  const [busyAll, setBusyAll] = useState(false);
  const panelRef = useRef(null);
  const { unreadCount, setUnreadCount, refreshUnread } =
    useNotificationsBadge();

  const unreadOnly = filter === "unread";

  const { rows, meta, loading, error, refetch, setRows, setMeta } =
    useNotificationsList({
      page: 1,
      limit: 20,
      unreadOnly,
      enabled: open,
    });

  const groupedRows = useMemo(() => groupNotificationsByDay(rows), [rows]);

  useEffect(() => {
    if (!open) return undefined;

    function onDocClick(e) {
      if (!panelRef.current?.contains(e.target)) setOpen(false);
    }
    function onEsc(e) {
      if (e.key === "Escape") setOpen(false);
    }
    document.addEventListener("mousedown", onDocClick);
    document.addEventListener("keydown", onEsc);
    return () => {
      document.removeEventListener("mousedown", onDocClick);
      document.removeEventListener("keydown", onEsc);
    };
  }, [open]);

  useEffect(() => {
    if (open && meta?.unreadCount != null) {
      setUnreadCount(Number(meta.unreadCount) || 0);
    }
  }, [open, meta?.unreadCount, setUnreadCount]);

  async function handleOpenToggle() {
    setOpen((v) => !v);
  }

  async function handleMarkOne(row) {
    if (!row?.notificationId || row.isRead) return;
    try {
      await readOneNotification(row.notificationId);
      setRows((prev) =>
        prev.map((item) =>
          item.notificationId === row.notificationId
            ? { ...item, isRead: true, readAt: new Date().toISOString() }
            : item
        )
      );
      setMeta((prev) => ({
        ...prev,
        unreadCount: Math.max(0, (Number(prev.unreadCount) || 0) - 1),
      }));
      setUnreadCount((n) => Math.max(0, n - 1));
    } catch {
      // keep UI usable
    }
  }

  async function handleMarkAll() {
    setBusyAll(true);
    try {
      await readAllNotifications();
      setRows((prev) =>
        prev.map((item) => ({
          ...item,
          isRead: true,
          readAt: item.readAt || new Date().toISOString(),
        }))
      );
      setMeta((prev) => ({ ...prev, unreadCount: 0 }));
      setUnreadCount(0);
      await refreshUnread();
    } catch {
      // ignore
    } finally {
      setBusyAll(false);
    }
  }

  return (
    <div className="relative" ref={panelRef}>
      <button
        type="button"
        onClick={handleOpenToggle}
        className={`relative inline-flex h-10 w-10 items-center justify-center rounded-xl border border-[var(--border)] bg-[var(--surface)] transition hover:bg-[var(--lavender-soft)] hover:text-[var(--violet)] ${
          unreadCount > 0
            ? "text-[var(--violet)]"
            : "text-[var(--muted)]"
        } ${open ? "border-[var(--violet)] bg-[var(--lavender-soft)]" : ""}`}
        aria-label="Notifications"
        title="Notifications"
        aria-expanded={open}
      >
        <Bell
          className={`h-4 w-4 ${unreadCount > 0 && !open ? "bell-wiggle" : ""}`}
          strokeWidth={1.8}
        />
        {unreadCount > 0 ? (
          <span className="absolute -right-1 -top-1 flex h-[18px] min-w-[18px] items-center justify-center rounded-full bg-[var(--danger)] px-1 text-[10px] font-bold text-white shadow-[0_0_0_2px_var(--surface)]">
            {unreadCount > 99 ? "99+" : unreadCount}
          </span>
        ) : null}
      </button>

      {open ? (
        <div className="absolute right-0 top-[calc(100%+8px)] z-50 w-[min(92vw,400px)] overflow-hidden rounded-2xl border border-[var(--border)] bg-[var(--surface)] shadow-[0_16px_40px_rgba(15,23,42,0.18)]">
          <div className="border-b border-[var(--border)] bg-gradient-to-r from-[var(--violet-soft)] to-[var(--surface)] px-3.5 py-3">
            <div className="flex items-start justify-between gap-2">
              <div>
                <p className="text-[14px] font-semibold text-[var(--text)]">
                  Notifications
                </p>
                <p className="mt-0.5 text-[11px] text-[var(--muted)]">
                  {unreadCount > 0 ? (
                    <>
                      <span className="font-semibold text-[var(--violet)]">
                        {unreadCount} unread
                      </span>
                      {meta?.total ? ` · ${meta.total} total` : ""}
                    </>
                  ) : (
                    <span className="inline-flex items-center gap-1 text-[var(--success)]">
                      <Sparkles className="h-3 w-3" />
                      All caught up
                    </span>
                  )}
                </p>
              </div>
              <button
                type="button"
                disabled={busyAll || unreadCount < 1}
                onClick={handleMarkAll}
                className="inline-flex h-8 items-center gap-1.5 rounded-lg border border-[var(--border)] bg-[var(--surface)] px-2.5 text-[11px] font-semibold text-[var(--text)] transition hover:border-[var(--violet)] hover:bg-[var(--lavender-soft)] disabled:cursor-not-allowed disabled:opacity-50"
              >
                {busyAll ? (
                  <LogoLoader size="xs" />
                ) : (
                  <CheckCheck className="h-3.5 w-3.5 text-[var(--violet)]" />
                )}
                Mark all read
              </button>
            </div>

            <div className="mt-3 inline-flex rounded-xl border border-[var(--border)] bg-[var(--surface)] p-1">
              {FILTER_TABS.map((tab) => {
                const active = filter === tab.value;
                const count =
                  tab.value === "unread"
                    ? unreadCount
                    : meta?.total || rows.length;
                return (
                  <button
                    key={tab.value}
                    type="button"
                    onClick={() => setFilter(tab.value)}
                    className={`inline-flex h-7 items-center gap-1.5 rounded-lg px-2.5 text-[11px] font-semibold transition ${
                      active
                        ? "bg-[var(--violet)] text-white shadow-sm"
                        : "text-[var(--muted)] hover:bg-[var(--panel-soft)] hover:text-[var(--text)]"
                    }`}
                  >
                    {tab.label}
                    {count > 0 ? (
                      <span
                        className={`rounded-full px-1.5 py-0.5 text-[9px] ${
                          active
                            ? "bg-white/20 text-white"
                            : "bg-[var(--panel-soft)] text-[var(--muted)]"
                        }`}
                      >
                        {count > 99 ? "99+" : count}
                      </span>
                    ) : null}
                  </button>
                );
              })}
            </div>
          </div>

          <div className="max-h-[440px] overflow-y-auto">
            {loading ? (
              <div className="flex items-center justify-center gap-2 px-4 py-10 text-[13px] text-[var(--muted)]">
                <LogoLoader size="sm" />
                Loading…
              </div>
            ) : error ? (
              <div className="px-4 py-8 text-center">
                <p className="text-[13px] font-medium text-[var(--danger)]">
                  {error}
                </p>
                <button
                  type="button"
                  className="mt-2 text-[12px] font-semibold text-[var(--violet)]"
                  onClick={refetch}
                >
                  Retry
                </button>
              </div>
            ) : rows.length === 0 ? (
              <div className="flex flex-col items-center px-4 py-12 text-center">
                <span className="inline-flex h-12 w-12 items-center justify-center rounded-2xl bg-[var(--lavender-soft)] text-[var(--violet)]">
                  {filter === "unread" ? (
                    <CheckCheck className="h-5 w-5" />
                  ) : (
                    <Inbox className="h-5 w-5" />
                  )}
                </span>
                <p className="mt-3 text-[13px] font-semibold text-[var(--text)]">
                  {filter === "unread"
                    ? "No unread notifications"
                    : "No notifications yet"}
                </p>
                <p className="mt-1 max-w-[240px] text-[12px] text-[var(--muted)]">
                  {filter === "unread"
                    ? "You've read everything. Nice work."
                    : "Updates about attendance, requests, and more will show up here."}
                </p>
              </div>
            ) : (
              <div>
                {groupedRows.map((group) => (
                  <section key={group.key}>
                    <div className="sticky top-0 z-[1] border-b border-[var(--border)] bg-[var(--panel-soft)]/95 px-3.5 py-1.5 backdrop-blur">
                      <p className="text-[10px] font-bold uppercase tracking-[0.08em] text-[var(--muted)]">
                        {group.label}
                      </p>
                    </div>
                    <ul className="divide-y divide-[var(--border)]">
                      {group.items.map((row) => (
                        <li key={row.notificationId}>
                          <NotificationRow
                            row={row}
                            dateFormat={dateFormat}
                            timeFormat={timeFormat}
                            onMarkRead={handleMarkOne}
                            onNavigate={() => setOpen(false)}
                          />
                        </li>
                      ))}
                    </ul>
                  </section>
                ))}
              </div>
            )}
          </div>
        </div>
      ) : null}
    </div>
  );
}
