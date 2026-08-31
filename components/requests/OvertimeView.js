"use client";

import {
  CalendarDays,
  CheckCircle2,
  ChevronLeft,
  ChevronRight,
  Clock3,
  Eye,
  Hourglass,
  Inbox,
  MoreVertical,
  Plus,
  RefreshCw,
  Send,
  X,
  XCircle,
} from "lucide-react";
import { useEffect, useMemo, useRef, useState } from "react";
import { createPortal } from "react-dom";
import { getAttendanceHistory } from "@/api/attendance";
import { Button } from "@/components/ui/Button";
import { FlashBanner } from "@/components/ui/FlashBanner";
import { FilterDate } from "@/components/ui/ListFilters";
import { CollapsibleSection } from "@/components/ui/CollapsibleSection";
import { PortalPage } from "@/components/ui/PortalPage";
import { SlideOver } from "@/components/ui/SlideOver";
import { TablePanel } from "@/components/ui/TablePanel";
import {
  cancelOvertime,
  submitOvertime,
  useOvertimeList,
  useOvertimeStats,
} from "@/hooks/useOvertime";
import {
  countActiveDateFilters,
  dateInRange,
} from "@/lib/request-date-filter";
import {
  formatDate,
  formatDateTime,
  formatTime,
  rowSerial,
} from "@/lib/format";

const WEEKDAYS = [
  "Sunday",
  "Monday",
  "Tuesday",
  "Wednesday",
  "Thursday",
  "Friday",
  "Saturday",
];

const MONTHS = [
  "January",
  "February",
  "March",
  "April",
  "May",
  "June",
  "July",
  "August",
  "September",
  "October",
  "November",
  "December",
];

function emptyForm() {
  return {
    logId: "",
    attendanceDate: "",
    overtimeMinutes: "90",
    reason: "",
  };
}

function normalizeStatusLabel(status, statusLabel) {
  const s = String(status || "").toLowerCase();
  if (s === "rejected" || s === "cancelled" || s === "canceled") {
    return "Cancelled";
  }
  if (statusLabel) return statusLabel;
  if (!status) return "—";
  return String(status).replace(/_/g, " ");
}

function statusTone(status) {
  const s = String(status || "").toLowerCase();
  if (s === "approved") {
    return "border-[var(--success)]/25 bg-[var(--success-soft)] text-[var(--success)]";
  }
  if (s === "rejected" || s === "cancelled" || s === "canceled") {
    return "border-[var(--danger)]/25 bg-[var(--danger-soft)] text-[var(--danger)]";
  }
  if (s === "pending") {
    return "border-[var(--warning)]/30 bg-[var(--warning-soft)] text-[var(--warning)]";
  }
  return "border-[var(--border)] bg-[var(--panel-soft)] text-[var(--muted)]";
}

function formatDateWithWeekday(value, dateFormat) {
  if (!value) return "—";
  const key = String(value).match(/^(\d{4}-\d{2}-\d{2})/)?.[1];
  const d = key ? new Date(`${key}T12:00:00`) : new Date(value);
  if (Number.isNaN(d.getTime())) return formatDate(value, dateFormat);
  return `${formatDate(value, dateFormat)} (${WEEKDAYS[d.getDay()]})`;
}

function formatOtDuration(totalMinutes) {
  if (totalMinutes == null || Number.isNaN(Number(totalMinutes))) return "—";
  const mins = Math.max(0, Math.round(Number(totalMinutes)));
  const h = Math.floor(mins / 60);
  const m = mins % 60;
  if (h > 0 && m > 0) return `${h}h ${m}m`;
  if (h > 0) return `${h}h`;
  return `${m}m`;
}

function toDateInputValue(iso) {
  if (!iso) return "";
  const match = String(iso).match(/^(\d{4}-\d{2}-\d{2})/);
  if (match) return match[1];
  const d = new Date(iso);
  if (Number.isNaN(d.getTime())) return "";
  const y = d.getFullYear();
  const m = String(d.getMonth() + 1).padStart(2, "0");
  const day = String(d.getDate()).padStart(2, "0");
  return `${y}-${m}-${day}`;
}

function resolveLogId(row) {
  if (!row) return null;
  return (
    row.logId ||
    row.attendanceLogId ||
    row.attendanceId ||
    row.id ||
    null
  );
}

