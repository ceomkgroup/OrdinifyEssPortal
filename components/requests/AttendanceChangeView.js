"use client";

import {
  ArrowRight,
  ChevronLeft,
  ChevronRight,
  Clock3,
  Eye,
  FilePenLine,
  Inbox,
  MoreVertical,
  Plus,
  RefreshCw,
  Send,
} from "lucide-react";
import { useEffect, useMemo, useRef, useState } from "react";
import { createPortal } from "react-dom";
import { useSearchParams } from "next/navigation";
import { Button } from "@/components/ui/Button";
import { Card } from "@/components/ui/Card";
import { FlashBanner } from "@/components/ui/FlashBanner";
import { SlideOver } from "@/components/ui/SlideOver";
import { PageLoader } from "@/components/ui/Spinner";
import { getAttendanceHistory } from "@/api/attendance";
import {
  cancelAttendanceChange,
  submitAttendanceChange,
  useAttendanceChangeDetail,
  useAttendanceChangeList,
} from "@/hooks/useAttendanceChange";
import { formatDate, formatDateTime, formatTime } from "@/lib/format";

const STATUS_FILTERS = [
  { value: "all", label: "All" },
  { value: "pending", label: "Pending" },
  { value: "approved", label: "Approved" },
  { value: "rejected", label: "Rejected" },
];

const fieldClass =
  "mt-1.5 h-11 w-full rounded-xl border border-[var(--border)] bg-[var(--surface)] px-3 text-[13px] text-[var(--text)] outline-none transition focus:border-[var(--violet)] focus:ring-2 focus:ring-[var(--lavender-soft)]";

function statusTone(status) {
  const s = String(status || "").toLowerCase();
  if (s === "approved") {
    return "border-[var(--success)]/25 bg-[var(--success-soft)] text-[var(--success)]";
  }
  if (s === "rejected" || s === "cancelled") {
    return "border-[var(--danger)]/25 bg-[var(--danger-soft)] text-[var(--danger)]";
  }
  if (s === "pending") {
    return "border-[var(--violet)]/25 bg-[var(--lavender-soft)] text-[var(--violet)]";
  }
  return "border-[var(--border)] bg-[var(--panel-soft)] text-[var(--muted)]";
}

/** Decision timestamp when approved / rejected (API field names vary). */
function getDecisionAt(row) {
  if (!row) return null;
  const status = String(row.status || "").toLowerCase();
  if (status === "approved") {
    return (
      row.approvedAt ||
      row.decidedAt ||
      row.processedAt ||
      row.statusUpdatedAt ||
      row.updatedAt ||
      null
    );
  }
  if (status === "rejected") {
    return (
      row.rejectedAt ||
      row.decidedAt ||
      row.processedAt ||
      row.statusUpdatedAt ||
      row.updatedAt ||
      null
    );
  }
  return null;
}

function getDecisionLabel(status) {
  const s = String(status || "").toLowerCase();
  if (s === "approved") return "Approved";
  if (s === "rejected") return "Rejected";
  return null;
}

function RequestRowActions({ requestId, onView }) {
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
      setCoords({
        top: rect.bottom + 6,
        left,
      });
    }

    placeMenu();

    function onDocClick(event) {
      if (
        buttonRef.current?.contains(event.target) ||
        event.target.closest?.(`[data-request-menu="${requestId}"]`)
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
              data-request-menu={requestId}
              className="fixed z-[9999] w-44 overflow-hidden rounded-xl border border-[var(--border)] bg-[var(--surface)] shadow-[0_12px_32px_rgba(15,23,42,0.18)]"
              style={{ top: coords.top, left: coords.left }}
            >
              <button
                type="button"
                className="flex w-full items-center gap-2 px-3 py-2.5 text-left text-[13px] font-semibold text-[var(--text)] hover:bg-[var(--panel-soft)]"
                onClick={() => {
                  setOpen(false);
                  onView?.(requestId);
                }}
              >
                <Eye className="h-4 w-4 text-[var(--violet)]" />
                View details
              </button>
            </div>,
            document.body
          )
        : null}
    </>
  );
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

