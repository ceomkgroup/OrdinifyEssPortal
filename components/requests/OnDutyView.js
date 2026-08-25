"use client";

import {
  BriefcaseBusiness,
  CalendarDays,
  CheckCircle2,
  ChevronLeft,
  ChevronRight,
  Eye,
  Hourglass,
  Inbox,
  Info,
  MapPin,
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
  cancelOnDuty,
  submitOnDuty,
  useOnDutyList,
  useOnDutyStats,
} from "@/hooks/useOnDuty";
import { formatDate, formatDateTime, rowSerial } from "@/lib/format";

const STATUS_OPTIONS = [
  { value: "all", label: "All requests" },
  { value: "pending", label: "Pending" },
  { value: "approved", label: "Approved" },
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
    fromDate: "",
    toDate: "",
    location: "",
    purpose: "",
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

function formatPeriod(fromDate, toDate, dateFormat) {
  if (!fromDate && !toDate) return "—";
  if (fromDate && toDate && fromDate === toDate) {
    return formatDateWithWeekday(fromDate, dateFormat);
  }
  if (fromDate && toDate) {
    return `${formatDate(fromDate, dateFormat)} to ${formatDate(toDate, dateFormat)}`;
  }
  return formatDateWithWeekday(fromDate || toDate, dateFormat);
}

function dayCount(fromDate, toDate) {
  if (!fromDate || !toDate) return null;
  const a = new Date(`${fromDate}T12:00:00`);
  const b = new Date(`${toDate}T12:00:00`);
  if (Number.isNaN(a.getTime()) || Number.isNaN(b.getTime())) return null;
  const diff = Math.round((b - a) / (1000 * 60 * 60 * 24));
  return Math.max(1, diff + 1);
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
        event.target.closest?.(`[data-on-duty-menu="${requestId}"]`)
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
              data-on-duty-menu={requestId}
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

export function OnDutyView({ timeFormat = "12h", dateFormat = "DD/MM/YYYY" }) {
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

  const { rows, meta, loading, error, refetch } = useOnDutyList({
    status,
    page,
    limit,
  });
  const { stats, refetch: refetchStats } = useOnDutyStats();

  const filteredRows = useMemo(() => {
    const q = listQuery.trim().toLowerCase();
    if (!q) return rows || [];
    return (rows || []).filter((row) => {
      const hay = [
        row.location,
        row.purpose,
        row.status,
        row.statusLabel,
        row.levelName,
        row.fromDate,
        row.toDate,
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
  const formDays = dayCount(form.fromDate, form.toDate);

  function refreshAll() {
    refetch();
    refetchStats();
  }

  async function handleSubmit(event) {
    event.preventDefault();
    setFormError("");

    if (!form.fromDate || !form.toDate) {
      setFormError("From date and to date are required.");
      return;
    }
    if (form.toDate < form.fromDate) {
      setFormError("To date cannot be before from date.");
      return;
    }
    if (!form.location.trim()) {
      setFormError("Please provide a location.");
      return;
    }
    if (!form.purpose.trim()) {
      setFormError("Please provide a purpose for the on-duty request.");
      return;
    }

    setSubmitting(true);
    try {
      await submitOnDuty({
        fromDate: form.fromDate,
        toDate: form.toDate,
        location: form.location.trim(),
        purpose: form.purpose.trim(),
      });
      setShowForm(false);
      setForm(emptyForm());
      setFlashTone("success");
      setFlash("On Duty request submitted for approval.");
      setStatus("all");
      setPage(1);
      refreshAll();
    } catch (err) {
      setFormError(err?.message || "Failed to submit On Duty request.");
    } finally {
      setSubmitting(false);
    }
  }

  async function handleCancel(requestId) {
    if (!requestId) return;
    if (!window.confirm("Cancel this pending On Duty request?")) return;

    setCancellingId(requestId);
    try {
      const res = await cancelOnDuty(requestId);
      setFlashTone("success");
      setFlash(res?.message || "On Duty request cancelled.");
      if (selected?.onDutyId === requestId) setSelected(null);
      refreshAll();
    } catch (err) {
      setFlashTone("danger");
      setFlash(err?.message || "Failed to cancel request.");
    } finally {
      setCancellingId(null);
    }
  }

  return (
    <div className="space-y-5">
      <section className="rounded-2xl border border-[var(--border)] bg-[var(--surface)] p-5 shadow-[var(--card-shadow)] sm:p-6">
        <div className="flex flex-col gap-4 md:flex-row md:items-start md:justify-between">
          <div className="flex items-start gap-3">
            <span className="inline-flex h-11 w-11 shrink-0 items-center justify-center rounded-2xl bg-[var(--lavender-soft)] text-[var(--violet)]">
              <BriefcaseBusiness className="h-5 w-5" />
            </span>
            <div>
              <h1 className="text-[22px] font-bold tracking-tight text-[var(--text)]">
                On Duty
              </h1>
              <p className="mt-1 max-w-xl text-[13px] leading-relaxed text-[var(--muted)]">
                Submit and track on-duty / field-visit requests
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
              New On Duty Request
            </Button>
          </div>
        </div>
      </section>

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
              Track pending, approved and cancelled On Duty requests
            </p>
          </div>
          <ListFiltersBar
            search={listQuery}
            onSearchChange={setListQuery}
            searchPlaceholder="Search location, purpose, status…"
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
                ? "Fetching On Duty requests…"
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
              Submit a request when you need an on-duty or field visit.
            </p>
            <Button
              type="button"
              className="mt-4 h-10 rounded-xl"
              onClick={() => setShowForm(true)}
            >
              <Plus className="h-4 w-4" />
              New On Duty Request
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
                      Period
                    </th>
                    <th className="px-3 py-2.5 font-semibold">Location</th>
                    <th className="px-3 py-2.5 font-semibold">Purpose</th>
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
                        key={row.onDutyId}
                        className="border-b border-[var(--border)] last:border-0 hover:bg-[var(--panel-soft)]/50"
                      >
                        <td className="px-3 py-3 tabular-nums text-[var(--muted)]">
                          {rowSerial(index, page, limit)}
                        </td>
                        <td className="whitespace-nowrap px-3 py-3 font-medium text-[var(--text)]">
                          <span className="inline-flex items-center gap-1.5">
                            <CalendarDays className="h-3.5 w-3.5 text-[var(--violet)]" />
                            {formatPeriod(
                              row.fromDate,
                              row.toDate,
                              dateFormat
                            )}
                          </span>
                        </td>
                        <td className="max-w-[180px] truncate px-3 py-3 text-[var(--muted)]">
                          <span className="inline-flex items-center gap-1.5">
                            <MapPin className="h-3.5 w-3.5 shrink-0 text-[var(--violet)]" />
                            <span className="truncate">
                              {row.location || "—"}
                            </span>
                          </span>
                        </td>
                        <td className="max-w-[220px] truncate px-3 py-3 text-[var(--muted)]">
                          {row.purpose || "—"}
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
                            requestId={row.onDutyId}
                            canCancel={isPending}
                            onView={() => setSelected(row)}
                            onCancel={() => handleCancel(row.onDutyId)}
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

      <div className="flex gap-2.5 rounded-2xl border border-[var(--violet)]/15 bg-[var(--lavender-soft)]/50 px-4 py-3.5">
        <Info className="mt-0.5 h-4 w-4 shrink-0 text-[var(--violet)]" />
        <div>
          <p className="text-[13px] font-semibold text-[var(--text)]">
            About on-duty / field-visit requests
          </p>
          <ul className="mt-1.5 list-disc space-y-1 pl-4 text-[12px] leading-relaxed text-[var(--muted)]">
            <li>
              You can submit on-duty / field-visit requests for one or more
              days.
            </li>
            <li>Include the visit location and purpose with each request.</li>
            <li>Requests are subject to manager approval.</li>
            <li>You will be notified once your request is reviewed.</li>
          </ul>
        </div>
      </div>

      <SlideOver
        open={showForm}
        onClose={() => {
          setShowForm(false);
          setFormError("");
        }}
        title="New On Duty Request"
        subtitle="Submit an on-duty / field-visit request for approval"
        wide
      >
        <form className="flex min-h-full flex-col pb-6" onSubmit={handleSubmit}>
          <div className="flex-1 space-y-5">
            <div className="flex items-center gap-3">
              <span className="inline-flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-[var(--lavender-soft)] text-[var(--violet)]">
                <BriefcaseBusiness className="h-4 w-4" />
              </span>
              <div className="min-w-0">
                <h3 className="text-[15px] font-semibold text-[var(--text)]">
                  On Duty details
                </h3>
                <p className="mt-0.5 text-[12px] text-[var(--muted)]">
                  Period, location and purpose for approval
                </p>
              </div>
            </div>

            <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
              <div className="min-w-0">
                <label className="block text-[12px] font-semibold text-[var(--text)]">
                  From date <span className="text-[var(--danger)]">*</span>
                </label>
                <input
                  type="date"
                  required
                  className={fieldClass}
                  value={form.fromDate}
                  onChange={(e) =>
                    setForm((prev) => ({
                      ...prev,
                      fromDate: e.target.value,
                      toDate:
                        prev.toDate && prev.toDate < e.target.value
                          ? e.target.value
                          : prev.toDate,
                    }))
                  }
                />
              </div>

              <div className="min-w-0">
                <label className="block text-[12px] font-semibold text-[var(--text)]">
                  To date <span className="text-[var(--danger)]">*</span>
                </label>
                <input
                  type="date"
                  required
                  min={form.fromDate || undefined}
                  className={fieldClass}
                  value={form.toDate}
                  onChange={(e) =>
                    setForm((prev) => ({ ...prev, toDate: e.target.value }))
                  }
                />
              </div>

              <div className="min-w-0 sm:col-span-2">
                <label className="block text-[12px] font-semibold text-[var(--text)]">
                  Location <span className="text-[var(--danger)]">*</span>
                </label>
                <div className="relative mt-1.5">
                  <MapPin className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-[var(--muted)]" />
                  <input
                    type="text"
                    required
                    placeholder="Enter visit location"
                    className="h-11 w-full rounded-xl border border-[var(--border)] bg-[var(--surface)] py-0 pl-9 pr-3 text-[13px] leading-none text-[var(--text)] outline-none transition placeholder:text-[var(--muted)] focus:border-[var(--violet)] focus:ring-2 focus:ring-[var(--lavender-soft)]"
                    value={form.location}
                    onChange={(e) =>
                      setForm((prev) => ({
                        ...prev,
                        location: e.target.value,
                      }))
                    }
                  />
                </div>
              </div>

              <div className="min-w-0 sm:col-span-2">
                <label className="block text-[12px] font-semibold text-[var(--text)]">
                  Purpose <span className="text-[var(--danger)]">*</span>
                </label>
                <input
                  type="text"
                  required
                  placeholder="Enter purpose for on-duty / field visit"
                  className="mt-1.5 h-11 w-full rounded-xl border border-[var(--border)] bg-[var(--surface)] px-3 py-0 text-[13px] leading-none text-[var(--text)] outline-none transition placeholder:text-[var(--muted)] focus:border-[var(--violet)] focus:ring-2 focus:ring-[var(--lavender-soft)]"
                  value={form.purpose}
                  onChange={(e) =>
                    setForm((prev) => ({ ...prev, purpose: e.target.value }))
                  }
                />
                <p className="mt-1.5 text-[11px] leading-snug text-[var(--muted)]">
                  {formDays != null
                    ? `${formDays} day${formDays === 1 ? "" : "s"} selected · `
                    : ""}
                  Provide a clear purpose for your On Duty request
                </p>
              </div>
            </div>

            <div className="flex gap-2.5 rounded-xl border border-[var(--violet)]/15 bg-[var(--lavender-soft)]/60 px-3.5 py-3">
              <Info className="mt-0.5 h-4 w-4 shrink-0 text-[var(--violet)]" />
              <p className="text-[12px] leading-relaxed text-[var(--muted)]">
                <span className="font-semibold text-[var(--text)]">
                  Important note:
                </span>{" "}
                On Duty requests are subject to manager approval. You will be
                notified once your request is reviewed.
              </p>
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
        title="On Duty details"
        subtitle={
          selected
            ? formatPeriod(selected.fromDate, selected.toDate, dateFormat)
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
                  disabled={cancellingId === selected.onDutyId}
                  onClick={() => handleCancel(selected.onDutyId)}
                >
                  <XCircle className="h-4 w-4" />
                  {cancellingId === selected.onDutyId
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
                <DetailField icon={CalendarDays} label="From date">
                  {formatDateWithWeekday(selected.fromDate, dateFormat)}
                </DetailField>
                <DetailField icon={CalendarDays} label="To date">
                  {formatDateWithWeekday(selected.toDate, dateFormat)}
                </DetailField>
                <DetailField label="Duration">
                  {(() => {
                    const days = dayCount(selected.fromDate, selected.toDate);
                    return days != null
                      ? `${days} day${days === 1 ? "" : "s"}`
                      : "—";
                  })()}
                </DetailField>
                <DetailField icon={MapPin} label="Location">
                  {selected.location || "—"}
                </DetailField>
                <DetailField label="Submitted">
                  {selected.createdAt
                    ? formatDateTime(
                        selected.createdAt,
                        dateFormat,
                        timeFormat
                      )
                    : "—"}
                </DetailField>
                <DetailField label="Purpose" className="sm:col-span-2">
                  <p className="whitespace-pre-wrap font-normal leading-relaxed text-[var(--text)]">
                    {selected.purpose || "—"}
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
    </div>
  );
}