function AttendanceDayPicker({
  logsByDate,
  selectedDate,
  onSelect,
  dateFormat,
  loading,
}) {
  const rootRef = useRef(null);
  const [open, setOpen] = useState(false);
  const todayKey = toDateInputValue(new Date().toISOString());
  const initial = selectedDate
    ? new Date(`${selectedDate}T12:00:00`)
    : new Date();
  const [cursor, setCursor] = useState(
    () => new Date(initial.getFullYear(), initial.getMonth(), 1)
  );

  useEffect(() => {
    if (!selectedDate) return;
    const d = new Date(`${selectedDate}T12:00:00`);
    if (Number.isNaN(d.getTime())) return;
    setCursor(new Date(d.getFullYear(), d.getMonth(), 1));
  }, [selectedDate]);

  useEffect(() => {
    if (!open) return undefined;

    function onDocClick(event) {
      if (rootRef.current?.contains(event.target)) return;
      setOpen(false);
    }

    function onKey(event) {
      if (event.key === "Escape") setOpen(false);
    }

    document.addEventListener("mousedown", onDocClick);
    window.addEventListener("keydown", onKey);
    return () => {
      document.removeEventListener("mousedown", onDocClick);
      window.removeEventListener("keydown", onKey);
    };
  }, [open]);

  const year = cursor.getFullYear();
  const month = cursor.getMonth();
  const daysInMonth = new Date(year, month + 1, 0).getDate();
  const startWeekday = new Date(year, month, 1).getDay();

  const cells = [];
  for (let i = 0; i < startWeekday; i += 1) cells.push(null);
  for (let day = 1; day <= daysInMonth; day += 1) {
    const key = `${year}-${String(month + 1).padStart(2, "0")}-${String(day).padStart(2, "0")}`;
    cells.push({ day, key, log: logsByDate.get(key) || null });
  }

  const availableInMonth = cells.filter((c) => c?.log).length;

  function pickDay(key, log) {
    onSelect?.(key, log);
    setOpen(false);
  }

  return (
    <div ref={rootRef} className="relative">
      <button
        type="button"
        disabled={loading}
        aria-expanded={open}
        aria-haspopup="dialog"
        onClick={() => setOpen((v) => !v)}
        className="flex h-11 w-full items-center justify-between gap-2 rounded-xl border border-[var(--border)] bg-[var(--surface)] px-3 text-left text-[13px] text-[var(--text)] outline-none transition hover:border-[var(--violet)]/40 focus:border-[var(--violet)] focus:ring-2 focus:ring-[var(--lavender-soft)] disabled:opacity-60"
      >
        <span className={selectedDate ? "font-medium" : "text-[var(--muted)]"}>
          {loading
            ? "Loading attendance days…"
            : selectedDate
              ? formatDateWithWeekday(selectedDate, dateFormat)
              : "Select attendance date"}
        </span>
        <CalendarDays className="h-4 w-4 shrink-0 text-[var(--violet)]" />
      </button>

      {open ? (
        <div className="absolute left-0 right-0 z-30 mt-2 rounded-2xl border border-[var(--border)] bg-[var(--surface)] p-3 shadow-[0_12px_32px_rgba(15,23,42,0.16)]">
          <div className="mb-3 flex items-center justify-between gap-2">
            <button
              type="button"
              className="inline-flex h-8 w-8 items-center justify-center rounded-lg text-[var(--muted)] transition hover:bg-[var(--panel-soft)] hover:text-[var(--text)]"
              onClick={() => setCursor(new Date(year, month - 1, 1))}
              aria-label="Previous month"
            >
              <ChevronLeft className="h-4 w-4" />
            </button>
            <p className="text-[13px] font-semibold text-[var(--text)]">
              {MONTHS[month]} {year}
            </p>
            <button
              type="button"
              className="inline-flex h-8 w-8 items-center justify-center rounded-lg text-[var(--muted)] transition hover:bg-[var(--panel-soft)] hover:text-[var(--text)]"
              onClick={() => setCursor(new Date(year, month + 1, 1))}
              aria-label="Next month"
            >
              <ChevronRight className="h-4 w-4" />
            </button>
          </div>

          <div className="mb-1 grid grid-cols-7 gap-1 text-center text-[10px] font-semibold uppercase tracking-wide text-[var(--muted)]">
            {["Su", "Mo", "Tu", "We", "Th", "Fr", "Sa"].map((d) => (
              <span key={d} className="py-1">
                {d}
              </span>
            ))}
          </div>

          <div className="grid grid-cols-7 gap-1">
            {cells.map((cell, index) => {
              if (!cell) {
                return <span key={`e-${index}`} className="h-9" />;
              }
              const isSelected = cell.key === selectedDate;
              const isToday = cell.key === todayKey;
              const hasLog = Boolean(cell.log);
              const disabled = !hasLog || loading;

              return (
                <button
                  key={cell.key}
                  type="button"
                  disabled={disabled}
                  onClick={() => pickDay(cell.key, cell.log)}
                  className={[
                    "relative h-9 rounded-lg text-[12px] font-semibold transition",
                    isSelected
                      ? "bg-[var(--violet)] text-white shadow-sm"
                      : hasLog
                        ? "text-[var(--text)] hover:bg-[var(--lavender-soft)]"
                        : "cursor-not-allowed text-[var(--muted)]/35",
                    isToday && !isSelected
                      ? "ring-1 ring-inset ring-[var(--violet)]/40"
                      : "",
                  ].join(" ")}
                >
                  {cell.day}
                  {hasLog && !isSelected ? (
                    <span className="absolute bottom-1 left-1/2 h-1 w-1 -translate-x-1/2 rounded-full bg-[var(--violet)]" />
                  ) : null}
                </button>
              );
            })}
          </div>

          <div className="mt-3 border-t border-[var(--border)] pt-2.5">
            {selectedDate ? (
              <p className="text-[12px] font-medium text-[var(--violet)]">
                Selected: {formatDateWithWeekday(selectedDate, dateFormat)}
              </p>
            ) : (
              <p className="text-[12px] text-[var(--muted)]">
                {availableInMonth > 0
                  ? "Pick a day with attendance (dotted)."
                  : "No attendance days in this month."}
              </p>
            )}
          </div>
        </div>
      ) : null}
    </div>
  );
}

