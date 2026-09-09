"use client";

import {
  ArrowRight,
  CheckCircle2,
  Clock3,
  Eye,
  Hourglass,
  Inbox,
  MoreVertical,
  Plus,
  RefreshCw,
  Send,
  XCircle,
} from "lucide-react";
import { useEffect, useMemo, useRef, useState } from "react";
import { createPortal } from "react-dom";
import { useSearchParams } from "next/navigation";
import { Button } from "@/components/ui/Button";
import { FlashBanner } from "@/components/ui/FlashBanner";
import { FilterDrawerDateRange } from "@/components/ui/FilterDrawerDateRange";
import { MuiDateField } from "@/components/ui/MuiDateField";
import { CollapsibleSection } from "@/components/ui/CollapsibleSection";
import { SoftStat, SUMMARY_GRID_CLASS } from "@/components/ui/SoftStat";
import { PortalPage } from "@/components/ui/PortalPage";
import { SlideOver } from "@/components/ui/SlideOver";
import { PageLoader } from "@/components/ui/Spinner";
import { TablePanel } from "@/components/ui/TablePanel";
import { getAttendanceHistory } from "@/api/attendance";
import {
  cancelAttendanceChange,
  submitAttendanceChange,
  useAttendanceChangeDetail,
  useAttendanceChangeList,
} from "@/hooks/useAttendanceChange";
import {
  countActiveDateFilters,
  dateInRange,
} from "@/lib/request-date-filter";
import { useRequestListQuery } from "@/hooks/useRequestListQuery";
import { formatDate, formatDateTime, formatTime, rowSerial } from "@/lib/format";

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

  const {
    status,
    setStatus,
    page,
    setPage,
    limit,
    setLimit,
    listQuery,
    setListQuery,
    dateFrom,
    setDateFrom,
    dateTo,
    setDateTo,
    draftDateFrom,
    setDraftDateFrom,
    draftDateTo,
    setDraftDateTo,
  } = useRequestListQuery();
  const [selectedId, setSelectedId] = useState(null);
  const [showForm, setShowForm] = useState(false);

  const [form, setForm] = useState(emptyForm);
  const [historyOptions, setHistoryOptions] = useState([]);
  const [historyLoading, setHistoryLoading] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [formError, setFormError] = useState("");
  const [formSuccess, setFormSuccess] = useState("");

  const { rows, meta, stats, loading, error, refetch } = useAttendanceChangeList({
    status,
    page,
    limit,
  });

  const dateFilterCount = countActiveDateFilters(dateFrom, dateTo);

  const filteredRows = useMemo(() => {
    const q = listQuery.trim().toLowerCase();
    return (rows || []).filter((row) => {
      if (
        (dateFrom || dateTo) &&
        !dateInRange(
          row.attendanceDate || row.originalDate || row.createdAt,
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
        row.attendanceDate,
        row.originalDate,
      ]
        .filter(Boolean)
        .join(" ")
        .toLowerCase();
      return hay.includes(q);
    });
  }, [rows, listQuery, dateFrom, dateTo]);

  function refreshAll() {
    refetch();
  }

  const shouldLoadHistory = showForm || Boolean(prefillLogId);

  useEffect(() => {
    if (!shouldLoadHistory) return undefined;

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
  }, [shouldLoadHistory, prefillLogId]);

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
        id: "submitted",
        header: "Submitted",
        cellClassName: "whitespace-nowrap text-[var(--text)]",
        cell: (row) =>
          row.createdAt
            ? formatDateTime(row.createdAt, dateFormat, timeFormat)
            : "—",
      },
      {
        id: "attendanceDate",
        header: "Attendance date",
        cellClassName: "whitespace-nowrap font-medium text-[var(--text)]",
        cell: (row) => formatDate(row.attendanceDate, dateFormat),
      },
      {
        id: "requestedTime",
        header: "Requested time",
        cellClassName: "whitespace-nowrap tabular-nums text-[var(--text)]",
        cell: (row) => (
          <>
            {formatTime(row.checkInTime, timeFormat)}
            <span className="mx-1 text-[var(--muted)]">→</span>
            {formatTime(row.checkOutTime, timeFormat)}
          </>
        ),
      },
      {
        id: "originalTime",
        header: "Original time",
        cellClassName: "whitespace-nowrap tabular-nums text-[var(--muted)]",
        cell: (row) =>
          row.originalCheckIn || row.originalCheckOut ? (
            <>
              {formatTime(row.originalCheckIn, timeFormat)}
              <span className="mx-1">→</span>
              {formatTime(row.originalCheckOut, timeFormat)}
            </>
          ) : (
            "—"
          ),
      },
      {
        id: "reason",
        header: "Reason",
        cellClassName: "max-w-[200px] truncate text-[var(--muted)]",
        cell: (row) => row.reason || "—",
      },
      {
        id: "status",
        header: "Status",
        cellClassName: "whitespace-nowrap",
        cell: (row) => {
          const label = row.statusLabel || row.status || "—";
          return (
            <span
              className={`inline-flex rounded-full border px-2.5 py-0.5 text-[11px] font-semibold capitalize ${statusTone(row.status)}`}
            >
              {label}
            </span>
          );
        },
      },
      {
        id: "decision",
        header: "Decision",
        cellClassName: "whitespace-nowrap text-[12px] text-[var(--muted)]",
        cell: (row) => {
          const decisionAt = getDecisionAt(row);
          const decisionLabel = getDecisionLabel(row.status);
          if (!decisionAt) return "—";
          return (
            <span>
              <span className="font-medium text-[var(--text)]">
                {decisionLabel}
              </span>
              <span className="mt-0.5 block">
                {formatDateTime(decisionAt, dateFormat, timeFormat)}
              </span>
            </span>
          );
        },
      },
      {
        id: "action",
        header: "Action",
        cell: (row) => (
          <RequestRowActions
            requestId={row.requestId}
            onView={setSelectedId}
          />
        ),
      },
    ],
    [currentPage, limit, dateFormat, timeFormat]
  );

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
      refreshAll();
    } catch (err) {
      setFormError(err.message || "Failed to submit request.");
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <PortalPage
      fill
      title="Attendance Change"
      subtitle="Wrong punch time? Submit a correction with date, in/out times, and reason. Pending requests can be cancelled anytime."
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
              setFormSuccess("");
            }}
          >
            <Plus className="h-4 w-4" />
            New request
          </Button>
        </>
      }
    >

      <CollapsibleSection title="Summary">
        <div className={SUMMARY_GRID_CLASS}>
          <SoftStat label="Total Requests" value={stats.total} />
          <SoftStat label="Pending" value={stats.pending} color="#7b39ec" />
          <SoftStat label="Approved" value={stats.approved} color="#22c55e" />
          <SoftStat label="Cancelled" value={stats.cancelled} color="#ef4444" />
        </div>
      </CollapsibleSection>

      {formSuccess ? (
        <FlashBanner
          message={formSuccess}
          tone="success"
          duration={4000}
          onDismiss={() => setFormSuccess("")}
        />
      ) : null}

      <TablePanel
        title="Attendance Change Logs"
        titleCount={total}
        tabs={[
          { value: "all", label: "All" },
          { value: "pending", label: "Pending" },
          { value: "approved", label: "Approved" },
          { value: "rejected", label: "Rejected" },
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
        searchPlaceholder="Search logs…"
        filterTitle="Filters"
        filterSubtitle="Date range"
        filterActive={dateFilterCount > 0}
        activeFilterCount={dateFilterCount}
        drawerFields={
          <FilterDrawerDateRange
            from={draftDateFrom}
            to={draftDateTo}
            onFromChange={setDraftDateFrom}
            onToChange={setDraftDateTo}
            hint="Apply uses these dates for attendance change logs."
          />
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
        getRowKey={(row) => row.requestId}
        minWidth="900px"
        loading={loading}
        loadingLabel="Loading requests"
        loadingHint="Fetching attendance change requests…"
        error={error}
        emptyIcon={Inbox}
        emptyTitle={`No ${status === "all" ? "" : `${status} `}requests`}
        emptyHint="Submit a correction when a punch time looks wrong. You can also start from Attendance history actions."
        emptyAction={
          <Button
            type="button"
            className="h-10 rounded-xl"
            onClick={() => setShowForm(true)}
          >
            <Plus className="h-4 w-4" />
            New request
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

          <MuiDateField
            label="Attendance date"
            required
            dateFormat={dateFormat || "DD/MM/YYYY"}
            value={form.attendanceDate}
            onChange={(next) =>
              setForm((prev) => ({ ...prev, attendanceDate: next }))
            }
          />

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
        onCancelled={() => refreshAll()}
      />
    </PortalPage>
  );
}
