"use client";

import {
  CalendarDays,
  CheckCircle2,
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
import { Button } from "@/components/ui/Button";
import { FlashBanner } from "@/components/ui/FlashBanner";
import { FilterDrawerDateRange } from "@/components/ui/FilterDrawerDateRange";
import { CollapsibleSection } from "@/components/ui/CollapsibleSection";
import { SoftStat, SUMMARY_GRID_CLASS } from "@/components/ui/SoftStat";
import { PortalPage } from "@/components/ui/PortalPage";
import { SlideOver } from "@/components/ui/SlideOver";
import { TablePanel } from "@/components/ui/TablePanel";
import {
  cancelCompOff,
  submitCompOff,
  useCompOffList,
} from "@/hooks/useCompOff";
import {
  countActiveDateFilters,
  dateInRange,
} from "@/lib/request-date-filter";
import { useRequestListQuery } from "@/hooks/useRequestListQuery";
import { formatDate, formatDateTime, rowSerial } from "@/lib/format";

const fieldClass =
  "mt-1.5 h-11 w-full rounded-xl border border-[var(--border)] bg-[var(--surface)] px-3 text-[13px] text-[var(--text)] outline-none transition focus:border-[var(--violet)] focus:ring-2 focus:ring-[var(--lavender-soft)]";

const WEEKDAYS = [
  "Sunday",
  "Monday",
  "Tuesday",
  "Wednesday",
  "Thursday",
  "Friday",
  "Saturday",
];

function emptyForm() {
  return {
    workDate: "",
    hoursWorked: "8",
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
  if (s === "approved" || s === "used") {
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
        event.target.closest?.(`[data-comp-off-menu="${requestId}"]`)
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
              data-comp-off-menu={requestId}
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
            statusLower === "used" ||
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

export function CompOffView({
  timeFormat = "12h",
  dateFormat = "DD/MM/YYYY",
}) {
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
  const [showForm, setShowForm] = useState(false);
  const [selected, setSelected] = useState(null);

  const [form, setForm] = useState(emptyForm);
  const [submitting, setSubmitting] = useState(false);
  const [cancellingId, setCancellingId] = useState(null);
  const [formError, setFormError] = useState("");
  const [flash, setFlash] = useState("");
  const [flashTone, setFlashTone] = useState("success");

  const { rows, meta, stats, loading, error, refetch } = useCompOffList({
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
        !dateInRange(row.workDate || row.compOffDate || row.createdAt, dateFrom, dateTo)
      ) {
        return false;
      }
      if (!q) return true;
      const hay = [
        row.reason,
        row.status,
        row.statusLabel,
        row.levelName,
        row.workDate,
        row.compOffDate,
        row.hoursWorked,
      ]
        .filter(Boolean)
        .join(" ")
        .toLowerCase();
      return hay.includes(q);
    });
  }, [rows, listQuery, dateFrom, dateTo]);

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
        id: "workDate",
        header: "Work Date",
        cellClassName: "whitespace-nowrap font-medium text-[var(--text)]",
        cell: (row) => (
          <span className="inline-flex items-center gap-1.5">
            <CalendarDays className="h-3.5 w-3.5 text-[var(--violet)]" />
            {formatDateWithWeekday(row.workDate, dateFormat)}
          </span>
        ),
      },
      {
        id: "compOffDate",
        header: "Comp Off Date",
        cellClassName: "whitespace-nowrap text-[var(--muted)]",
        cell: (row) =>
          row.compOffDate
            ? formatDate(row.compOffDate, dateFormat)
            : "— Not set",
      },
      {
        id: "hoursWorked",
        header: "Hours Worked",
        cellClassName: "whitespace-nowrap tabular-nums text-[var(--text)]",
        cell: (row) =>
          row.hoursWorked != null ? `${row.hoursWorked} hrs` : "—",
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
              requestId={row.compOffId}
              canCancel={isPending}
              onView={() => setSelected(row)}
              onCancel={() => handleCancel(row.compOffId)}
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
  }

  async function handleSubmit(event) {
    event.preventDefault();
    setFormError("");

    if (!form.workDate) {
      setFormError("Work date is required.");
      return;
    }
    const hours = Number(form.hoursWorked);
    if (!Number.isFinite(hours) || hours <= 0) {
      setFormError("Hours worked must be greater than 0.");
      return;
    }
    if (!form.reason.trim()) {
      setFormError("Please provide a reason.");
      return;
    }

    setSubmitting(true);
    try {
      const res = await submitCompOff({
        workDate: form.workDate,
        hoursWorked: hours,
        reason: form.reason.trim(),
      });
      setFlashTone("success");
      setFlash(
        res?.message || "Comp-off request submitted (pending approval)."
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

  async function handleCancel(compOffId) {
    if (!compOffId) return;
    if (!window.confirm("Cancel this pending comp-off request?")) return;

    setCancellingId(compOffId);
    try {
      const res = await cancelCompOff(compOffId);
      setFlashTone("success");
      setFlash(res?.message || "Comp-off request cancelled");
      if (selected?.compOffId === compOffId) setSelected(null);
      refreshAll();
    } catch (err) {
      setFlashTone("danger");
      setFlash(err.message || "Failed to cancel request.");
    } finally {
      setCancellingId(null);
    }
  }

  return (
    <PortalPage
      fill
      title="Comp Off"
      subtitle="Submit and track compensatory-off requests for holiday or extra work."
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
            New Comp Off Request
          </Button>
        </>
      }
    >

      <CollapsibleSection title="Summary">
        <div className={SUMMARY_GRID_CLASS}>
          <SoftStat label="Total Requests" value={stats.total} />
          <SoftStat label="Approved" value={stats.approved} color="#22c55e" />
          <SoftStat label="Pending" value={stats.pending} color="#7b39ec" />
          <SoftStat label="Used" value={stats.used} color="#3b82f6" />
          <SoftStat label="Cancelled" value={stats.cancelled} color="#ef4444" />
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
        title="Comp Off Logs"
        titleCount={total}
        tabs={[
          { value: "all", label: "All" },
          { value: "pending", label: "Pending" },
          { value: "approved", label: "Approved" },
          { value: "used", label: "Used" },
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
            hint="Apply uses these dates for comp off logs."
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
        getRowKey={(row) => row.compOffId}
        minWidth="900px"
        loading={loading}
        loadingLabel="Loading requests"
        loadingHint="Fetching comp-off requests…"
        error={error}
        emptyIcon={Inbox}
        emptyTitle={`No ${status === "all" ? "" : `${status} `}requests`}
        emptyHint="Submit a request when you work on a holiday or earn compensatory off."
        emptyAction={
          <Button
            type="button"
            className="h-10 rounded-xl"
            onClick={() => setShowForm(true)}
          >
            <Plus className="h-4 w-4" />
            New Comp Off Request
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
        title="New Comp Off Request"
        subtitle="Enter the work date, hours, and reason"
        wide
      >
        <form className="space-y-4 pb-8" onSubmit={handleSubmit}>
          <label className="block text-[12px] font-medium text-[var(--muted)]">
            Work date
            <input
              type="date"
              required
              className={fieldClass}
              value={form.workDate}
              onChange={(e) =>
                setForm((prev) => ({ ...prev, workDate: e.target.value }))
              }
            />
          </label>

          <label className="block text-[12px] font-medium text-[var(--muted)]">
            Hours worked
            <input
              type="number"
              required
              min="0.5"
              step="0.5"
              className={fieldClass}
              value={form.hoursWorked}
              onChange={(e) =>
                setForm((prev) => ({ ...prev, hoursWorked: e.target.value }))
              }
            />
          </label>

          <label className="block text-[12px] font-medium text-[var(--muted)]">
            Reason
            <textarea
              required
              rows={4}
              placeholder="e.g. Worked on public holiday"
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

      <SlideOver
        open={Boolean(selected)}
        onClose={() => setSelected(null)}
        title="Comp Off details"
        subtitle={
          selected
            ? [
                selected.workDate
                  ? formatDateWithWeekday(selected.workDate, dateFormat)
                  : null,
                selected.hoursWorked != null
                  ? `${selected.hoursWorked} hrs`
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
                  disabled={cancellingId === selected.compOffId}
                  onClick={() => handleCancel(selected.compOffId)}
                >
                  <XCircle className="h-4 w-4" />
                  {cancellingId === selected.compOffId
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
                <DetailField icon={CalendarDays} label="Work date">
                  {formatDateWithWeekday(selected.workDate, dateFormat)}
                </DetailField>

                <DetailField icon={Clock3} label="Hours worked">
                  <span className="tabular-nums">
                    {selected.hoursWorked != null
                      ? `${selected.hoursWorked} hrs`
                      : "—"}
                  </span>
                </DetailField>

                <DetailField icon={CalendarDays} label="Comp off date">
                  {selected.compOffDate ? (
                    formatDate(selected.compOffDate, dateFormat)
                  ) : (
                    <span className="font-normal text-[var(--muted)]">
                      Not scheduled yet
                    </span>
                  )}
                </DetailField>

                <DetailField icon={Clock3} label="Submitted">
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

                {selected.usedDate ? (
                  <DetailField
                    icon={CheckCircle2}
                    label="Used date"
                    className="sm:col-span-2"
                  >
                    {formatDate(selected.usedDate, dateFormat)}
                  </DetailField>
                ) : null}
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