function RequestRowActions({ requestId, canCancel, onView, onCancel }) {
  const [open, setOpen] = useState(false);
  const [coords, setCoords] = useState({ top: 0, left: 0 });
  const buttonRef = useRef(null);

  useEffect(() => {
    if (!open) return undefined;

    function placeMenu() {
      const rect = buttonRef.current?.getBoundingClientRect();
      if (!rect) return;
      const menuWidth = 176;
      const left = Math.min(
        Math.max(8, rect.right - menuWidth),
        window.innerWidth - menuWidth - 8
      );
      setCoords({ top: rect.bottom + 6, left });
    }

    placeMenu();

    function onDocClick(event) {
      if (
        buttonRef.current?.contains(event.target) ||
        event.target.closest?.(`[data-overtime-menu="${requestId}"]`)
      ) {
        return;
      }
      setOpen(false);
    }

    function onReposition() {
      placeMenu();
    }

    document.addEventListener("mousedown", onDocClick);
    window.addEventListener("resize", onReposition);
    window.addEventListener("scroll", onReposition, true);
    return () => {
      document.removeEventListener("mousedown", onDocClick);
      window.removeEventListener("resize", onReposition);
      window.removeEventListener("scroll", onReposition, true);
    };
  }, [open, requestId]);

  return (
    <>
      <button
        ref={buttonRef}
        type="button"
        className="inline-flex h-8 w-8 items-center justify-center rounded-lg border border-[var(--border)] bg-[var(--surface)] text-[var(--muted)] transition hover:bg-[var(--panel-soft)] hover:text-[var(--text)]"
        aria-label="Row actions"
        aria-expanded={open}
        onClick={(event) => {
          event.stopPropagation();
          setOpen((v) => !v);
        }}
      >
        <MoreVertical className="h-4 w-4" />
      </button>

      {open && typeof document !== "undefined"
        ? createPortal(
            <div
              data-overtime-menu={requestId}
              className="fixed z-[9999] w-44 overflow-hidden rounded-xl border border-[var(--border)] bg-[var(--surface)] shadow-[0_12px_32px_rgba(15,23,42,0.18)]"
              style={{ top: coords.top, left: coords.left }}
            >
              <button
                type="button"
                className="flex w-full items-center gap-2 px-3 py-2.5 text-left text-[13px] font-semibold text-[var(--text)] hover:bg-[var(--panel-soft)]"
                onClick={() => {
                  setOpen(false);
                  onView?.();
                }}
              >
                <Eye className="h-4 w-4 text-[var(--violet)]" />
                View
              </button>
              {canCancel ? (
                <button
                  type="button"
                  className="flex w-full items-center gap-2 px-3 py-2.5 text-left text-[13px] font-semibold text-[var(--danger)] hover:bg-[var(--danger-soft)]"
                  onClick={() => {
                    setOpen(false);
                    onCancel?.();
                  }}
                >
                  <X className="h-4 w-4" />
                  Cancel
                </button>
              ) : null}
            </div>,
            document.body
          )
        : null}
    </>
  );
}

function StatCard({ label, value, icon: Icon, tone }) {
  return (
    <div className="rounded-2xl border border-[var(--border)] bg-[var(--surface)] p-4 shadow-[var(--card-shadow)]">
      <div className="flex items-start justify-between gap-3">
        <div>
          <p className="text-[11px] font-semibold uppercase tracking-wide text-[var(--muted)]">
            {label}
          </p>
          <p className="mt-1.5 text-[22px] font-bold tabular-nums text-[var(--text)]">
            {value}
          </p>
        </div>
        <span
          className={`inline-flex h-10 w-10 items-center justify-center rounded-xl ${tone}`}
        >
          <Icon className="h-5 w-5" />
        </span>
      </div>
    </div>
  );
}

