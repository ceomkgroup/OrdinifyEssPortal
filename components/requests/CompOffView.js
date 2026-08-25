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
  MoonStar,
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
import { Card } from "@/components/ui/Card";
import { FlashBanner } from "@/components/ui/FlashBanner";
import { ListFiltersBar } from "@/components/ui/ListFilters";
import { SlideOver } from "@/components/ui/SlideOver";
import { PageLoader } from "@/components/ui/Spinner";
import {
  cancelCompOff,
  submitCompOff,
  useCompOffList,
  useCompOffStats,
} from "@/hooks/useCompOff";
import { formatDate, formatDateTime, rowSerial } from "@/lib/format";

const STATUS_OPTIONS = [
  { value: "all", label: "All requests" },
  { value: "pending", label: "Pending" },
  { value: "approved", label: "Approved" },
  { value: "used", label: "Used" },
  { value: "cancelled", label: "Cancelled" },
];

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
  const [status, setStatus] = useState("all");
  const [page, setPage] = useState(1);
  const [limit] = useState(10);
  const [listQuery, setListQuery] = useState("");
  const [filterBusy, setFilterBusy] = useState(false);
  const [showForm, setShowForm] = useState(false);
  const [selected, setSelected] = useState(null);

  const [form, setForm] = useState(emptyForm);
  const [submitting, setSubmitting] = useState(false);
  const [cancellingId, setCancellingId] = useState(null);
  const [formError, setFormError] = useState("");
  const [flash, setFlash] = useState("");
  const [flashTone, setFlashTone] = useState("success");

  const { rows, meta, loading, error, refetch } = useCompOffList({
    status,
    page,
    limit,
  });
  const { stats, refetch: refetchStats } = useCompOffStats();

  const filteredRows = useMemo(() => {
    const q = listQuery.trim().toLowerCase();
    if (!q) return rows || [];
    return (rows || []).filter((row) => {
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
  }, [rows, listQuery]);

  const total = Number(meta?.total) || 0;
  const currentPage = Number(meta?.page) || page;
  const totalPages = Math.max(1, Number(meta?.totalPages) || 1);

  function refreshAll() {
    refetch();
    refetchStats();
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
    <div className="space-y-4">
      <section className="overflow-hidden rounded-[14px] border border-[var(--border)] bg-[var(--surface)] shadow-[var(--card-shadow)]">
        <div className="flex flex-col gap-4 bg-gradient-to-br from-[var(--lavender-soft)] via-[var(--surface)] to-[var(--surface)] p-4 md:flex-row md:items-center md:justify-between md:p-5">
          <div className="flex items-start gap-3">
            <span className="inline-flex h-12 w-12 shrink-0 items-center justify-center rounded-2xl bg-[var(--violet)] text-white shadow-sm">
              <MoonStar className="h-6 w-6" />
            </span>
            <div>
              <h1 className="font-[family-name:var(--font-heading)] text-[24px] font-semibold text-[var(--text)]">
                Comp Off
              </h1>
              <p className="mt-1 max-w-xl text-[13px] leading-relaxed text-[var(--muted)]">
                Submit and track compensatory-off requests for holiday or
                extra work.
              </p>
            </div>
          </div>
          <div className="flex flex-wrap gap-2 md:justify-end">
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
          </div>
        </div>
      </section>

      <div className="grid grid-cols-2 gap-3 lg:grid-cols-5">
        <StatCard
          label="Total Requests"
          value={stats.total}
          icon={Inbox}
          tone="bg-[var(--info-soft)] text-[var(--info)]"
        />
        <StatCard
          label="Approved"
          value={stats.approved}
          icon={CheckCircle2}
          tone="bg-[var(--warning-soft)] text-[var(--warning)]"
        />
        <StatCard
          label="Pending"
          value={stats.pending}
          icon={Hourglass}
          tone="bg-[var(--lavender-soft)] text-[var(--violet)]"
        />
        <StatCard
          label="Used"
          value={stats.used}
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

      {flash ? (
        <FlashBanner
          message={flash}
          tone={flashTone}
          duration={4000}
          onDismiss={() => setFlash("")}
        />
      ) : null}

      <Card bodyClassName="!min-h-0">
        <div className="mb-4">
          <div className="mb-3">
            <h3 className="text-[15px] font-semibold text-[var(--text)]">
              My requests
            </h3>
            <p className="mt-0.5 text-[12px] text-[var(--muted)]">
              Track pending, approved, used and cancelled comp-off requests
            </p>
          </div>
          <ListFiltersBar
            search={listQuery}
            onSearchChange={setListQuery}
            searchPlaceholder="Search date, reason, status…"
            status={status}
            onStatusChange={(next) => {
              setStatus(next);
              setPage(1);
            }}
            statusOptions={STATUS_OPTIONS}
            loading={loading}
            onBusyChange={setFilterBusy}
          />
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

        {loading || filterBusy ? (
          <PageLoader
            compact
            label={loading ? "Loading requests" : "Updating results"}
            hint={
              loading
                ? "Fetching comp-off requests…"
                : "Applying your search and filters…"
            }
          />
        ) : filteredRows.length === 0 ? (
          <div className="flex min-h-[200px] flex-col items-center justify-center rounded-2xl border border-dashed border-[var(--border)] bg-[var(--panel-soft)] px-4 text-center">
            <span className="inline-flex h-12 w-12 items-center justify-center rounded-2xl bg-[var(--lavender-soft)] text-[var(--violet)]">
              <Inbox className="h-6 w-6" />
            </span>
            <p className="mt-3 text-[14px] font-semibold text-[var(--text)]">
              No {status === "all" ? "" : `${status} `}requests
            </p>
            <p className="mt-1 max-w-sm text-[12px] text-[var(--muted)]">
              Submit a request when you work on a holiday or earn compensatory
              off.
            </p>
            <Button
              type="button"
              className="mt-4 h-10 rounded-xl"
              onClick={() => setShowForm(true)}
            >
              <Plus className="h-4 w-4" />
              New Comp Off Request
            </Button>
          </div>
        ) : (
          <>
            <div className="overflow-x-auto rounded-xl border border-[var(--border)]">
              <table className="min-w-full text-left text-[13px]">
                <thead>
                  <tr className="border-b border-[var(--border)] bg-[var(--panel-soft)] text-[11px] uppercase tracking-wide text-[var(--muted)]">
                    <th className="w-12 whitespace-nowrap px-3 py-2.5 font-semibold">
                      #
                    </th>
                    <th className="whitespace-nowrap px-3 py-2.5 font-semibold">
                      Work Date
                    </th>
                    <th className="whitespace-nowrap px-3 py-2.5 font-semibold">
                      Comp Off Date
                    </th>
                    <th className="whitespace-nowrap px-3 py-2.5 font-semibold">
                      Hours Worked
                    </th>
                    <th className="px-3 py-2.5 font-semibold">Reason</th>
                    <th className="whitespace-nowrap px-3 py-2.5 font-semibold">
                      Status
                    </th>
                    <th className="whitespace-nowrap px-3 py-2.5 font-semibold">
                      Level
                    </th>
                    <th className="whitespace-nowrap px-3 py-2.5 font-semibold">
                      Created
                    </th>
                    <th className="px-3 py-2.5 font-semibold">Action</th>
                  </tr>
                </thead>
                <tbody>
                  {filteredRows.map((row, index) => {
                    const label = normalizeStatusLabel(
                      row.status,
                      row.statusLabel
                    );
                    const isPending =
                      String(row.status || "").toLowerCase() === "pending";
                    return (
                      <tr
                        key={row.compOffId}
                        className="border-b border-[var(--border)] last:border-0 hover:bg-[var(--panel-soft)]/50"
                      >
                        <td className="px-3 py-3 tabular-nums text-[var(--muted)]">
                          {rowSerial(index, page, limit)}
                        </td>
                        <td className="whitespace-nowrap px-3 py-3 font-medium text-[var(--text)]">
                          <span className="inline-flex items-center gap-1.5">
                            <CalendarDays className="h-3.5 w-3.5 text-[var(--violet)]" />
                            {formatDateWithWeekday(row.workDate, dateFormat)}
                          </span>
                        </td>
                        <td className="whitespace-nowrap px-3 py-3 text-[var(--muted)]">
                          {row.compOffDate
                            ? formatDate(row.compOffDate, dateFormat)
                            : "— Not set"}
                        </td>
                        <td className="whitespace-nowrap px-3 py-3 tabular-nums text-[var(--text)]">
                          {row.hoursWorked != null
                            ? `${row.hoursWorked} hrs`
                            : "—"}
                        </td>
                        <td className="max-w-[220px] truncate px-3 py-3 text-[var(--muted)]">
                          {row.reason || "—"}
                        </td>
                        <td className="whitespace-nowrap px-3 py-3">
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
                        </td>
                        <td className="whitespace-nowrap px-3 py-3 text-[var(--muted)]">
                          {row.currentLevel != null && row.totalLevels != null
                            ? `${row.currentLevel} of ${row.totalLevels}`
                            : row.currentLevel != null
                              ? String(row.currentLevel)
                              : "—"}
                        </td>
                        <td className="whitespace-nowrap px-3 py-3 text-[var(--muted)]">
                          {row.createdAt
                            ? formatDateTime(
                                row.createdAt,
                                dateFormat,
                                timeFormat
                              )
                            : "—"}
                        </td>
                        <td className="px-3 py-3">
                          <RequestRowActions
                            requestId={row.compOffId}
                            canCancel={isPending}
                            onView={() => setSelected(row)}
                            onCancel={() => handleCancel(row.compOffId)}
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
    </div>
  );
}
