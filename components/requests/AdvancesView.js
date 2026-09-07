"use client";

import {
  CalendarDays,
  CheckCircle2,
  Coins,
  Eye,
  Inbox,
  MoreVertical,
  Plus,
  RefreshCw,
  Send,
  Wallet,
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
  cancelAdvance,
  submitAdvance,
  useAdvancesList,
} from "@/hooks/useAdvances";
import {
  countActiveDateFilters,
  rowMatchesDateRange,
} from "@/lib/request-date-filter";
import { useRequestListQuery } from "@/hooks/useRequestListQuery";
import { getApiErrorMessage } from "@/lib/api-error";
import {
  formatCurrency,
  formatDate,
  formatDateTime,
  rowSerial,
} from "@/lib/format";
import { useModules } from "@/components/modules/ModulesProvider";
import { ComingSoon } from "@/components/ui/ComingSoon";
import { PageLoader } from "@/components/ui/Spinner";

const fieldClass =
  "mt-1.5 h-11 w-full rounded-xl border border-[var(--border)] bg-[var(--surface)] px-3 text-[13px] text-[var(--text)] outline-none transition focus:border-[var(--violet)] focus:ring-2 focus:ring-[var(--lavender-soft)]";

function emptyForm() {
  const today = new Date();
  const y = today.getFullYear();
  const m = String(today.getMonth() + 1).padStart(2, "0");
  const d = String(today.getDate()).padStart(2, "0");
  return {
    amount: "",
    requestDate: `${y}-${m}-${d}`,
    reason: "",
    recoveryInstallments: "",
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

function recoveryStatusTone(status) {
  const s = String(status || "").toLowerCase();
  if (s === "paid" || s === "recovered") {
    return "border-[var(--success)]/25 bg-[var(--success-soft)] text-[var(--success)]";
  }
  if (s === "skipped") {
    return "border-[var(--border)] bg-[var(--panel-soft)] text-[var(--muted)]";
  }
  if (s === "pending") {
    return "border-[var(--warning)]/30 bg-[var(--warning-soft)] text-[var(--warning)]";
  }
  return "border-[var(--border)] bg-[var(--panel-soft)] text-[var(--muted)]";
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
        event.target.closest?.(`[data-advance-menu="${requestId}"]`)
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
              data-advance-menu={requestId}
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

function RecoverySchedule({ recoveries, currency, dateFormat }) {
  if (!recoveries?.length) {
    return (
      <p className="text-[13px] text-[var(--muted)]">
        No recovery schedule available yet.
      </p>
    );
  }

  return (
    <div className="overflow-x-auto rounded-xl border border-[var(--border)]">
      <table className="min-w-full text-left text-[12px]">
        <thead className="border-b border-[var(--border)] bg-[var(--panel-soft)]/60 text-[10px] font-semibold uppercase tracking-wide text-[var(--muted)]">
          <tr>
            <th className="px-3 py-2.5">#</th>
            <th className="px-3 py-2.5">Due month</th>
            <th className="px-3 py-2.5">Amount</th>
            <th className="px-3 py-2.5">Status</th>
            <th className="px-3 py-2.5">Remarks</th>
          </tr>
        </thead>
        <tbody>
          {recoveries.map((item) => (
            <tr
              key={item.recoveryId || item.installmentNo}
              className="border-b border-[var(--border)] last:border-b-0"
            >
              <td className="px-3 py-2.5 tabular-nums text-[var(--muted)]">
                {item.installmentNo ?? "—"}
              </td>
              <td className="px-3 py-2.5 whitespace-nowrap">
                {item.dueMonth ? formatDate(item.dueMonth, dateFormat) : "—"}
              </td>
              <td className="px-3 py-2.5 whitespace-nowrap font-semibold">
                {formatCurrency(item.amount, currency)}
              </td>
              <td className="px-3 py-2.5">
                <span
                  className={`inline-flex rounded-full border px-2 py-0.5 text-[10px] font-semibold capitalize ${recoveryStatusTone(item.status)}`}
                >
                  {item.status || "—"}
                </span>
              </td>
              <td className="max-w-[180px] truncate px-3 py-2.5 text-[var(--muted)]">
                {item.remarks || "—"}
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}

function formatRecoverySummary(row, currency) {
  if (row.recoveryInstallments && row.recoveryAmountPerMonth) {
    return `${row.recoveryInstallments} × ${formatCurrency(row.recoveryAmountPerMonth, currency)}`;
  }
  if (row.recoveryInstallments) {
    return `${row.recoveryInstallments} installment${row.recoveryInstallments === 1 ? "" : "s"}`;
  }
  return "—";
}

export function AdvancesView({
  timeFormat = "12h",
  dateFormat = "DD/MM/YYYY",
  currency = "PKR",
}) {
  const { canShowRequestTile, loading: modulesLoading } = useModules();
  const moduleEnabled = canShowRequestTile("advances");

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

  const { rows, meta, stats, loading, error, refetch } = useAdvancesList({
    status,
    page,
    limit,
    enabled: moduleEnabled && !modulesLoading,
  });

  const dateFilterCount = countActiveDateFilters(dateFrom, dateTo);

  const filteredRows = useMemo(() => {
    const q = listQuery.trim().toLowerCase();
    return (rows || []).filter((row) => {
      if (
        !rowMatchesDateRange(row, dateFrom, dateTo, [
          "createdAt",
          "requestDate",
        ])
      ) {
        return false;
      }
      if (!q) return true;
      const hay = [
        row.reason,
        row.status,
        row.statusLabel,
        row.levelName,
        row.amount,
        row.requestDate,
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

  const previewRecovery = useMemo(() => {
    const amount = Number(form.amount);
    const count = Number(form.recoveryInstallments);
    if (!Number.isFinite(amount) || !Number.isFinite(count) || count <= 0) {
      return null;
    }
    return Math.round((amount / count) * 100) / 100;
  }, [form.amount, form.recoveryInstallments]);

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
        id: "amount",
        header: "Amount",
        cellClassName: "whitespace-nowrap font-semibold text-[var(--text)]",
        cell: (row) => (
          <span className="inline-flex items-center gap-1.5">
            <Coins className="h-3.5 w-3.5 text-[var(--violet)]" />
            {formatCurrency(row.amount, currency)}
          </span>
        ),
      },
      {
        id: "requestDate",
        header: "Request date",
        cellClassName: "whitespace-nowrap text-[var(--muted)]",
        cell: (row) =>
          row.requestDate ? formatDate(row.requestDate, dateFormat) : "—",
      },
      {
        id: "recovery",
        header: "Recovery",
        cellClassName: "whitespace-nowrap text-[var(--muted)]",
        cell: (row) => formatRecoverySummary(row, currency),
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
              requestId={row.advanceId}
              canCancel={isPending}
              onView={() => setSelected(row)}
              onCancel={() => handleCancel(row.advanceId)}
            />
          );
        },
      },
    ],
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [currentPage, limit, dateFormat, timeFormat, currency]
  );

  function refreshAll() {
    refetch();
  }

  async function handleSubmit(event) {
    event.preventDefault();
    setFormError("");

    if (!moduleEnabled) {
      setFormError("This request module is not enabled for your company.");
      return;
    }

    const amount = Number(form.amount);
    const recoveryInstallments = Number(form.recoveryInstallments);

    if (!Number.isFinite(amount) || amount <= 0) {
      setFormError("Enter a valid advance amount.");
      return;
    }
    if (!form.requestDate) {
      setFormError("Select a request date.");
      return;
    }
    if (!Number.isFinite(recoveryInstallments) || recoveryInstallments <= 0) {
      setFormError("Enter a valid number of recovery installments.");
      return;
    }
    if (!form.reason.trim()) {
      setFormError("Please provide a reason for the advance.");
      return;
    }

    setSubmitting(true);
    try {
      const res = await submitAdvance({
        amount,
        requestDate: form.requestDate,
        reason: form.reason.trim(),
        recoveryInstallments,
      });
      setShowForm(false);
      setForm(emptyForm());
      setFlashTone("success");
      setFlash(res?.message || "Advance request submitted for approval.");
      setStatus("all");
      setPage(1);
      refreshAll();
    } catch (err) {
      setFormError(getApiErrorMessage(err, "Failed to submit advance request."));
    } finally {
      setSubmitting(false);
    }
  }

  async function handleCancel(requestId) {
    if (!requestId) return;
    if (!moduleEnabled) {
      setFlashTone("danger");
      setFlash("This request module is not enabled for your company.");
      return;
    }
    if (!window.confirm("Cancel this pending advance request?")) return;

    setCancellingId(requestId);
    try {
      const res = await cancelAdvance(requestId);
      setFlashTone("success");
      setFlash(res?.message || "Advance request cancelled.");
      if (selected?.advanceId === requestId) setSelected(null);
      refreshAll();
    } catch (err) {
      setFlashTone("danger");
      setFlash(getApiErrorMessage(err, "Failed to cancel request."));
    } finally {
      setCancellingId(null);
    }
  }

  if (modulesLoading) {
    return (
      <PageLoader label="Loading" hint="Checking advances access…" />
    );
  }

  if (!moduleEnabled) {
    return (
      <ComingSoon
        title="Advances"
        description="This request module is not enabled for your company."
      />
    );
  }

  return (
    <PortalPage
      fill
      title="Salary Advances"
      subtitle="Apply for salary advances and track recovery schedules."
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
            New Advance Request
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

      {flash ? (
        <FlashBanner
          message={flash}
          tone={flashTone}
          duration={4000}
          onDismiss={() => setFlash("")}
        />
      ) : null}

      <TablePanel
        fill
        title="Advance Logs"
        titleCount={total}
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
            hint="Apply uses these dates for advance logs."
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
        getRowKey={(row) => row.advanceId}
        minWidth="980px"
        loading={loading}
        loadingLabel="Loading requests"
        loadingHint="Fetching advance requests…"
        error={error}
        emptyIcon={Inbox}
        emptyTitle={`No ${status === "all" ? "" : `${status} `}requests`}
        emptyHint="Submit a request when you need a salary advance."
        emptyAction={
          <Button
            type="button"
            className="h-10 rounded-xl"
            onClick={() => setShowForm(true)}
          >
            <Plus className="h-4 w-4" />
            New Advance Request
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
        title="New Advance Request"
        subtitle="Submit a salary advance for approval"
        wide
      >
        <form className="flex min-h-full flex-col pb-6" onSubmit={handleSubmit}>
          <div className="flex-1 space-y-5">
            <div className="flex items-center gap-3">
              <span className="inline-flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-[var(--lavender-soft)] text-[var(--violet)]">
                <Coins className="h-4 w-4" />
              </span>
              <div className="min-w-0">
                <h3 className="text-[15px] font-semibold text-[var(--text)]">
                  Advance details
                </h3>
                <p className="mt-0.5 text-[12px] text-[var(--muted)]">
                  Amount, request date, and recovery plan
                </p>
              </div>
            </div>

            <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
              <div className="min-w-0">
                <label className="block text-[12px] font-semibold text-[var(--text)]">
                  Amount ({currency}){" "}
                  <span className="text-[var(--danger)]">*</span>
                </label>
                <input
                  type="number"
                  required
                  min="1"
                  step="1"
                  placeholder="1000"
                  className={fieldClass}
                  value={form.amount}
                  onChange={(e) =>
                    setForm((prev) => ({ ...prev, amount: e.target.value }))
                  }
                />
              </div>

              <div className="min-w-0">
                <label className="block text-[12px] font-semibold text-[var(--text)]">
                  Request date <span className="text-[var(--danger)]">*</span>
                </label>
                <input
                  type="date"
                  required
                  className={fieldClass}
                  value={form.requestDate}
                  onChange={(e) =>
                    setForm((prev) => ({
                      ...prev,
                      requestDate: e.target.value,
                    }))
                  }
                />
              </div>

              <div className="min-w-0 sm:col-span-2">
                <label className="block text-[12px] font-semibold text-[var(--text)]">
                  Recovery installments{" "}
                  <span className="text-[var(--danger)]">*</span>
                </label>
                <input
                  type="number"
                  required
                  min="1"
                  step="1"
                  placeholder="3"
                  className={fieldClass}
                  value={form.recoveryInstallments}
                  onChange={(e) =>
                    setForm((prev) => ({
                      ...prev,
                      recoveryInstallments: e.target.value,
                    }))
                  }
                />
              </div>

              <div className="min-w-0 sm:col-span-2">
                <label className="block text-[12px] font-semibold text-[var(--text)]">
                  Reason <span className="text-[var(--danger)]">*</span>
                </label>
                <textarea
                  required
                  rows={4}
                  placeholder="Enter reason for salary advance"
                  className="mt-1.5 w-full resize-none rounded-xl border border-[var(--border)] bg-[var(--surface)] px-3 py-2.5 text-[13px] text-[var(--text)] outline-none transition focus:border-[var(--violet)] focus:ring-2 focus:ring-[var(--lavender-soft)]"
                  value={form.reason}
                  onChange={(e) =>
                    setForm((prev) => ({ ...prev, reason: e.target.value }))
                  }
                />
                <p className="mt-1.5 text-[11px] leading-snug text-[var(--muted)]">
                  {previewRecovery != null
                    ? `Estimated recovery per month: ${formatCurrency(previewRecovery, currency)} · `
                    : ""}
                  Amount must be within your company advance policy limits.
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
        title="Advance details"
        subtitle={
          selected ? formatCurrency(selected.amount, currency) : undefined
        }
        wide
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
                  disabled={cancellingId === selected.advanceId}
                  onClick={() => handleCancel(selected.advanceId)}
                >
                  <XCircle className="h-4 w-4" />
                  {cancellingId === selected.advanceId
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
                <DetailField icon={Wallet} label="Amount">
                  {formatCurrency(selected.amount, currency)}
                </DetailField>
                <DetailField icon={CalendarDays} label="Request date">
                  {selected.requestDate
                    ? formatDate(selected.requestDate, dateFormat)
                    : "—"}
                </DetailField>
                <DetailField label="Recovery installments">
                  {selected.recoveryInstallments ?? "—"}
                </DetailField>
                <DetailField label="Recovery per month">
                  {formatCurrency(selected.recoveryAmountPerMonth, currency)}
                </DetailField>
                <DetailField label="Total recovered">
                  {formatCurrency(selected.totalRecovered, currency)}
                </DetailField>
                <DetailField label="Total pending">
                  {formatCurrency(selected.totalPending, currency)}
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
                <DetailField label="Reason" className="sm:col-span-2">
                  <p className="whitespace-pre-wrap font-normal leading-relaxed text-[var(--text)]">
                    {selected.reason || "—"}
                  </p>
                </DetailField>
              </dl>
            </section>

            <section className="rounded-2xl border border-[var(--border)] bg-[var(--surface)] p-5 shadow-[var(--card-shadow)]">
              <div className="mb-4 border-b border-[var(--border)] pb-3">
                <p className="text-[11px] font-semibold uppercase tracking-wide text-[var(--muted)]">
                  Repayment
                </p>
                <h3 className="mt-0.5 text-[15px] font-semibold text-[var(--text)]">
                  Recovery schedule
                </h3>
              </div>
              <RecoverySchedule
                recoveries={selected.recoveries}
                currency={currency}
                dateFormat={dateFormat}
              />
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