function ApprovalProgress({ currentLevel, totalLevels, levelName, status }) {
  const total = Math.max(1, Number(totalLevels) || 1);
  const current = Math.max(1, Number(currentLevel) || 1);
  const statusLower = String(status || "").toLowerCase();
  const isClosed =
    statusLower === "cancelled" ||
    statusLower === "canceled" ||
    statusLower === "rejected";

  return (
    <div className="rounded-2xl border border-[var(--border)] bg-[var(--surface)] p-5 shadow-[var(--card-shadow)]">
      <div className="mb-5 flex items-center justify-between gap-2 border-b border-[var(--border)] pb-4">
        <div>
          <p className="text-[11px] font-semibold uppercase tracking-wide text-[var(--muted)]">
            Workflow
          </p>
          <h3 className="mt-0.5 text-[15px] font-semibold text-[var(--text)]">
            Approval progress
          </h3>
        </div>
        <span className="rounded-full bg-[var(--lavender-soft)] px-2.5 py-1 text-[11px] font-semibold text-[var(--violet)]">
          {total} level{total === 1 ? "" : "s"}
        </span>
      </div>
      <ol className="space-y-0">
        {Array.from({ length: total }, (_, index) => {
          const level = index + 1;
          const isCurrent =
            level === current && statusLower === "pending" && !isClosed;
          const isDone =
            statusLower === "approved" ||
            (statusLower === "pending" && level < current);
          const isFailedHere = isClosed && level === current;

          let stateLabel = "Waiting";
          if (isDone) stateLabel = "Completed";
          else if (isFailedHere) stateLabel = "Cancelled";
          else if (isCurrent) stateLabel = "In review";

          return (
            <li key={level} className="relative flex gap-3.5 pb-6 last:pb-0">
              {level < total ? (
                <span
                  className={`absolute left-[15px] top-9 h-[calc(100%-24px)] w-px ${
                    isDone ? "bg-[var(--success)]/40" : "bg-[var(--border)]"
                  }`}
                  aria-hidden
                />
              ) : null}
              <span
                className={`relative z-[1] inline-flex h-8 w-8 shrink-0 items-center justify-center rounded-full border-2 text-[12px] font-bold ${
                  isDone
                    ? "border-[var(--success)] bg-[var(--success)] text-white"
                    : isFailedHere
                      ? "border-[var(--danger)] bg-[var(--danger)] text-white"
                      : isCurrent
                        ? "border-[var(--violet)] bg-[var(--violet)] text-white shadow-[0_0_0_4px_var(--lavender-soft)]"
                        : "border-[var(--border)] bg-[var(--surface)] text-[var(--muted)]"
                }`}
              >
                {isDone ? <CheckCircle2 className="h-4 w-4" /> : level}
              </span>
              <div className="min-w-0 flex-1 pt-0.5">
                <p className="text-[13px] font-semibold text-[var(--text)]">
                  {level === current && levelName
                    ? levelName
                    : `Approval Level ${level}`}
                </p>
                <p
                  className={`mt-0.5 text-[12px] font-medium ${
                    isFailedHere
                      ? "text-[var(--danger)]"
                      : isCurrent
                        ? "text-[var(--violet)]"
                        : isDone
                          ? "text-[var(--success)]"
                          : "text-[var(--muted)]"
                  }`}
                >
                  {stateLabel}
                  {isCurrent ? " · current" : ""}
                </p>
              </div>
            </li>
          );
        })}
      </ol>
    </div>
  );
}

function DetailField({ icon: Icon, label, children, className = "" }) {
  return (
    <div className={`min-w-0 ${className}`}>
      <dt className="inline-flex items-center gap-1.5 text-[11px] font-semibold uppercase tracking-wide text-[var(--muted)]">
        {Icon ? <Icon className="h-3.5 w-3.5 text-[var(--violet)]" /> : null}
        {label}
      </dt>
      <dd className="mt-1.5 text-[13px] font-medium leading-snug text-[var(--text)]">
        {children}
      </dd>
    </div>
  );
}