function toTimeInputValue(iso) {
  if (!iso) return "";
  const d = new Date(iso);
  if (Number.isNaN(d.getTime())) return "";
  return `${String(d.getHours()).padStart(2, "0")}:${String(d.getMinutes()).padStart(2, "0")}`;
}

function toIsoFromLocal(dateStr, timeStr) {
  if (!dateStr || !timeStr) return null;
  const [y, m, d] = dateStr.split("-").map(Number);
  const [hh, mm] = timeStr.split(":").map(Number);
  if (![y, m, d, hh, mm].every((n) => Number.isFinite(n))) return null;
  return new Date(y, m - 1, d, hh, mm, 0, 0).toISOString();
}

function emptyForm() {
  return {
    logId: "",
    attendanceDate: "",
    checkInTime: "",
    checkOutTime: "",
    reason: "",
  };
}

function Info({ label, value }) {
  return (
    <div className="rounded-xl border border-[var(--border)] bg-[var(--panel-soft)] px-3 py-2.5">
      <p className="text-[11px] text-[var(--muted)]">{label}</p>
      <p className="mt-1 text-[13px] font-semibold tabular-nums text-[var(--text)]">
        {value || "—"}
      </p>
    </div>
  );
}

function RequestDetailPanel({
  open,
  requestId,
  onClose,
  onCancelled,
  timeFormat = "12h",
  dateFormat = "DD/MM/YYYY",
}) {
  const { detail, loading, error, refetch } = useAttendanceChangeDetail(
    open ? requestId : null
  );
  const [cancelling, setCancelling] = useState(false);
  const [actionError, setActionError] = useState("");
  const [actionSuccess, setActionSuccess] = useState("");

  async function handleCancel() {
    if (!requestId) return;
    setActionError("");
    setActionSuccess("");
    setCancelling(true);
    try {
      const res = await cancelAttendanceChange(requestId);
      setActionSuccess(res?.message || "Request cancelled.");
      await refetch();
      onCancelled?.();
    } catch (err) {
      setActionError(err.message || "Unable to cancel request.");
    } finally {
      setCancelling(false);
    }
  }

  const isPending = String(detail?.status || "").toLowerCase() === "pending";
  const statusLabel = detail?.statusLabel || detail?.status || "—";

  return (
    <SlideOver
      open={open}
      onClose={onClose}
      title="Correction details"
      subtitle="Compare original vs requested times"
      wide
    >
      {loading ? (
        <PageLoader
          compact
          label="Loading details"
          hint="Fetching this correction…"
        />
      ) : error ? (
        <p className="rounded-xl bg-[var(--danger-soft)] px-3 py-2.5 text-sm text-[var(--danger)]">
          {error}
        </p>
      ) : !detail ? (
        <p className="text-sm text-[var(--muted)]">Request not found.</p>
      ) : (
        <div className="space-y-4 pb-6">
          <div className="flex flex-wrap items-center gap-2">
            <span
              className={`inline-flex rounded-full border px-3 py-1 text-[12px] font-semibold capitalize ${statusTone(detail.status)}`}
            >
              {statusLabel}
            </span>
            {detail.levelName ? (
              <span className="rounded-full bg-[var(--panel-soft)] px-2.5 py-1 text-[11px] font-medium text-[var(--muted)]">
                {detail.levelName}
                {detail.totalLevels != null
                  ? ` · ${detail.currentLevel || 1}/${detail.totalLevels}`
                  : ""}
              </span>
            ) : null}
          </div>

          <div className="grid gap-3 sm:grid-cols-2">
            <Info
              label="Attendance date"
              value={formatDate(
                detail.attendanceDate || detail.originalDate,
                dateFormat
              )}
            />
            <Info
              label="Submitted on"
              value={formatDateTime(detail.createdAt, dateFormat, timeFormat)}
            />
            {getDecisionAt(detail) ? (
              <Info
                label={`${getDecisionLabel(detail.status) || "Decided"} on`}
                value={formatDateTime(
                  getDecisionAt(detail),
                  dateFormat,
                  timeFormat
                )}
              />
            ) : null}
          </div>

          <div className="grid items-stretch gap-2 sm:grid-cols-[1fr_auto_1fr] sm:items-center">
            <div className="rounded-2xl border border-[var(--border)] bg-[var(--panel-soft)] p-4">
              <p className="text-[11px] font-semibold uppercase tracking-[0.08em] text-[var(--muted)]">
                Original
              </p>
              <p className="mt-3 text-[14px] font-semibold tabular-nums text-[var(--text)]">
                In {formatTime(detail.originalCheckIn, timeFormat)}
              </p>
              <p className="mt-1.5 text-[14px] font-semibold tabular-nums text-[var(--text)]">
                Out {formatTime(detail.originalCheckOut, timeFormat)}
              </p>
            </div>

            <div className="mx-auto flex h-9 w-9 items-center justify-center rounded-full bg-[var(--lavender-soft)] text-[var(--violet)]">
              <ArrowRight className="h-4 w-4" />
            </div>

            <div className="rounded-2xl border border-[var(--violet)]/30 bg-[var(--lavender-soft)] p-4">
              <p className="text-[11px] font-semibold uppercase tracking-[0.08em] text-[var(--violet)]">
                Requested
              </p>
              <p className="mt-3 text-[14px] font-semibold tabular-nums text-[var(--text)]">
                In {formatTime(detail.checkInTime, timeFormat)}
              </p>
              <p className="mt-1.5 text-[14px] font-semibold tabular-nums text-[var(--text)]">
                Out {formatTime(detail.checkOutTime, timeFormat)}
              </p>
            </div>
          </div>

          <div className="rounded-2xl border border-[var(--border)] bg-[var(--panel-soft)] px-4 py-3.5">
            <p className="text-[11px] font-semibold uppercase tracking-[0.08em] text-[var(--muted)]">
              Reason
            </p>
            <p className="mt-2 text-[14px] leading-relaxed text-[var(--text)]">
              {detail.reason || "—"}
            </p>
          </div>

          {actionError ? (
            <FlashBanner
              message={actionError}
              tone="danger"
              compact
              duration={5000}
              onDismiss={() => setActionError("")}
            />
          ) : null}
          {actionSuccess ? (
            <FlashBanner
              message={actionSuccess}
              tone="success"
              compact
              duration={4000}
              onDismiss={() => setActionSuccess("")}
            />
          ) : null}

          {isPending ? (
            <Button
              variant="outline"
              className="h-11 w-full rounded-xl border-[var(--danger)] text-[var(--danger)]"
              disabled={cancelling}
              onClick={handleCancel}
            >
              {cancelling ? "Cancelling..." : "Cancel pending request"}
            </Button>
          ) : (
            <p className="pt-1 text-center text-[12px] text-[var(--muted)]">
              Only pending requests can be cancelled.
            </p>
          )}
        </div>
      )}
    </SlideOver>
  );
}