export function OvertimeView({
  timeFormat = "12h",
  dateFormat = "DD/MM/YYYY",
}) {
  const [status, setStatus] = useState("all");
  const [page, setPage] = useState(1);
  const [limit, setLimit] = useState(10);
  const [listQuery, setListQuery] = useState("");
  const [dateFrom, setDateFrom] = useState("");
  const [dateTo, setDateTo] = useState("");
  const [draftDateFrom, setDraftDateFrom] = useState("");
  const [draftDateTo, setDraftDateTo] = useState("");
  const [showForm, setShowForm] = useState(false);
  const [selected, setSelected] = useState(null);

  const [form, setForm] = useState(emptyForm);
  const [historyOptions, setHistoryOptions] = useState([]);
  const [historyLoading, setHistoryLoading] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [cancellingId, setCancellingId] = useState(null);
  const [formError, setFormError] = useState("");
  const [flash, setFlash] = useState("");
  const [flashTone, setFlashTone] = useState("success");

  const { rows, meta, loading, error, refetch } = useOvertimeList({
    status,
    page,
    limit,
  });
  const { stats, refetch: refetchStats } = useOvertimeStats();

  useEffect(() => {
    setDraftDateFrom(dateFrom);
    setDraftDateTo(dateTo);
  }, [dateFrom, dateTo]);

  const dateFilterCount = countActiveDateFilters(dateFrom, dateTo);

  const filteredRows = useMemo(() => {
    const q = listQuery.trim().toLowerCase();
    return (rows || []).filter((row) => {
      if (
        (dateFrom || dateTo) &&
        !dateInRange(
          row.attendanceDate || row.createdAt,
          dateFrom,
          dateTo
        )
      ) {
        return false;
      }
      if (!q) return true;
      const hay = [
        row.reason,
        row.status,
        row.statusLabel,
        row.levelName,
        row.attendanceDate,
        row.overtimeMinutes != null
          ? formatOtDuration(row.overtimeMinutes)
          : "",
      ]
        .filter(Boolean)
        .join(" ")
        .toLowerCase();
      return hay.includes(q);
    });
  }, [rows, listQuery, dateFrom, dateTo]);

  useEffect(() => {
    let alive = true;
    (async () => {
      setHistoryLoading(true);
      try {
        const now = new Date();
        const fromDate = new Date(now.getFullYear(), now.getMonth() - 2, 1);
        const from = `${fromDate.getFullYear()}-${String(fromDate.getMonth() + 1).padStart(2, "0")}-01`;
        const to = `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, "0")}-${String(now.getDate()).padStart(2, "0")}`;
        const res = await getAttendanceHistory({ from, to, page: 1, limit: 90 });
        if (!alive) return;
        const options = (res.rows || [])
          .map((row) => {
            const logId = resolveLogId(row);
            if (!logId) return null;
            return { ...row, logId };
          })
          .filter(Boolean);
        setHistoryOptions(options);
      } catch {
        if (alive) setHistoryOptions([]);
      } finally {
        if (alive) setHistoryLoading(false);
      }
    })();
    return () => {
      alive = false;
    };
  }, []);

  const selectedLog = useMemo(
    () => historyOptions.find((row) => row.logId === form.logId) || null,
    [historyOptions, form.logId]
  );

  const logsByDate = useMemo(() => {
    const map = new Map();
    for (const row of historyOptions) {
      const key = toDateInputValue(row.attendanceDate);
      if (!key) continue;
      if (!map.has(key)) map.set(key, row);
    }
    return map;
  }, [historyOptions]);

  const total = Number(meta?.total) || 0;
  const currentPage = Number(meta?.page) || page;
  const totalPages = Math.max(1, Number(meta?.totalPages) || 1);

  const columns = useMemo(
    () => [
      {
        id: "serial",
        header: "#",
        headerClassName: "w-12",
        cellClassName: "tabular-nums text-[var(--muted)]",
        cell: (_row, { index }) => rowSerial(index, currentPage, limit),
      },
      {
        id: "attendanceDate",
        header: "Attendance Date",
        cellClassName: "whitespace-nowrap font-medium text-[var(--text)]",
        cell: (row) => (
          <span className="inline-flex items-center gap-1.5">
            <CalendarDays className="h-3.5 w-3.5 text-[var(--violet)]" />
            {formatDateWithWeekday(row.attendanceDate, dateFormat)}
          </span>
        ),
      },
      {
        id: "overtime",
        header: "Overtime",
        cellClassName: "whitespace-nowrap tabular-nums text-[var(--text)]",
        cell: (row) => (
          <span className="inline-flex items-center gap-1.5">
            <Clock3 className="h-3.5 w-3.5 text-[var(--violet)]" />
            {formatOtDuration(row.overtimeMinutes)}
          </span>
        ),
      },
      {
        id: "reason",
        header: "Reason",
        cellClassName: "max-w-[220px] truncate text-[var(--muted)]",
        cell: (row) => row.reason || "—",
      },
      {
        id: "status",
        header: "Status",
        cellClassName: "whitespace-nowrap",
        cell: (row) => {
          const label = normalizeStatusLabel(row.status, row.statusLabel);
          return (
            <div className="flex flex-col gap-0.5">
              <span
                className={`inline-flex w-fit rounded-full border px-2.5 py-0.5 text-[11px] font-semibold capitalize ${statusTone(row.status)}`}
              >
                {label}
              </span>
              {row.levelName ? (
                <span className="text-[10px] text-[var(--muted)]">
                  {row.levelName}
                </span>
              ) : null}
            </div>
          );
        },
      },
      {
        id: "level",
        header: "Level",
        cellClassName: "whitespace-nowrap text-[var(--muted)]",
        cell: (row) =>
          row.currentLevel != null && row.totalLevels != null
            ? `${row.currentLevel} of ${row.totalLevels}`
            : row.currentLevel != null
              ? String(row.currentLevel)
              : "—",
      },
      {
        id: "created",
        header: "Created",
        cellClassName: "whitespace-nowrap text-[var(--muted)]",
        cell: (row) =>
          row.createdAt
            ? formatDateTime(row.createdAt, dateFormat, timeFormat)
            : "—",
      },
      {
        id: "action",
        header: "Action",
        cell: (row) => {
          const isPending =
            String(row.status || "").toLowerCase() === "pending";
          return (
            <RequestRowActions
              requestId={row.otRequestId}
              canCancel={isPending}
              onView={() => setSelected(row)}
              onCancel={() => handleCancel(row.otRequestId)}
            />
          );
        },
      },
    ],
    // handleCancel is stable enough via closure; columns refresh with list state
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [currentPage, limit, dateFormat, timeFormat]
  );

  function refreshAll() {
    refetch();
    refetchStats();
  }

  function onPickAttendanceDay(dateKey, log) {
    const row = log || logsByDate.get(dateKey);
    if (!row) {
      setForm((prev) => ({
        ...prev,
        logId: "",
        attendanceDate: dateKey || "",
      }));
      return;
    }
    const otHours = Number(row.overtimeHours);
    let overtimeMinutes = form.overtimeMinutes;
    if (!Number.isNaN(otHours) && otHours > 0) {
      overtimeMinutes = String(Math.round(otHours * 60));
    }
    setForm((prev) => ({
      ...prev,
      logId: row.logId,
      attendanceDate: toDateInputValue(row.attendanceDate) || dateKey,
      overtimeMinutes,
    }));
  }

  async function handleSubmit(event) {
    event.preventDefault();
    setFormError("");

    if (!form.logId || !form.attendanceDate) {
      setFormError("Please select an attendance day for this overtime.");
      return;
    }
    const overtimeMinutes = Math.round(Number(form.overtimeMinutes) || 0);
    if (overtimeMinutes < 1) {
      setFormError("Enter overtime duration of at least 1 minute.");
      return;
    }
    if (!form.reason.trim()) {
      setFormError("Please provide a reason for the overtime.");
      return;
    }

    setSubmitting(true);
    try {
      await submitOvertime({
        attendanceDate: form.attendanceDate,
        overtimeMinutes,
        reason: form.reason.trim(),
        logId: form.logId,
      });
      setShowForm(false);
      setForm(emptyForm());
      setFlashTone("success");
      setFlash("Overtime request submitted for approval.");
      setStatus("all");
      setPage(1);
      refreshAll();
    } catch (err) {
      setFormError(err?.message || "Failed to submit overtime request.");
    } finally {
      setSubmitting(false);
    }
  }

  async function handleCancel(requestId) {
    if (!requestId) return;
    if (!window.confirm("Cancel this pending overtime request?")) return;

    setCancellingId(requestId);
    try {
      const res = await cancelOvertime(requestId);
      setFlashTone("success");
      setFlash(res?.message || "Overtime request cancelled.");
      if (selected?.otRequestId === requestId) setSelected(null);
      refreshAll();
    } catch (err) {
      setFlashTone("danger");
      setFlash(err?.message || "Failed to cancel request.");
    } finally {
      setCancellingId(null);
    }
  }

  return (
    <PortalPage
      fill
      title="Overtime"
      subtitle="Submit and track overtime requests for extra hours worked."
      actions={
        <>
          <Button
            type="button"
            variant="outline"
            className="h-10 rounded-xl"
            onClick={refreshAll}
          >
            <RefreshCw className="h-4 w-4" />
            Refresh
          </Button>
          <Button
            type="button"
            className="h-10 rounded-xl"
            onClick={() => {
              setShowForm(true);
              setFormError("");
            }}
          >
            <Plus className="h-4 w-4" />
            New Overtime Request
          </Button>
        </>
      }
    >

      <CollapsibleSection title="Summary">
      <div className="grid grid-cols-2 gap-3 lg:grid-cols-4">
        <StatCard
          label="Total Requests"
          value={stats.total}
          icon={Inbox}
          tone="bg-[var(--info-soft)] text-[var(--info)]"
        />
        <StatCard
          label="Pending"
          value={stats.pending}
          icon={Hourglass}
          tone="bg-[var(--lavender-soft)] text-[var(--violet)]"
        />
        <StatCard
          label="Approved"
          value={stats.approved}
          icon={CheckCircle2}
          tone="bg-[var(--success-soft)] text-[var(--success)]"
        />
        <StatCard
          label="Cancelled"
          value={stats.cancelled}
          icon={XCircle}
          tone="bg-[var(--danger-soft)] text-[var(--danger)]"
        />
      </div>
      </CollapsibleSection>

      {flash ? (
        <FlashBanner
          message={flash}
          tone={flashTone}
          duration={4000}
          onDismiss={() => setFlash("")}
        />
      ) : null}

      <TablePanel
        title="Overtime Logs"
        tabs={[
          { value: "all", label: "All" },
          { value: "pending", label: "Pending" },
          { value: "approved", label: "Approved" },
          { value: "cancelled", label: "Cancelled" },
        ]}
        tab={status}
        onTabChange={(next) => {
          setStatus(next);
          setPage(1);
        }}
        recordCount={
          listQuery.trim() || dateFilterCount > 0
            ? filteredRows.length
            : total
        }
        search={listQuery}
        onSearchChange={setListQuery}
        searchPlaceholder="Search date, reason, status…"
        filterActive={dateFilterCount > 0}
        activeFilterCount={dateFilterCount}
        drawerFields={
          <>
            <FilterDate
              label="From date"
              value={draftDateFrom}
              onChange={setDraftDateFrom}
              max={draftDateTo || undefined}
              clearable
            />
            <FilterDate
              label="To date"
              value={draftDateTo}
              onChange={setDraftDateTo}
              min={draftDateFrom || undefined}
              clearable
            />
          </>
        }
        onApplyFilters={() => {
          setDateFrom(draftDateFrom);
          setDateTo(draftDateTo);
          setPage(1);
        }}
        onResetFilters={() => {
          setDraftDateFrom("");
          setDraftDateTo("");
          setDateFrom("");
          setDateTo("");
          setPage(1);
        }}
        onRefresh={refreshAll}
        columns={columns}
        rows={filteredRows}
        getRowKey={(row) => row.otRequestId}
        minWidth="900px"
        loading={loading}
        loadingLabel="Loading requests"
        loadingHint="Fetching overtime requests…"
        error={error}
        emptyIcon={Inbox}
        emptyTitle={`No ${status === "all" ? "" : `${status} `}requests`}
        emptyHint="Submit a request when you work beyond your scheduled hours."
        emptyAction={
          <Button
            type="button"
            className="h-10 rounded-xl"
            onClick={() => setShowForm(true)}
          >
            <Plus className="h-4 w-4" />
            New Overtime Request
          </Button>
        }
        page={currentPage}
        pageSize={limit}
        total={
          listQuery.trim() || dateFilterCount > 0
            ? filteredRows.length
            : total
        }
        totalPages={
          listQuery.trim() || dateFilterCount > 0 ? 1 : totalPages
        }
        onPageChange={setPage}
        onPageSizeChange={(n) => {
          setLimit(n);
          setPage(1);
        }}
      />

      <SlideOver
        open={showForm}
        onClose={() => {
          setShowForm(false);
          setFormError("");
        }}
        title="New Overtime Request"
        subtitle="Submit a new overtime request for approval"
        wide
      >
        <form className="flex min-h-full flex-col pb-6" onSubmit={handleSubmit}>
          <div className="flex-1 space-y-5">
            <div className="flex items-center gap-3">
              <span className="inline-flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-[var(--lavender-soft)] text-[var(--violet)]">
                <Clock3 className="h-4 w-4" />
              </span>
              <div className="min-w-0">
                <h3 className="text-[15px] font-semibold text-[var(--text)]">
                  Overtime details
                </h3>
                <p className="mt-0.5 text-[12px] text-[var(--muted)]">
                  Date, minutes, and reason for approval
                </p>
              </div>
            </div>

            <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 sm:gap-x-4 sm:gap-y-4">
              <div className="min-w-0">
                <label className="block text-[12px] font-semibold text-[var(--text)]">
                  Select date <span className="text-[var(--danger)]">*</span>
                </label>
                <div className="mt-1.5">
                  <AttendanceDayPicker
                    logsByDate={logsByDate}
                    selectedDate={form.attendanceDate}
                    onSelect={onPickAttendanceDay}
                    dateFormat={dateFormat}
                    loading={historyLoading}
                  />
                </div>
                <p className="mt-1.5 text-[11px] leading-snug text-[var(--muted)]">
                  Attendance date with a recorded work log
                </p>
              </div>

              <div className="min-w-0">
                <label className="block text-[12px] font-semibold text-[var(--text)]">
                  Overtime minutes{" "}
                  <span className="text-[var(--danger)]">*</span>
                </label>
                <div className="relative mt-1.5">
                  <input
                    type="number"
                    required
                    min="1"
                    step="1"
                    placeholder="Enter overtime minutes"
                    className="h-11 w-full rounded-xl border border-[var(--border)] bg-[var(--surface)] px-3 pr-[4.25rem] text-[13px] text-[var(--text)] outline-none transition focus:border-[var(--violet)] focus:ring-2 focus:ring-[var(--lavender-soft)]"
                    value={form.overtimeMinutes}
                    onChange={(e) =>
                      setForm((prev) => ({
                        ...prev,
                        overtimeMinutes: e.target.value,
                      }))
                    }
                  />
                  <span className="pointer-events-none absolute inset-y-[1px] right-[1px] flex w-14 items-center justify-center rounded-r-[11px] bg-[var(--panel-soft)] text-[12px] font-semibold text-[var(--muted)]">
                    Mins
                  </span>
                </div>
                <p className="mt-1.5 text-[11px] leading-snug text-[var(--muted)]">
                  Enter total minutes of overtime worked
                  {Number(form.overtimeMinutes) > 0
                    ? ` · ${formatOtDuration(form.overtimeMinutes)}`
                    : ""}
                </p>
              </div>

              <div className="min-w-0 sm:col-span-2">
                <p className="text-[12px] font-semibold text-[var(--text)]">
                  Work log
                </p>
                <div className="mt-1.5 flex min-h-11 items-center rounded-xl border border-[var(--border)] bg-[var(--panel-soft)] px-3 py-2.5">
                  {selectedLog ? (
                    <div className="flex min-w-0 flex-wrap items-center gap-x-2 gap-y-0.5 text-[13px]">
                      <span className="font-semibold text-[var(--text)]">
                        {formatDateWithWeekday(form.attendanceDate, dateFormat)}
                      </span>
                      {selectedLog.checkInTime || selectedLog.checkOutTime ? (
                        <span className="text-[var(--muted)]">
                          ·{" "}
                          {formatTime(selectedLog.checkInTime, timeFormat)} →{" "}
                          {formatTime(selectedLog.checkOutTime, timeFormat)}
                        </span>
                      ) : (
                        <span className="text-[var(--muted)]">
                          · Attendance log linked
                        </span>
                      )}
                    </div>
                  ) : (
                    <p className="text-[13px] text-[var(--muted)]">
                      Auto-selected from attendance
                    </p>
                  )}
                </div>
                <p className="mt-1.5 text-[11px] leading-snug text-[var(--muted)]">
                  Work log will be linked from your attendance
                </p>
              </div>

              <div className="min-w-0 sm:col-span-2">
                <label className="block text-[12px] font-semibold text-[var(--text)]">
                  Reason <span className="text-[var(--danger)]">*</span>
                </label>
                <textarea
                  required
                  rows={4}
                  placeholder="Enter reason for overtime"
                  className="mt-1.5 w-full resize-none rounded-xl border border-[var(--border)] bg-[var(--surface)] px-3 py-2.5 text-[13px] text-[var(--text)] outline-none transition focus:border-[var(--violet)] focus:ring-2 focus:ring-[var(--lavender-soft)]"
                  value={form.reason}
                  onChange={(e) =>
                    setForm((prev) => ({ ...prev, reason: e.target.value }))
                  }
                />
                <p className="mt-1.5 text-[11px] leading-snug text-[var(--muted)]">
                  Provide a valid reason for overtime request
                </p>
              </div>
            </div>

            {formError ? (
              <FlashBanner
                message={formError}
                tone="danger"
                compact
                duration={5000}
                onDismiss={() => setFormError("")}
              />
            ) : null}
          </div>

          <div className="sticky bottom-0 -mx-5 mt-6 border-t border-[var(--border)] bg-[var(--surface)] px-5 pt-4">
            <div className="flex items-center justify-end gap-2">
              <Button
                type="button"
                variant="outline"
                className="h-11 min-w-[100px] rounded-xl"
                onClick={() => {
                  setShowForm(false);
                  setForm(emptyForm());
                  setFormError("");
                }}
              >
                Cancel
              </Button>
              <Button
                type="submit"
                className="h-11 min-w-[160px] rounded-xl"
                disabled={submitting}
              >
                <Send className="h-4 w-4" />
                {submitting ? "Submitting…" : "Submit request"}
              </Button>
            </div>
          </div>
        </form>
      </SlideOver>

      <SlideOver
        open={Boolean(selected)}
        onClose={() => setSelected(null)}
        title="Overtime details"
        subtitle={
          selected
            ? [
                selected.attendanceDate
                  ? formatDateWithWeekday(selected.attendanceDate, dateFormat)
                  : null,
                selected.overtimeMinutes != null
                  ? formatOtDuration(selected.overtimeMinutes)
                  : null,
              ]
                .filter(Boolean)
                .join(" · ") || undefined
            : undefined
        }
      >
        {selected ? (
          <div className="space-y-4 pb-8">
            <div className="flex flex-wrap items-center justify-between gap-3 rounded-2xl border border-[var(--border)] bg-gradient-to-br from-[var(--lavender-soft)]/70 via-[var(--surface)] to-[var(--surface)] px-4 py-3.5">
              <div className="min-w-0">
                <p className="text-[11px] font-semibold uppercase tracking-wide text-[var(--muted)]">
                  Status
                </p>
                <div className="mt-1.5 flex flex-wrap items-center gap-2">
                  <span
                    className={`inline-flex rounded-full border px-3 py-1 text-[12px] font-semibold capitalize ${statusTone(selected.status)}`}
                  >
                    {normalizeStatusLabel(
                      selected.status,
                      selected.statusLabel
                    )}
                  </span>
                  {selected.levelName ? (
                    <span className="text-[12px] text-[var(--muted)]">
                      {selected.levelName}
                      {selected.totalLevels != null
                        ? ` · ${selected.currentLevel || 1}/${selected.totalLevels}`
                        : ""}
                    </span>
                  ) : null}
                </div>
              </div>
              {String(selected.status || "").toLowerCase() === "pending" ? (
                <Button
                  type="button"
                  variant="outline"
                  className="h-9 rounded-xl text-[var(--danger)]"
                  disabled={cancellingId === selected.otRequestId}
                  onClick={() => handleCancel(selected.otRequestId)}
                >
                  <XCircle className="h-4 w-4" />
                  {cancellingId === selected.otRequestId
                    ? "Cancelling…"
                    : "Cancel request"}
                </Button>
              ) : null}
            </div>

            <section className="rounded-2xl border border-[var(--border)] bg-[var(--surface)] p-5 shadow-[var(--card-shadow)]">
              <div className="mb-4 border-b border-[var(--border)] pb-3">
                <p className="text-[11px] font-semibold uppercase tracking-wide text-[var(--muted)]">
                  Overview
                </p>
                <h3 className="mt-0.5 text-[15px] font-semibold text-[var(--text)]">
                  Request details
                </h3>
              </div>

              <dl className="grid grid-cols-1 gap-x-6 gap-y-5 sm:grid-cols-2">
                <DetailField icon={CalendarDays} label="Attendance date">
                  {formatDateWithWeekday(selected.attendanceDate, dateFormat)}
                </DetailField>

                <DetailField icon={Clock3} label="Overtime">
                  <span className="tabular-nums">
                    {formatOtDuration(selected.overtimeMinutes)}
                  </span>
                </DetailField>

                <DetailField icon={Clock3} label="Submitted" className="sm:col-span-2">
                  {selected.createdAt
                    ? formatDateTime(
                        selected.createdAt,
                        dateFormat,
                        timeFormat
                      )
                    : "—"}
                </DetailField>

                <DetailField label="Reason" className="sm:col-span-2">
                  <p className="whitespace-pre-wrap font-normal leading-relaxed text-[var(--text)]">
                    {selected.reason || "—"}
                  </p>
                </DetailField>
              </dl>
            </section>

            <ApprovalProgress
              currentLevel={selected.currentLevel}
              totalLevels={selected.totalLevels}
              levelName={selected.levelName}
              status={selected.status}
            />
          </div>
        ) : null}
      </SlideOver>
    </PortalPage>
  );
}