export function AttendanceChangeView({
  timeFormat = "12h",
  dateFormat = "DD/MM/YYYY",
}) {
  const searchParams = useSearchParams();
  const prefillLogId = searchParams?.get("logId") || "";

  const [status, setStatus] = useState("all");
  const [page, setPage] = useState(1);
  const [limit] = useState(10);
  const [selectedId, setSelectedId] = useState(null);
  const [showForm, setShowForm] = useState(false);

  const [form, setForm] = useState(emptyForm);
  const [historyOptions, setHistoryOptions] = useState([]);
  const [historyLoading, setHistoryLoading] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [formError, setFormError] = useState("");
  const [formSuccess, setFormSuccess] = useState("");

  const { rows, meta, loading, error, refetch } = useAttendanceChangeList({
    status,
    page,
    limit,
  });

  useEffect(() => {
    let alive = true;
    (async () => {
      setHistoryLoading(true);
      try {
        const now = new Date();
        const fromDate = new Date(now.getFullYear(), now.getMonth() - 2, 1);
        const from = `${fromDate.getFullYear()}-${String(fromDate.getMonth() + 1).padStart(2, "0")}-01`;
        const to = `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, "0")}-${String(now.getDate()).padStart(2, "0")}`;
        const res = await getAttendanceHistory({ from, to, page: 1, limit: 60 });
        if (!alive) return;
        const options = res.rows || [];
        setHistoryOptions(options);

        if (prefillLogId) {
          const row = options.find((item) => item.logId === prefillLogId);
          if (row) {
            setForm({
              logId: row.logId,
              attendanceDate: toDateInputValue(row.attendanceDate),
              checkInTime: toTimeInputValue(row.checkInTime),
              checkOutTime: toTimeInputValue(row.checkOutTime),
              reason: "",
            });
            setShowForm(true);
          }
        }
      } catch {
        if (alive) setHistoryOptions([]);
      } finally {
        if (alive) setHistoryLoading(false);
      }
    })();
    return () => {
      alive = false;
    };
  }, [prefillLogId]);

  const total = Number(meta?.total) || 0;
  const currentPage = Number(meta?.page) || page;
  const totalPages = Math.max(1, Number(meta?.totalPages) || 1);

  const selectedLog = useMemo(
    () => historyOptions.find((row) => row.logId === form.logId) || null,
    [historyOptions, form.logId]
  );

  function onPickLog(logId) {
    const row = historyOptions.find((item) => item.logId === logId);
    if (!row) {
      setForm((prev) => ({ ...prev, logId }));
      return;
    }
    setForm((prev) => ({
      ...prev,
      logId: row.logId,
      attendanceDate: toDateInputValue(row.attendanceDate),
      checkInTime: toTimeInputValue(row.checkInTime),
      checkOutTime: toTimeInputValue(row.checkOutTime),
    }));
  }

  async function handleSubmit(event) {
    event.preventDefault();
    setFormError("");
    setFormSuccess("");

    if (!form.attendanceDate || !form.checkInTime || !form.checkOutTime) {
      setFormError("Date, check-in and check-out time are required.");
      return;
    }
    if (!form.reason.trim()) {
      setFormError("Please provide a reason for the correction.");
      return;
    }

    const checkInTime = toIsoFromLocal(form.attendanceDate, form.checkInTime);
    const checkOutTime = toIsoFromLocal(form.attendanceDate, form.checkOutTime);
    if (!checkInTime || !checkOutTime) {
      setFormError("Invalid date or time.");
      return;
    }
    if (new Date(checkOutTime) <= new Date(checkInTime)) {
      setFormError("Check-out must be after check-in.");
      return;
    }

    setSubmitting(true);
    try {
      const payload = {
        attendanceDate: form.attendanceDate,
        checkInTime,
        checkOutTime,
        reason: form.reason.trim(),
      };
      if (form.logId) payload.logId = form.logId;

      const res = await submitAttendanceChange(payload);
      setFormSuccess(
        res?.message ||
          "Attendance change request submitted (pending approval)."
      );
      setForm(emptyForm());
      setShowForm(false);
      setPage(1);
      refetch();
    } catch (err) {
      setFormError(err.message || "Failed to submit request.");
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <div className="space-y-4">
      <section className="overflow-hidden rounded-[14px] border border-[var(--border)] bg-[var(--surface)] shadow-[var(--card-shadow)]">
        <div className="flex flex-col gap-4 bg-gradient-to-br from-[var(--lavender-soft)] via-[var(--surface)] to-[var(--surface)] p-4 md:flex-row md:items-center md:justify-between md:p-5">
          <div className="flex items-start gap-3">
            <span className="inline-flex h-12 w-12 shrink-0 items-center justify-center rounded-2xl bg-[var(--violet)] text-white shadow-sm">
              <FilePenLine className="h-6 w-6" />
            </span>
            <div>
              <h1 className="font-[family-name:var(--font-heading)] text-[24px] font-semibold text-[var(--text)]">
                Attendance Change
              </h1>
              <p className="mt-1 max-w-xl text-[13px] leading-relaxed text-[var(--muted)]">
                Wrong punch time? Submit a correction with date, in/out times,
                and reason. Pending requests can be cancelled anytime.
              </p>
            </div>
          </div>
          <div className="flex flex-wrap gap-2 md:justify-end">
            <Button
              type="button"
              variant="outline"
              className="h-10 rounded-xl"
              onClick={refetch}
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
                setFormSuccess("");
              }}
            >
              <Plus className="h-4 w-4" />
              New request
            </Button>
          </div>
        </div>
      </section>

      {formSuccess ? (
        <FlashBanner
          message={formSuccess}
          tone="success"
          duration={4000}
          onDismiss={() => setFormSuccess("")}
        />
      ) : null}

      <Card bodyClassName="!min-h-0">
        <div className="mb-4 flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
          <div>
            <h3 className="text-[15px] font-semibold text-[var(--text)]">
              My requests
            </h3>
            <p className="mt-0.5 text-[12px] text-[var(--muted)]">
              Track pending, approved and rejected corrections
            </p>
          </div>
          <div className="inline-flex rounded-xl border border-[var(--border)] bg-[var(--panel-soft)] p-1">
            {STATUS_FILTERS.map((opt) => {
              const active = status === opt.value;
              return (
                <button
                  key={opt.value}
                  type="button"
                  onClick={() => {
                    setStatus(opt.value);
                    setPage(1);
                  }}
                  className={`rounded-lg px-3 py-1.5 text-[12px] font-semibold transition ${
                    active
                      ? "bg-[var(--surface)] text-[var(--violet)] shadow-sm"
                      : "text-[var(--muted)] hover:text-[var(--text)]"
                  }`}
                >
                  {opt.label}
                </button>
              );
            })}
          </div>
        </div>

        {error ? (
          <FlashBanner
            message={error}
            tone="danger"
            className="mb-3"
            duration={5000}
            autoDismiss={false}
          />
        ) : null}

        {loading && rows.length === 0 ? (
          <PageLoader
            compact
            label="Loading requests"
            hint="Fetching attendance change requests…"
          />
        ) : rows.length === 0 ? (
          <div className="flex min-h-[200px] flex-col items-center justify-center rounded-2xl border border-dashed border-[var(--border)] bg-[var(--panel-soft)] px-4 text-center">
            <span className="inline-flex h-12 w-12 items-center justify-center rounded-2xl bg-[var(--lavender-soft)] text-[var(--violet)]">
              <Inbox className="h-6 w-6" />
            </span>
            <p className="mt-3 text-[14px] font-semibold text-[var(--text)]">
              No {status === "all" ? "" : `${status} `}requests
            </p>
            <p className="mt-1 max-w-sm text-[12px] text-[var(--muted)]">
              Submit a correction when a punch time looks wrong. You can also
              start from Attendance history actions.
            </p>
            <Button
              type="button"
              className="mt-4 h-10 rounded-xl"
              onClick={() => setShowForm(true)}
            >
              <Plus className="h-4 w-4" />
              New request
            </Button>
          </div>
        ) : (
          <>
            <div className="overflow-x-auto rounded-xl border border-[var(--border)]">
              <table className="min-w-full text-left text-[13px]">
                <thead>
                  <tr className="border-b border-[var(--border)] bg-[var(--panel-soft)] text-[11px] uppercase tracking-wide text-[var(--muted)]">
                    <th className="whitespace-nowrap px-3 py-2.5 font-semibold">
                      Submitted
                    </th>
                    <th className="whitespace-nowrap px-3 py-2.5 font-semibold">
                      Attendance date
                    </th>
                    <th className="whitespace-nowrap px-3 py-2.5 font-semibold">
                      Requested time
                    </th>
                    <th className="whitespace-nowrap px-3 py-2.5 font-semibold">
                      Original time
                    </th>
                    <th className="px-3 py-2.5 font-semibold">Reason</th>
                    <th className="whitespace-nowrap px-3 py-2.5 font-semibold">
                      Status
                    </th>
                    <th className="whitespace-nowrap px-3 py-2.5 font-semibold">
                      Decision
                    </th>
                    <th className="px-3 py-2.5 font-semibold">Action</th>
                  </tr>
                </thead>
                <tbody>
                  {rows.map((row) => {
                    const label = row.statusLabel || row.status || "—";
                    const decisionAt = getDecisionAt(row);
                    const decisionLabel = getDecisionLabel(row.status);
                    return (
                      <tr
                        key={row.requestId}
                        className="border-b border-[var(--border)] last:border-0 hover:bg-[var(--panel-soft)]/50"
                      >
                        <td className="whitespace-nowrap px-3 py-3 text-[var(--text)]">
                          {row.createdAt
                            ? formatDateTime(row.createdAt, dateFormat, timeFormat)
                            : "—"}
                        </td>
                        <td className="whitespace-nowrap px-3 py-3 font-medium text-[var(--text)]">
                          {formatDate(row.attendanceDate, dateFormat)}
                        </td>
                        <td className="whitespace-nowrap px-3 py-3 tabular-nums text-[var(--text)]">
                          {formatTime(row.checkInTime, timeFormat)}
                          <span className="mx-1 text-[var(--muted)]">→</span>
                          {formatTime(row.checkOutTime, timeFormat)}
                        </td>
                        <td className="whitespace-nowrap px-3 py-3 tabular-nums text-[var(--muted)]">
                          {row.originalCheckIn || row.originalCheckOut ? (
                            <>
                              {formatTime(row.originalCheckIn, timeFormat)}
                              <span className="mx-1">→</span>
                              {formatTime(row.originalCheckOut, timeFormat)}
                            </>
                          ) : (
                            "—"
                          )}
                        </td>
                        <td className="max-w-[200px] truncate px-3 py-3 text-[var(--muted)]">
                          {row.reason || "—"}
                        </td>
                        <td className="whitespace-nowrap px-3 py-3">
                          <span
                            className={`inline-flex rounded-full border px-2.5 py-0.5 text-[11px] font-semibold capitalize ${statusTone(row.status)}`}
                          >
                            {label}
                          </span>
                        </td>
                        <td className="whitespace-nowrap px-3 py-3 text-[12px] text-[var(--muted)]">
                          {decisionAt ? (
                            <span>
                              <span className="font-medium text-[var(--text)]">
                                {decisionLabel}
                              </span>
                              <span className="mt-0.5 block">
                                {formatDateTime(
                                  decisionAt,
                                  dateFormat,
                                  timeFormat
                                )}
                              </span>
                            </span>
                          ) : (
                            "—"
                          )}
                        </td>
                        <td className="px-3 py-3">
                          <RequestRowActions
                            requestId={row.requestId}
                            onView={setSelectedId}
                          />
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>

            <div className="mt-4 flex flex-col gap-3 border-t border-[var(--border)] pt-4 sm:flex-row sm:items-center sm:justify-between">
              <p className="text-[12px] text-[var(--muted)]">
                Showing page {currentPage} of {totalPages} · {total} total
              </p>
              <div className="flex items-center gap-2">
                <Button
                  type="button"
                  variant="outline"
                  className="h-9 rounded-lg px-2"
                  disabled={currentPage <= 1 || loading}
                  onClick={() => setPage((p) => Math.max(1, p - 1))}
                  aria-label="Previous page"
                >
                  <ChevronLeft className="h-4 w-4" />
                </Button>
                <Button
                  type="button"
                  variant="outline"
                  className="h-9 rounded-lg px-2"
                  disabled={currentPage >= totalPages || loading}
                  onClick={() => setPage((p) => p + 1)}
                  aria-label="Next page"
                >
                  <ChevronRight className="h-4 w-4" />
                </Button>
              </div>
            </div>
          </>
        )}
      </Card>

      <SlideOver
        open={showForm}
        onClose={() => {
          setShowForm(false);
          setFormError("");
        }}
        title="Submit correction"
        subtitle="Select a past log to prefill, then adjust the times"
        wide
      >
        <form className="space-y-4 pb-8" onSubmit={handleSubmit}>
          <label className="block text-[12px] font-medium text-[var(--muted)]">
            Attendance log
            <select
              className={fieldClass}
              value={form.logId}
              onChange={(e) => onPickLog(e.target.value)}
              disabled={historyLoading}
            >
              <option value="">Select a past day to prefill (optional)…</option>
              {historyOptions.map((row) => (
                <option key={row.logId} value={row.logId}>
                  {formatDate(row.attendanceDate, dateFormat)} · In{" "}
                  {formatTime(row.checkInTime, timeFormat)} · Out{" "}
                  {formatTime(row.checkOutTime, timeFormat)}
                </option>
              ))}
            </select>
          </label>

          <label className="block text-[12px] font-medium text-[var(--muted)]">
            Attendance date
            <input
              type="date"
              required
              className={fieldClass}
              value={form.attendanceDate}
              onChange={(e) =>
                setForm((prev) => ({ ...prev, attendanceDate: e.target.value }))
              }
            />
          </label>

          <div className="flex items-center gap-2 rounded-xl border border-dashed border-[var(--border)] bg-[var(--panel-soft)] px-3 py-2.5 text-[12px] text-[var(--muted)]">
            <Clock3 className="h-4 w-4 shrink-0 text-[var(--violet)]" />
            {selectedLog ? (
              <span>
                Original recorded:{" "}
                <span className="font-semibold text-[var(--text)]">
                  {formatTime(selectedLog.checkInTime, timeFormat)} →{" "}
                  {formatTime(selectedLog.checkOutTime, timeFormat)}
                </span>
              </span>
            ) : (
              <span>No log selected — enter corrected times manually.</span>
            )}
          </div>

          <div className="grid grid-cols-2 gap-3">
            <label className="block text-[12px] font-medium text-[var(--muted)]">
              Requested check-in
              <input
                type="time"
                required
                className={fieldClass}
                value={form.checkInTime}
                onChange={(e) =>
                  setForm((prev) => ({ ...prev, checkInTime: e.target.value }))
                }
              />
            </label>

            <label className="block text-[12px] font-medium text-[var(--muted)]">
              Requested check-out
              <input
                type="time"
                required
                className={fieldClass}
                value={form.checkOutTime}
                onChange={(e) =>
                  setForm((prev) => ({ ...prev, checkOutTime: e.target.value }))
                }
              />
            </label>
          </div>

          <label className="block text-[12px] font-medium text-[var(--muted)]">
            Reason
            <textarea
              required
              rows={4}
              placeholder="e.g. Forgot to check in / system missed my punch"
              className="mt-1.5 w-full rounded-xl border border-[var(--border)] bg-[var(--surface)] px-3 py-2.5 text-[13px] text-[var(--text)] outline-none transition focus:border-[var(--violet)] focus:ring-2 focus:ring-[var(--lavender-soft)]"
              value={form.reason}
              onChange={(e) =>
                setForm((prev) => ({ ...prev, reason: e.target.value }))
              }
            />
          </label>

          {formError ? (
            <FlashBanner
              message={formError}
              tone="danger"
              compact
              duration={5000}
              onDismiss={() => setFormError("")}
            />
          ) : null}

          <div className="sticky bottom-0 -mx-5 border-t border-[var(--border)] bg-[var(--surface)] px-5 pt-4">
            <div className="flex gap-2">
              <Button
                type="submit"
                className="h-11 flex-1 rounded-xl"
                disabled={submitting}
              >
                <Send className="h-4 w-4" />
                {submitting ? "Submitting…" : "Submit for approval"}
              </Button>
              <Button
                type="button"
                variant="outline"
                className="h-11 rounded-xl"
                onClick={() => {
                  setShowForm(false);
                  setForm(emptyForm());
                  setFormError("");
                }}
              >
                Close
              </Button>
            </div>
          </div>
        </form>
      </SlideOver>

      <RequestDetailPanel
        open={Boolean(selectedId)}
        requestId={selectedId}
        timeFormat={timeFormat}
        dateFormat={dateFormat}
        onClose={() => setSelectedId(null)}
        onCancelled={() => refetch()}
      />
    </div>
  );
}
