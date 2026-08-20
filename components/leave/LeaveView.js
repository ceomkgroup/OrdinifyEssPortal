"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import { createPortal } from "react-dom";
import {
  Banknote,
  CalendarDays,
  CheckCircle2,
  ChevronLeft,
  ChevronRight,
  Clock3,
  Eye,
  FilePenLine,
  Hourglass,
  Inbox,
  MoreVertical,
  Palmtree,
  Plus,
  RefreshCw,
  Send,
  Sparkles,
  X,
} from "lucide-react";
import { Button } from "@/components/ui/Button";
import { Card } from "@/components/ui/Card";
import { FlashBanner } from "@/components/ui/FlashBanner";
import { PageLoader } from "@/components/ui/Spinner";
import { SlideOver } from "@/components/ui/SlideOver";
import { useLeavePage } from "@/hooks/useLeave";
import { formatDate, formatDateTime } from "@/lib/format";

const STATUS_FILTERS = [
  { value: "all", label: "All" },
  { value: "pending", label: "Pending" },
  { value: "approved", label: "Approved" },
  { value: "cancelled", label: "Cancel" },
];

const fieldClass =
  "mt-1.5 h-11 w-full rounded-xl border border-[var(--border)] bg-[var(--surface)] px-3 text-[13px] text-[var(--text)] outline-none transition placeholder:text-[var(--muted)] focus:border-[var(--violet)] focus:ring-2 focus:ring-[var(--lavender-soft)]";

function statusTone(status) {
  const s = String(status || "").toLowerCase();
  if (s === "approved") {
    return "border-[var(--success)]/20 bg-[var(--success-soft)] text-[var(--success)]";
  }
  if (s === "rejected" || s === "cancelled") {
    return "border-[var(--danger)]/20 bg-[var(--danger-soft)] text-[var(--danger)]";
  }
  if (s === "pending") {
    return "border-[var(--violet)]/20 bg-[var(--lavender-soft)] text-[var(--violet)]";
  }
  return "border-[var(--border)] bg-[var(--panel-soft)] text-[var(--muted)]";
}

function emptyLeaveForm() {
  return {
    leaveTypeId: "",
    fromDate: "",
    toDate: "",
    reason: "",
    isFirstHalf: false,
    isSecondHalf: false,
    attachmentUrl: "",
  };
}

function emptyEncashForm() {
  return {
    leaveTypeId: "",
    daysToEncash: "",
    fiscalYear: String(new Date().getFullYear()),
    remarks: "",
  };
}

function leaveTypeName(balances, leaveTypeId) {
  const row = (balances || []).find((b) => b.leaveTypeId === leaveTypeId);
  return row?.leaveTypeName || "—";
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

function num(v, digits = 1) {
  const n = Number(v);
  if (!Number.isFinite(n)) return "0";
  return n.toFixed(digits);
}

function estimateDays(fromDate, toDate, isFirstHalf, isSecondHalf) {
  if (!fromDate || !toDate) return null;
  const from = new Date(`${fromDate}T00:00:00`);
  const to = new Date(`${toDate}T00:00:00`);
  if (Number.isNaN(from.getTime()) || Number.isNaN(to.getTime()) || to < from) {
    return null;
  }
  const full = Math.round((to - from) / 86400000) + 1;
  if (fromDate === toDate && (isFirstHalf || isSecondHalf)) return 0.5;
  return full;
}

function StatusPill({ status, label }) {
  return (
    <span
      className={`inline-flex items-center rounded-full border px-2.5 py-0.5 text-[11px] font-semibold capitalize tracking-wide ${statusTone(status)}`}
    >
      {label || status || "—"}
    </span>
  );
}

function FilterPills({ value, onChange }) {
  return (
    <div className="inline-flex flex-wrap gap-1 rounded-2xl border border-[var(--border)] bg-[var(--panel-soft)] p-1">
      {STATUS_FILTERS.map((item) => {
        const active = value === item.value;
        return (
          <button
            key={item.value}
            type="button"
            onClick={() => onChange(item.value)}
            className={`rounded-xl px-3 py-1.5 text-[12px] font-semibold transition ${
              active
                ? "bg-[var(--surface)] text-[var(--violet)] shadow-[var(--card-shadow)]"
                : "text-[var(--muted)] hover:text-[var(--text)]"
            }`}
          >
            {item.label}
          </button>
        );
      })}
    </div>
  );
}

function Pagination({ page, totalPages, total, limit, loading, onPage, onLimit }) {
  const fromRow = total === 0 ? 0 : (page - 1) * limit + 1;
  const toRow = Math.min(page * limit, total);

  return (
    <div className="mt-4 flex flex-col gap-3 border-t border-[var(--border)] pt-4 sm:flex-row sm:items-center sm:justify-between">
      <p className="text-[12px] text-[var(--muted)]">
        Showing{" "}
        <span className="font-semibold text-[var(--text)]">{fromRow}</span>–
        <span className="font-semibold text-[var(--text)]">{toRow}</span> of{" "}
        <span className="font-semibold text-[var(--text)]">{total}</span>
      </p>
      <div className="flex flex-wrap items-center gap-2">
        <label className="flex items-center gap-1.5 text-[12px] text-[var(--muted)]">
          Rows
          <select
            value={limit}
            onChange={(e) => onLimit(Number(e.target.value))}
            className="h-9 rounded-lg border border-[var(--border)] bg-[var(--surface)] px-2 text-[12px] text-[var(--text)]"
          >
            {[10, 20, 30, 50].map((n) => (
              <option key={n} value={n}>
                {n}
              </option>
            ))}
          </select>
        </label>
        <Button
          type="button"
          variant="outline"
          className="h-9 rounded-lg"
          disabled={page <= 1 || loading}
          onClick={() => onPage(Math.max(1, page - 1))}
        >
          <ChevronLeft className="h-4 w-4" />
        </Button>
        <span className="min-w-[56px] text-center text-[12px] font-semibold text-[var(--text)]">
          {page} / {Math.max(1, totalPages)}
        </span>
        <Button
          type="button"
          variant="outline"
          className="h-9 rounded-lg"
          disabled={page >= totalPages || loading || total === 0}
          onClick={() => onPage(Math.min(totalPages, page + 1))}
        >
          <ChevronRight className="h-4 w-4" />
        </Button>
      </div>
    </div>
  );
}

function LeaveMetricCard({
  icon: Icon = CalendarDays,
  title,
  description,
  color = "#7b39ec",
  primaryLabel = "Available",
  primaryValue,
  secondaryLabel = "Used",
  secondaryValue,
  secondaryHint,
  onApply,
  onView,
  applyLabel = "Apply",
}) {
  return (
    <div className="relative flex h-full flex-col overflow-hidden rounded-2xl border border-dashed border-[var(--violet)]/35 bg-gradient-to-br from-[var(--lavender-soft)] via-[var(--surface)] to-[var(--violet-soft)] p-4 shadow-[var(--card-shadow)]">
      <div
        className="absolute -right-8 -top-8 h-28 w-28 rounded-full blur-2xl"
        style={{ background: `${color}22` }}
      />
      <div className="relative min-w-0">
        <div className="flex items-center gap-2">
          <span
            className="inline-flex h-8 w-8 shrink-0 items-center justify-center rounded-xl text-white"
            style={{ background: color }}
          >
            <Icon className="h-4 w-4" />
          </span>
          <p className="truncate text-[14px] font-semibold text-[var(--text)]">
            {title}
          </p>
        </div>
        {description ? (
          <p className="mt-2 text-[12px] leading-relaxed text-[var(--muted)]">
            {description}
          </p>
        ) : null}
      </div>

      <div className="relative mt-4 grid grid-cols-2 gap-2">
        <div className="rounded-xl bg-[var(--surface)]/80 px-3 py-2.5 ring-1 ring-[var(--border)]">
          <p className="text-[9px] font-semibold uppercase tracking-wide text-[var(--muted)]">
            {primaryLabel}
          </p>
          <p
            className="mt-0.5 text-[16px] font-bold tabular-nums"
            style={{ color }}
          >
            {primaryValue}
          </p>
        </div>
        <div className="rounded-xl bg-[var(--surface)]/80 px-3 py-2.5 ring-1 ring-[var(--border)]">
          <p className="text-[9px] font-semibold uppercase tracking-wide text-[var(--muted)]">
            {secondaryLabel}
          </p>
          <p className="mt-0.5 text-[16px] font-bold tabular-nums text-[var(--text)]">
            {secondaryValue}
            {secondaryHint ? (
              <span className="ml-1 text-[11px] font-semibold text-[var(--warning)]">
                {secondaryHint}
              </span>
            ) : null}
          </p>
        </div>
      </div>

      <div className="relative mt-auto flex flex-wrap gap-2 pt-4">
        <Button
          type="button"
          className="h-9 flex-1 rounded-xl"
          onClick={onApply}
        >
          <Plus className="h-3.5 w-3.5" />
          {applyLabel}
        </Button>
        {onView ? (
          <Button
            type="button"
            variant="outline"
            className="h-9 rounded-xl"
            onClick={onView}
          >
            View
          </Button>
        ) : null}
      </div>
    </div>
  );
}

function BalanceCard({ row, fiscalYear, onApply, onView }) {
  const remaining = Number(row.remaining) || 0;
  const used = Number(row.used) || 0;
  const pending = Number(row.pending) || 0;
  const allocated = Number(row.allocated) || 0;
  const carry = Number(row.carryForward) || 0;
  const pool = allocated + carry;
  const color = row.colorCode || "#7b39ec";

  return (
    <LeaveMetricCard
      icon={CalendarDays}
      title={row.leaveTypeName}
      description={`FY ${row.fiscalYear ?? fiscalYear} · Pool ${num(pool)} days (alloc ${num(allocated)}${carry ? ` + CF ${num(carry)}` : ""}).`}
      color={color}
      primaryLabel="Available"
      primaryValue={num(remaining)}
      secondaryLabel="Used"
      secondaryValue={num(used)}
      secondaryHint={pending > 0 ? `· ${num(pending)} pend` : undefined}
      onApply={() => onApply?.(row.leaveTypeId)}
      onView={onView ? () => onView(row) : undefined}
    />
  );
}

function EncashmentPromoCard({
  pendingCount,
  totalCount,
  remainingDays,
  onApply,
  onView,
}) {
  return (
    <LeaveMetricCard
      icon={Banknote}
      title="Leave encashment"
      description="Convert unused leave days into salary when your company policy allows it."
      color="#7b39ec"
      primaryLabel="Available"
      primaryValue={num(remainingDays)}
      secondaryLabel="Requests"
      secondaryValue={totalCount}
      secondaryHint={pendingCount > 0 ? `· ${pendingCount} pending` : undefined}
      onApply={onApply}
      onView={onView}
    />
  );
}

function EmptyState({ icon: Icon, title, hint, action }) {
  return (
    <div className="flex min-h-[200px] flex-col items-center justify-center rounded-2xl border border-dashed border-[var(--border)] bg-[var(--panel-soft)]/60 px-6 py-10 text-center">
      <div className="flex h-14 w-14 items-center justify-center rounded-2xl bg-[var(--lavender-soft)] text-[var(--violet)]">
        <Icon className="h-7 w-7" strokeWidth={1.5} />
      </div>
      <p className="mt-4 text-[14px] font-semibold text-[var(--text)]">{title}</p>
      {hint ? (
        <p className="mt-1 max-w-sm text-[12px] text-[var(--muted)]">{hint}</p>
      ) : null}
      {action ? <div className="mt-4">{action}</div> : null}
    </div>
  );
}

function LeaveRequestRowActions({
  requestId,
  canEdit,
  canCancel,
  onView,
  onEdit,
  onCancel,
}) {
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
        event.target.closest?.(`[data-leave-menu="${requestId}"]`)
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
              data-leave-menu={requestId}
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
              {canEdit ? (
                <button
                  type="button"
                  className="flex w-full items-center gap-2 px-3 py-2.5 text-left text-[13px] font-semibold text-[var(--text)] hover:bg-[var(--panel-soft)]"
                  onClick={() => {
                    setOpen(false);
                    onEdit?.();
                  }}
                >
                  <FilePenLine className="h-4 w-4 text-[var(--violet)]" />
                  Edit
                </button>
              ) : null}
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

export function LeaveView({ initialTab = "requests" }) {
  const {
    fiscalYear,
    setFiscalYear,
    balances,
    balanceLoading,
    status,
    setStatusFilter,
    page,
    setPage,
    limit,
    setLimit,
    requests,
    meta,
    requestsLoading,
    encashmentEnabled,
    encashStatus,
    setEncashStatusFilter,
    encashPage,
    setEncashPage,
    encashLimit,
    setEncashLimit,
    encashRows,
    encashMeta,
    encashDisabled,
    encashMessage,
    encashLoading,
    error,
    setError,
    refetch,
    submitLeave,
    cancelLeave,
    updateLeave,
    submitEncashment,
    cancelEncashment,
  } = useLeavePage();

  const [mainTab, setMainTab] = useState(() =>
    initialTab === "encashment" ? "encashment" : "requests"
  );
  const [formOpen, setFormOpen] = useState(false);
  const [form, setForm] = useState(emptyLeaveForm);
  const [editingRequestId, setEditingRequestId] = useState("");
  const [saving, setSaving] = useState(false);
  const [message, setMessage] = useState("");
  const [cancellingId, setCancellingId] = useState("");
  const [detail, setDetail] = useState(null);
  const [balanceDetail, setBalanceDetail] = useState(null);

  const [encashOpen, setEncashOpen] = useState(false);
  const [encashForm, setEncashForm] = useState(emptyEncashForm);
  const [encashSaving, setEncashSaving] = useState(false);
  const [encashCancellingId, setEncashCancellingId] = useState("");
  const [encashDetail, setEncashDetail] = useState(null);

  const yearOptions = useMemo(() => {
    const y = new Date().getFullYear();
    return [y - 1, y, y + 1];
  }, []);

  const totals = useMemo(() => {
    return balances.reduce(
      (acc, row) => {
        acc.remaining += Number(row.remaining) || 0;
        acc.used += Number(row.used) || 0;
        acc.pending += Number(row.pending) || 0;
        acc.allocated += Number(row.allocated) || 0;
        return acc;
      },
      { remaining: 0, used: 0, pending: 0, allocated: 0 }
    );
  }, [balances]);

  const estimatedDays = useMemo(
    () =>
      estimateDays(
        form.fromDate,
        form.toDate,
        form.isFirstHalf,
        form.isSecondHalf
      ),
    [form.fromDate, form.toDate, form.isFirstHalf, form.isSecondHalf]
  );

  const selectedBalance = useMemo(
    () => balances.find((b) => b.leaveTypeId === form.leaveTypeId),
    [balances, form.leaveTypeId]
  );

  const requestTotal = Number(meta?.total) || 0;
  const requestPages = Math.max(1, Number(meta?.totalPages) || 1);
  const encashTotal = Number(encashMeta?.total) || 0;
  const encashPages = Math.max(1, Number(encashMeta?.totalPages) || 1);

  function setField(key, value) {
    setForm((prev) => ({ ...prev, [key]: value }));
  }

  function setEncashField(key, value) {
    setEncashForm((prev) => ({ ...prev, [key]: value }));
  }

  function openApply(prefillTypeId) {
    setEditingRequestId("");
    setForm({
      ...emptyLeaveForm(),
      leaveTypeId: prefillTypeId || "",
    });
    setFormOpen(true);
    setMessage("");
    setError("");
  }

  function openEdit(row) {
    if (!row?.requestId) return;
    setEditingRequestId(row.requestId);
    setForm({
      leaveTypeId: row.leaveTypeId || "",
      fromDate: toDateInputValue(row.fromDate),
      toDate: toDateInputValue(row.toDate),
      reason: row.reason || "",
      isFirstHalf: Boolean(row.isFirstHalf),
      isSecondHalf: Boolean(row.isSecondHalf),
      attachmentUrl: row.attachmentUrl && row.attachmentUrl !== "string"
        ? row.attachmentUrl
        : "",
    });
    setDetail(null);
    setFormOpen(true);
    setMessage("");
    setError("");
  }

  async function onSubmitLeave(e) {
    e.preventDefault();
    setSaving(true);
    setError("");
    setMessage("");
    try {
      if (!form.leaveTypeId || !form.fromDate || !form.toDate || !form.reason.trim()) {
        throw new Error("Leave type, dates, and reason are required.");
      }
      if (form.isFirstHalf && form.isSecondHalf) {
        throw new Error("Choose either first half or second half, not both.");
      }

      const payload = {
        leaveTypeId: form.leaveTypeId,
        fromDate: form.fromDate,
        toDate: form.toDate,
        reason: form.reason.trim(),
        isFirstHalf: Boolean(form.isFirstHalf),
        isSecondHalf: Boolean(form.isSecondHalf),
      };
      if (form.attachmentUrl.trim()) {
        payload.attachmentUrl = form.attachmentUrl.trim();
      }

      // No dedicated update API — cancel pending then create replacement.
      const result = editingRequestId
        ? await updateLeave(editingRequestId, payload)
        : await submitLeave(payload);
      const days = result?.meta?.totalDays ?? result?.data?.totalDays;
      setMessage(
        editingRequestId
          ? days != null
            ? `Leave request updated (${days} day${Number(days) === 1 ? "" : "s"}).`
            : "Leave request updated."
          : days != null
            ? `Leave request submitted (${days} day${Number(days) === 1 ? "" : "s"}).`
            : "Leave request submitted."
      );
      setForm(emptyLeaveForm());
      setEditingRequestId("");
      setFormOpen(false);
      setMainTab("requests");
    } catch (err) {
      setError(err.message || "Failed to submit leave request");
    } finally {
      setSaving(false);
    }
  }

  async function onCancelLeave(requestId) {
    const id = requestId || "";
    if (!id) {
      setError("Missing leave request id.");
      return;
    }
    if (!window.confirm("Cancel this pending leave request?")) return;
    setCancellingId(id);
    setError("");
    setMessage("");
    try {
      await cancelLeave(id);
      setMessage("Leave request cancelled.");
      if (detail?.requestId === id) setDetail(null);
    } catch (err) {
      setError(err.message || "Failed to cancel leave request");
    } finally {
      setCancellingId("");
    }
  }

  async function onSubmitEncash(e) {
    e.preventDefault();
    setEncashSaving(true);
    setError("");
    setMessage("");
    try {
      if (!encashForm.leaveTypeId || !encashForm.daysToEncash) {
        throw new Error("Leave type and days to encash are required.");
      }
      const result = await submitEncashment({
        leaveTypeId: encashForm.leaveTypeId,
        daysToEncash: Number(encashForm.daysToEncash),
        fiscalYear: Number(encashForm.fiscalYear) || fiscalYear,
        remarks: encashForm.remarks.trim() || undefined,
      });
      setMessage(
        result?.message || "Encashment request submitted successfully."
      );
      setEncashForm({
        ...emptyEncashForm(),
        fiscalYear: String(fiscalYear),
      });
      setEncashOpen(false);
    } catch (err) {
      setError(err.message || "Failed to submit encashment request");
    } finally {
      setEncashSaving(false);
    }
  }

  async function onCancelEncash(encashmentId) {
    if (!window.confirm("Cancel this pending encashment request?")) return;
    setEncashCancellingId(encashmentId);
    setError("");
    setMessage("");
    try {
      await cancelEncashment(encashmentId);
      setMessage("Encashment request cancelled.");
      if (
        encashDetail &&
        (encashDetail.encashmentId ||
          encashDetail.requestId ||
          encashDetail.id) === encashmentId
      ) {
        setEncashDetail(null);
      }
    } catch (err) {
      setError(err.message || "Failed to cancel encashment request");
    } finally {
      setEncashCancellingId("");
    }
  }

  useEffect(() => {
    if (mainTab === "encashment" && !encashmentEnabled) {
      setMainTab("requests");
    }
  }, [encashmentEnabled, mainTab]);

  if (balanceLoading && !balances.length && requestsLoading) {
    return <PageLoader label="Loading leave" hint="Fetching balances and requests…" />;
  }

  const tabs = [
    { id: "requests", label: "Requests", count: requestTotal },
    ...(encashmentEnabled
      ? [{ id: "encashment", label: "Encashment", count: encashTotal }]
      : []),
  ];

  return (
    <div className="flex w-full flex-col gap-5">
      {/* Header */}
      <div className="relative overflow-hidden rounded-2xl border border-[var(--border)] bg-[var(--surface)] p-5 shadow-[var(--card-shadow)] md:p-6">
        <div className="pointer-events-none absolute -right-16 -top-20 h-56 w-56 rounded-full bg-[var(--lavender-soft)] opacity-70 blur-2xl" />
        <div className="pointer-events-none absolute -bottom-24 left-1/3 h-48 w-48 rounded-full bg-[var(--violet-soft)] opacity-50 blur-2xl" />
        <div className="relative flex flex-col gap-4 lg:flex-row lg:items-end lg:justify-between">
          <div>
            <div className="inline-flex items-center gap-1.5 rounded-full bg-[var(--lavender-soft)] px-2.5 py-1 text-[11px] font-semibold text-[var(--violet)]">
              <Sparkles className="h-3.5 w-3.5" />
              Leave management
            </div>
            <h1 className="mt-2 font-[family-name:var(--font-heading)] text-[26px] font-semibold tracking-tight text-[var(--text)] md:text-[30px]">
              Your leave
            </h1>
            <p className="mt-1 max-w-xl text-[13px] text-[var(--muted)]">
              Track balances, apply for time off, and manage pending requests
              for fiscal year {fiscalYear}.
            </p>
          </div>
          <div className="flex flex-wrap items-center gap-2">
            <label className="flex h-10 items-center gap-2 rounded-xl border border-[var(--border)] bg-[var(--panel-soft)] px-3 text-[12px] text-[var(--muted)]">
              FY
              <select
                value={fiscalYear}
                onChange={(e) => setFiscalYear(Number(e.target.value))}
                className="bg-transparent text-[13px] font-semibold text-[var(--text)] outline-none"
              >
                {yearOptions.map((y) => (
                  <option key={y} value={y}>
                    {y}
                  </option>
                ))}
              </select>
            </label>
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
              onClick={() => openApply()}
            >
              <Plus className="h-4 w-4" />
              Apply leave
            </Button>
          </div>
        </div>

        {/* KPI strip */}
        <div className="relative mt-5 grid grid-cols-2 gap-2.5 sm:grid-cols-4">
          {[
            {
              label: "Remaining",
              value: num(totals.remaining),
              icon: CheckCircle2,
              tone: "text-[var(--success)]",
              soft: "bg-[var(--success-soft)]",
            },
            {
              label: "Used",
              value: num(totals.used),
              icon: CalendarDays,
              tone: "text-[var(--violet)]",
              soft: "bg-[var(--lavender-soft)]",
            },
            {
              label: "Pending approval",
              value: num(totals.pending),
              icon: Hourglass,
              tone: "text-[var(--warning)]",
              soft: "bg-[var(--warning-soft)]",
            },
            {
              label: "Leave types",
              value: String(balances.length),
              icon: Palmtree,
              tone: "text-[var(--info)]",
              soft: "bg-[var(--info-soft)]",
            },
          ].map((kpi) => {
            const Icon = kpi.icon;
            return (
              <div
                key={kpi.label}
                className="rounded-2xl border border-[var(--border)] bg-[var(--surface)]/80 px-3.5 py-3 backdrop-blur"
              >
                <div className="flex items-center gap-2">
                  <span
                    className={`inline-flex h-8 w-8 items-center justify-center rounded-xl ${kpi.soft} ${kpi.tone}`}
                  >
                    <Icon className="h-4 w-4" />
                  </span>
                  <p className="text-[11px] font-medium text-[var(--muted)]">
                    {kpi.label}
                  </p>
                </div>
                <p className="mt-2 text-[22px] font-bold tabular-nums leading-none text-[var(--text)]">
                  {kpi.value}
                </p>
              </div>
            );
          })}
        </div>
      </div>

      {error ? (
        <FlashBanner
          message={error}
          tone="danger"
          duration={5000}
          onDismiss={() => setError("")}
        />
      ) : null}
      {message ? (
        <FlashBanner
          message={message}
          tone="success"
          duration={4000}
          onDismiss={() => setMessage("")}
        />
      ) : null}

      {/* Balances */}
      <section>
        <div className="mb-3 flex items-center justify-between gap-3">
          <div>
            <h2 className="font-[family-name:var(--font-heading)] text-[15px] font-semibold text-[var(--text)]">
              Leave balances
            </h2>
            <p className="text-[12px] text-[var(--muted)]">
              Quota by leave type · click Apply to request
            </p>
          </div>
        </div>
        {balanceLoading ? (
          <PageLoader
            compact
            label="Loading balances"
            hint="Fetching leave quotas…"
          />
        ) : balances.length === 0 ? (
          <EmptyState
            icon={Palmtree}
            title={`No balances for FY ${fiscalYear}`}
            hint="Ask HR if leave types have been assigned for this fiscal year."
          />
        ) : (
          <div
            className={`grid gap-3 sm:grid-cols-2 ${
              encashmentEnabled && !encashDisabled
                ? "xl:grid-cols-3"
                : balances.length >= 3
                  ? "xl:grid-cols-3"
                  : "xl:grid-cols-2"
            }`}
          >
            {balances.map((row) => (
              <BalanceCard
                key={row.balanceId || row.leaveTypeId}
                row={row}
                fiscalYear={fiscalYear}
                onApply={openApply}
                onView={setBalanceDetail}
              />
            ))}
            {encashmentEnabled && !encashDisabled ? (
              <EncashmentPromoCard
                remainingDays={totals.remaining}
                totalCount={encashTotal}
                pendingCount={
                  encashRows.filter(
                    (r) => String(r.status || "").toLowerCase() === "pending"
                  ).length
                }
                onApply={() => {
                  setEncashForm((prev) => ({
                    ...prev,
                    fiscalYear: String(fiscalYear),
                  }));
                  setEncashOpen(true);
                }}
                onView={() => setMainTab("encashment")}
              />
            ) : null}
          </div>
        )}
      </section>

      {/* Tabs + lists */}
      <Card className="!p-0 overflow-hidden" bodyClassName="!min-h-0">
        <div className="flex flex-col gap-3 border-b border-[var(--border)] px-4 py-3 sm:flex-row sm:items-center sm:justify-between md:px-5">
          <div className="inline-flex rounded-2xl border border-[var(--border)] bg-[var(--panel-soft)] p-1">
            {tabs.map((tab) => {
              const active = mainTab === tab.id;
              return (
                <button
                  key={tab.id}
                  type="button"
                  onClick={() => setMainTab(tab.id)}
                  className={`inline-flex items-center gap-2 rounded-xl px-3.5 py-2 text-[13px] font-semibold transition ${
                    active
                      ? "bg-[var(--surface)] text-[var(--violet)] shadow-[var(--card-shadow)]"
                      : "text-[var(--muted)] hover:text-[var(--text)]"
                  }`}
                >
                  {tab.id === "encashment" ? (
                    <Banknote className="h-4 w-4" />
                  ) : (
                    <Inbox className="h-4 w-4" />
                  )}
                  {tab.label}
                  <span
                    className={`rounded-full px-1.5 py-0.5 text-[10px] tabular-nums ${
                      active
                        ? "bg-[var(--lavender-soft)] text-[var(--violet)]"
                        : "bg-[var(--muted-bg)] text-[var(--muted)]"
                    }`}
                  >
                    {tab.count}
                  </span>
                </button>
              );
            })}
          </div>
          {mainTab === "encashment" && encashmentEnabled && !encashDisabled ? (
            <Button
              type="button"
              variant="outline"
              className="h-9 rounded-xl"
              onClick={() => {
                setEncashOpen(true);
                setEncashForm((prev) => ({
                  ...prev,
                  fiscalYear: String(fiscalYear),
                }));
              }}
            >
              <Banknote className="h-4 w-4" />
              Apply encashment
            </Button>
          ) : null}
        </div>

        <div className="p-4 md:p-5">
          {mainTab === "requests" ? (
            <>
              <div className="mb-4 flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
                <FilterPills value={status} onChange={setStatusFilter} />
              </div>

              {requestsLoading && requests.length === 0 ? (
                <PageLoader
                  compact
                  label="Loading requests"
                  hint="Fetching leave requests…"
                />
              ) : requests.length === 0 ? (
                <EmptyState
                  icon={Inbox}
                  title="No leave requests"
                  hint={
                    status === "all"
                      ? "When you apply for leave, your requests will show up here."
                      : `No ${status} requests in this view.`
                  }
                  action={
                    <Button
                      type="button"
                      className="h-10 rounded-xl"
                      onClick={() => openApply()}
                    >
                      <Plus className="h-4 w-4" />
                      Apply leave
                    </Button>
                  }
                />
              ) : (
                <div className="overflow-x-auto rounded-2xl border border-[var(--border)]">
                  <table className="min-w-full text-left text-[13px]">
                    <thead>
                      <tr className="border-b border-[var(--border)] bg-[var(--panel-soft)] text-[11px] uppercase tracking-wide text-[var(--muted)]">
                        <th className="px-3 py-2.5 font-semibold">Leave type</th>
                        <th className="px-3 py-2.5 font-semibold">From</th>
                        <th className="px-3 py-2.5 font-semibold">To</th>
                        <th className="px-3 py-2.5 font-semibold">Days</th>
                        <th className="px-3 py-2.5 font-semibold">Status</th>
                        <th className="px-3 py-2.5 font-semibold">Submitted</th>
                        <th className="px-3 py-2.5 font-semibold">Reason</th>
                        <th className="px-3 py-2.5 font-semibold">Action</th>
                      </tr>
                    </thead>
                    <tbody>
                      {requests.map((row) => {
                        const requestId =
                          row.requestId || row.id || row.leaveRequestId;
                        const isPending =
                          String(row.status || "").toLowerCase() === "pending";
                        const half =
                          row.isFirstHalf || row.isSecondHalf
                            ? row.isFirstHalf
                              ? " · 1st half"
                              : " · 2nd half"
                            : "";
                        return (
                          <tr
                            key={requestId}
                            className="border-b border-[var(--border)] last:border-0 hover:bg-[var(--panel-soft)]/70"
                          >
                            <td className="px-3 py-3 font-medium text-[var(--text)]">
                              {row.leaveTypeName ||
                                leaveTypeName(balances, row.leaveTypeId)}
                              {half ? (
                                <span className="text-[11px] text-[var(--muted)]">
                                  {half}
                                </span>
                              ) : null}
                            </td>
                            <td className="whitespace-nowrap px-3 py-3 text-[var(--text)]">
                              {formatDate(row.fromDate)}
                            </td>
                            <td className="whitespace-nowrap px-3 py-3 text-[var(--text)]">
                              {formatDate(row.toDate)}
                            </td>
                            <td className="px-3 py-3 tabular-nums text-[var(--text)]">
                              {row.totalDays ?? "—"}
                            </td>
                            <td className="px-3 py-3">
                              <StatusPill
                                status={row.status}
                                label={row.statusLabel || row.status}
                              />
                              {row.rejectionReason ? (
                                <p className="mt-1 max-w-[160px] truncate text-[10px] text-[var(--danger)]">
                                  {row.rejectionReason}
                                </p>
                              ) : null}
                            </td>
                            <td className="whitespace-nowrap px-3 py-3 text-[var(--muted)]">
                              {row.createdAt
                                ? formatDateTime(row.createdAt)
                                : "—"}
                            </td>
                            <td
                              className="max-w-[180px] truncate px-3 py-3 text-[var(--muted)]"
                              title={row.reason || ""}
                            >
                              {row.reason || "—"}
                            </td>
                            <td className="px-3 py-3">
                              <LeaveRequestRowActions
                                requestId={requestId}
                                canEdit={isPending}
                                canCancel={isPending}
                                onView={() => setDetail({ ...row, requestId })}
                                onEdit={() =>
                                  openEdit({ ...row, requestId })
                                }
                                onCancel={() => onCancelLeave(requestId)}
                              />
                            </td>
                          </tr>
                        );
                      })}
                    </tbody>
                  </table>
                </div>
              )}

              <Pagination
                page={page}
                totalPages={requestPages}
                total={requestTotal}
                limit={limit}
                loading={requestsLoading}
                onPage={setPage}
                onLimit={(n) => {
                  setLimit(n);
                  setPage(1);
                }}
              />
            </>
          ) : (
            <>
              {encashLoading && encashRows.length === 0 ? (
                <PageLoader
                  compact
                  label="Loading encashment"
                  hint="Fetching encashment requests…"
                />
              ) : encashDisabled ? (
                <EmptyState
                  icon={Banknote}
                  title="Encashment not available"
                  hint={
                    encashMessage ||
                    "Leave encashment is not enabled for this company."
                  }
                />
              ) : (
                <>
                  <div className="mb-4 flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
                    <FilterPills
                      value={encashStatus}
                      onChange={setEncashStatusFilter}
                    />
                    {encashLoading ? (
                      <span className="text-[12px] text-[var(--muted)]">
                        Loading…
                      </span>
                    ) : (
                      <span className="text-[12px] text-[var(--muted)]">
                        {encashTotal} total
                      </span>
                    )}
                  </div>
                  {encashRows.length === 0 ? (
                    <EmptyState
                      icon={Banknote}
                      title="No encashment requests"
                      hint="Convert unused leave days to salary when your policy allows it."
                      action={
                        <Button
                          type="button"
                          className="h-10 rounded-xl"
                          onClick={() => {
                            setEncashForm((prev) => ({
                              ...prev,
                              fiscalYear: String(fiscalYear),
                            }));
                            setEncashOpen(true);
                          }}
                        >
                          Apply encashment
                        </Button>
                      }
                    />
                  ) : (
                    <div className="overflow-x-auto rounded-2xl border border-[var(--border)]">
                      <table className="min-w-full text-left text-[13px]">
                        <thead>
                          <tr className="border-b border-[var(--border)] bg-[var(--panel-soft)] text-[11px] uppercase tracking-wide text-[var(--muted)]">
                            <th className="px-3 py-2.5 font-semibold">
                              Leave type
                            </th>
                            <th className="px-3 py-2.5 font-semibold">Days</th>
                            <th className="px-3 py-2.5 font-semibold">
                              Amount
                            </th>
                            <th className="px-3 py-2.5 font-semibold">FY</th>
                            <th className="px-3 py-2.5 font-semibold">
                              Status
                            </th>
                            <th className="px-3 py-2.5 font-semibold">
                              Submitted
                            </th>
                            <th className="px-3 py-2.5 font-semibold">
                              Remarks
                            </th>
                            <th className="px-3 py-2.5 font-semibold">
                              Action
                            </th>
                          </tr>
                        </thead>
                        <tbody>
                          {encashRows.map((row) => {
                            const id =
                              row.encashmentId || row.requestId || row.id;
                            const isPending =
                              String(row.status || "").toLowerCase() ===
                              "pending";
                            const amount =
                              row.amount ??
                              row.encashmentAmount ??
                              row.totalAmount ??
                              row.payableAmount;
                            return (
                              <tr
                                key={id}
                                className="border-b border-[var(--border)] last:border-0 hover:bg-[var(--panel-soft)]/60"
                              >
                                <td className="px-3 py-3 font-medium text-[var(--text)]">
                                  {row.leaveTypeName ||
                                    leaveTypeName(balances, row.leaveTypeId)}
                                </td>
                                <td className="px-3 py-3 tabular-nums text-[var(--text)]">
                                  {row.daysToEncash ?? row.days ?? "—"}
                                </td>
                                <td className="px-3 py-3 tabular-nums text-[var(--text)]">
                                  {amount != null && amount !== ""
                                    ? amount
                                    : "—"}
                                </td>
                                <td className="px-3 py-3">
                                  {row.fiscalYear ?? "—"}
                                </td>
                                <td className="px-3 py-3">
                                  <StatusPill
                                    status={row.status}
                                    label={row.statusLabel || row.status}
                                  />
                                </td>
                                <td className="whitespace-nowrap px-3 py-3 text-[var(--muted)]">
                                  {row.createdAt
                                    ? formatDateTime(row.createdAt)
                                    : row.requestedAt
                                      ? formatDateTime(row.requestedAt)
                                      : "—"}
                                </td>
                                <td
                                  className="max-w-[160px] truncate px-3 py-3 text-[var(--muted)]"
                                  title={row.remarks || ""}
                                >
                                  {row.remarks || "—"}
                                </td>
                                <td className="px-3 py-3">
                                  <LeaveRequestRowActions
                                    requestId={String(id)}
                                    canEdit={false}
                                    canCancel={isPending}
                                    onView={() => setEncashDetail(row)}
                                    onCancel={() => onCancelEncash(id)}
                                  />
                                </td>
                              </tr>
                            );
                          })}
                        </tbody>
                      </table>
                    </div>
                  )}
                  <Pagination
                    page={encashPage}
                    totalPages={encashPages}
                    total={encashTotal}
                    limit={encashLimit}
                    loading={encashLoading}
                    onPage={setEncashPage}
                    onLimit={(n) => {
                      setEncashLimit(n);
                      setEncashPage(1);
                    }}
                  />
                </>
              )}
            </>
          )}
        </div>
      </Card>

      {/* Apply leave slide-over */}
      <SlideOver
        open={formOpen}
        onClose={() => {
          setFormOpen(false);
          setEditingRequestId("");
        }}
        title={editingRequestId ? "Edit leave request" : "Apply for leave"}
        subtitle={
          editingRequestId
            ? "Update details and resubmit for approval"
            : "Submit a new leave request for approval"
        }
        wide
      >
        <form onSubmit={onSubmitLeave} className="space-y-4 pb-8">
          <label className="block text-[12px] font-medium text-[var(--muted)]">
            Leave type
            <select
              className={fieldClass}
              value={form.leaveTypeId}
              onChange={(e) => setField("leaveTypeId", e.target.value)}
              required
            >
              <option value="">Select leave type</option>
              {balances.map((row) => (
                <option key={row.leaveTypeId} value={row.leaveTypeId}>
                  {row.leaveTypeName} · {num(row.remaining)} left
                </option>
              ))}
            </select>
          </label>

          {selectedBalance ? (
            <div className="flex items-center justify-between rounded-2xl border border-[var(--border)] bg-[var(--panel-soft)] px-3.5 py-3">
              <div className="flex items-center gap-2">
                <span
                  className="h-2.5 w-2.5 rounded-full"
                  style={{ background: selectedBalance.colorCode }}
                />
                <span className="text-[12px] text-[var(--muted)]">
                  Available balance
                </span>
              </div>
              <span className="text-[15px] font-bold tabular-nums text-[var(--violet)]">
                {num(selectedBalance.remaining)} days
              </span>
            </div>
          ) : null}

          <div className="grid grid-cols-2 gap-3">
            <label className="block text-[12px] font-medium text-[var(--muted)]">
              From
              <input
                type="date"
                className={fieldClass}
                value={form.fromDate}
                onChange={(e) => setField("fromDate", e.target.value)}
                required
              />
            </label>
            <label className="block text-[12px] font-medium text-[var(--muted)]">
              To
              <input
                type="date"
                className={fieldClass}
                value={form.toDate}
                onChange={(e) => setField("toDate", e.target.value)}
                required
              />
            </label>
          </div>

          {estimatedDays != null ? (
            <div className="flex items-center gap-2 rounded-xl bg-[var(--lavender-soft)] px-3 py-2.5 text-[12px] font-medium text-[var(--violet)]">
              <Clock3 className="h-4 w-4" />
              Estimated duration:{" "}
              <strong className="tabular-nums">{estimatedDays}</strong> day
              {estimatedDays === 1 ? "" : "s"}
              <span className="font-normal text-[var(--muted)]">
                (final days set by policy)
              </span>
            </div>
          ) : null}

          <div>
            <p className="text-[12px] font-medium text-[var(--muted)]">
              Half day (optional)
            </p>
            <div className="mt-1.5 grid grid-cols-2 gap-2">
              {[
                { key: "isFirstHalf", label: "First half" },
                { key: "isSecondHalf", label: "Second half" },
              ].map((opt) => {
                const active = form[opt.key];
                return (
                  <button
                    key={opt.key}
                    type="button"
                    onClick={() => {
                      setForm((prev) => ({
                        ...prev,
                        isFirstHalf: opt.key === "isFirstHalf" ? !prev.isFirstHalf : false,
                        isSecondHalf:
                          opt.key === "isSecondHalf" ? !prev.isSecondHalf : false,
                      }));
                    }}
                    className={`rounded-xl border px-3 py-2.5 text-[13px] font-semibold transition ${
                      active
                        ? "border-[var(--violet)] bg-[var(--lavender-soft)] text-[var(--violet)]"
                        : "border-[var(--border)] bg-[var(--surface)] text-[var(--muted)] hover:bg-[var(--panel-soft)]"
                    }`}
                  >
                    {opt.label}
                  </button>
                );
              })}
            </div>
          </div>

          <label className="block text-[12px] font-medium text-[var(--muted)]">
            Reason
            <textarea
              className={`${fieldClass} h-28 resize-none py-2.5`}
              value={form.reason}
              onChange={(e) => setField("reason", e.target.value)}
              placeholder="Brief reason for your leave…"
              required
            />
          </label>

          <label className="block text-[12px] font-medium text-[var(--muted)]">
            Attachment URL{" "}
            <span className="font-normal">(optional)</span>
            <input
              type="url"
              className={fieldClass}
              value={form.attachmentUrl}
              onChange={(e) => setField("attachmentUrl", e.target.value)}
              placeholder="https://…"
            />
          </label>

          <div className="sticky bottom-0 -mx-5 border-t border-[var(--border)] bg-[var(--surface)] px-5 pt-4">
            <div className="flex gap-2">
              <Button
                type="submit"
                className="h-11 flex-1 rounded-xl"
                disabled={saving}
              >
                <Send className="h-4 w-4" />
                {saving
                  ? editingRequestId
                    ? "Updating…"
                    : "Submitting…"
                  : editingRequestId
                    ? "Update request"
                    : "Submit request"}
              </Button>
              <Button
                type="button"
                variant="outline"
                className="h-11 rounded-xl"
                onClick={() => {
                  setFormOpen(false);
                  setEditingRequestId("");
                }}
              >
                Close
              </Button>
            </div>
          </div>
        </form>
      </SlideOver>

      {/* Balance detail */}
      <SlideOver
        open={Boolean(balanceDetail)}
        onClose={() => setBalanceDetail(null)}
        title={balanceDetail?.leaveTypeName || "Leave balance"}
        subtitle={`FY ${balanceDetail?.fiscalYear ?? fiscalYear}`}
      >
        {balanceDetail ? (
          <div className="space-y-4 pb-6">
            <div className="rounded-2xl border border-[var(--border)] bg-[var(--panel-soft)] p-4">
              <p className="text-[12px] text-[var(--muted)]">Available</p>
              <p
                className="mt-1 text-[28px] font-bold tabular-nums"
                style={{ color: balanceDetail.colorCode || "var(--violet)" }}
              >
                {num(balanceDetail.remaining)}
              </p>
            </div>
            <div className="grid grid-cols-2 gap-2">
              {[
                { label: "Allocated", value: balanceDetail.allocated },
                { label: "Carry forward", value: balanceDetail.carryForward },
                { label: "Used", value: balanceDetail.used },
                { label: "Pending", value: balanceDetail.pending },
              ].map((item) => (
                <div
                  key={item.label}
                  className="rounded-xl border border-[var(--border)] bg-[var(--surface)] px-3 py-3"
                >
                  <p className="text-[11px] text-[var(--muted)]">{item.label}</p>
                  <p className="mt-1 text-[16px] font-bold tabular-nums text-[var(--text)]">
                    {num(item.value)}
                  </p>
                </div>
              ))}
            </div>
            <Button
              type="button"
              className="h-11 w-full rounded-xl"
              onClick={() => {
                const typeId = balanceDetail.leaveTypeId;
                setBalanceDetail(null);
                openApply(typeId);
              }}
            >
              <Plus className="h-4 w-4" />
              Apply leave
            </Button>
          </div>
        ) : null}
      </SlideOver>

      {/* Request detail */}
      <SlideOver
        open={Boolean(detail)}
        onClose={() => setDetail(null)}
        title="Request details"
        subtitle={detail?.requestId ? `ID · ${detail.requestId.slice(0, 8)}…` : ""}
      >
        {detail ? (
          <div className="space-y-4 pb-6">
            <div className="rounded-2xl border border-[var(--border)] bg-[var(--panel-soft)] p-4">
              <div className="flex items-center justify-between gap-2">
                <p className="text-[15px] font-semibold text-[var(--text)]">
                  {detail.leaveTypeName ||
                    leaveTypeName(balances, detail.leaveTypeId)}
                </p>
                <StatusPill
                  status={detail.status}
                  label={detail.statusLabel || detail.status}
                />
              </div>
              <p className="mt-3 text-[22px] font-bold tabular-nums text-[var(--violet)]">
                {detail.totalDays ?? "—"}{" "}
                <span className="text-[13px] font-medium text-[var(--muted)]">
                  days
                </span>
              </p>
              <p className="mt-1 text-[13px] text-[var(--muted)]">
                {formatDate(detail.fromDate)}
                {detail.toDate ? ` → ${formatDate(detail.toDate)}` : ""}
              </p>
            </div>

            <dl className="space-y-3 text-[13px]">
              {[
                {
                  label: "Half day",
                  value: detail.isFirstHalf
                    ? "First half"
                    : detail.isSecondHalf
                      ? "Second half"
                      : "Full day(s)",
                },
                {
                  label: "Submitted",
                  value: detail.createdAt
                    ? formatDateTime(detail.createdAt)
                    : "—",
                },
                {
                  label: "Approved at",
                  value: detail.approvedAt
                    ? formatDateTime(detail.approvedAt)
                    : "—",
                },
                {
                  label: "Level",
                  value: detail.currentLevel ?? "—",
                },
              ].map((item) => (
                <div
                  key={item.label}
                  className="flex items-start justify-between gap-3 border-b border-[var(--border)] pb-2.5"
                >
                  <dt className="text-[var(--muted)]">{item.label}</dt>
                  <dd className="text-right font-medium text-[var(--text)]">
                    {item.value}
                  </dd>
                </div>
              ))}
            </dl>

            <div>
              <p className="text-[12px] font-medium text-[var(--muted)]">
                Reason
              </p>
              <p className="mt-1 rounded-xl bg-[var(--panel-soft)] px-3 py-2.5 text-[13px] leading-relaxed text-[var(--text)]">
                {detail.reason || "—"}
              </p>
            </div>

            {detail.rejectionReason ? (
              <div>
                <p className="text-[12px] font-medium text-[var(--danger)]">
                  Rejection reason
                </p>
                <p className="mt-1 rounded-xl bg-[var(--danger-soft)] px-3 py-2.5 text-[13px] text-[var(--danger)]">
                  {detail.rejectionReason}
                </p>
              </div>
            ) : null}

            {String(detail.status || "").toLowerCase() === "pending" ? (
              <Button
                type="button"
                variant="outline"
                className="h-11 w-full rounded-xl border-[var(--danger)]/30 text-[var(--danger)] hover:bg-[var(--danger-soft)]"
                disabled={cancellingId === detail.requestId}
                onClick={() => onCancelLeave(detail.requestId)}
              >
                <X className="h-4 w-4" />
                Cancel request
              </Button>
            ) : null}
          </div>
        ) : null}
      </SlideOver>

      {/* Encashment detail */}
      <SlideOver
        open={Boolean(encashDetail)}
        onClose={() => setEncashDetail(null)}
        title="Encashment details"
        subtitle={
          encashDetail
            ? `ID · ${String(
                encashDetail.encashmentId ||
                  encashDetail.requestId ||
                  encashDetail.id ||
                  ""
              ).slice(0, 8)}…`
            : ""
        }
      >
        {encashDetail ? (
          <div className="space-y-4 pb-6">
            <div className="rounded-2xl border border-[var(--border)] bg-[var(--panel-soft)] p-4">
              <div className="flex items-center justify-between gap-2">
                <p className="text-[15px] font-semibold text-[var(--text)]">
                  {encashDetail.leaveTypeName ||
                    leaveTypeName(balances, encashDetail.leaveTypeId)}
                </p>
                <StatusPill
                  status={encashDetail.status}
                  label={encashDetail.statusLabel || encashDetail.status}
                />
              </div>
              <p className="mt-3 text-[22px] font-bold tabular-nums text-[var(--violet)]">
                {encashDetail.daysToEncash ?? encashDetail.days ?? "—"}{" "}
                <span className="text-[13px] font-medium text-[var(--muted)]">
                  days
                </span>
              </p>
            </div>
            <dl className="space-y-3 text-[13px]">
              {[
                {
                  label: "Fiscal year",
                  value: encashDetail.fiscalYear ?? "—",
                },
                {
                  label: "Amount",
                  value:
                    encashDetail.amount ??
                    encashDetail.encashmentAmount ??
                    encashDetail.totalAmount ??
                    encashDetail.payableAmount ??
                    "—",
                },
                {
                  label: "Submitted",
                  value: encashDetail.createdAt
                    ? formatDateTime(encashDetail.createdAt)
                    : encashDetail.requestedAt
                      ? formatDateTime(encashDetail.requestedAt)
                      : "—",
                },
                {
                  label: "Approved at",
                  value: encashDetail.approvedAt
                    ? formatDateTime(encashDetail.approvedAt)
                    : "—",
                },
              ].map((item) => (
                <div
                  key={item.label}
                  className="flex items-start justify-between gap-3 border-b border-[var(--border)] pb-2.5"
                >
                  <dt className="text-[var(--muted)]">{item.label}</dt>
                  <dd className="text-right font-medium text-[var(--text)]">
                    {item.value}
                  </dd>
                </div>
              ))}
            </dl>
            <div>
              <p className="text-[12px] font-medium text-[var(--muted)]">
                Remarks
              </p>
              <p className="mt-1 rounded-xl bg-[var(--panel-soft)] px-3 py-2.5 text-[13px] leading-relaxed text-[var(--text)]">
                {encashDetail.remarks || "—"}
              </p>
            </div>
            {String(encashDetail.status || "").toLowerCase() === "pending" ? (
              <Button
                type="button"
                variant="outline"
                className="h-11 w-full rounded-xl border-[var(--danger)]/30 text-[var(--danger)] hover:bg-[var(--danger-soft)]"
                disabled={
                  encashCancellingId ===
                  (encashDetail.encashmentId ||
                    encashDetail.requestId ||
                    encashDetail.id)
                }
                onClick={() =>
                  onCancelEncash(
                    encashDetail.encashmentId ||
                      encashDetail.requestId ||
                      encashDetail.id
                  )
                }
              >
                <X className="h-4 w-4" />
                Cancel encashment
              </Button>
            ) : null}
          </div>
        ) : null}
      </SlideOver>

      {/* Encashment slide-over */}
      <SlideOver
        open={encashOpen}
        onClose={() => setEncashOpen(false)}
        title="Apply encashment"
        subtitle="Convert unused leave days to salary"
      >
        <form onSubmit={onSubmitEncash} className="space-y-4 pb-8">
          <label className="block text-[12px] font-medium text-[var(--muted)]">
            Leave type
            <select
              className={fieldClass}
              value={encashForm.leaveTypeId}
              onChange={(e) => setEncashField("leaveTypeId", e.target.value)}
              required
            >
              <option value="">Select</option>
              {balances.map((row) => (
                <option key={row.leaveTypeId} value={row.leaveTypeId}>
                  {row.leaveTypeName} · {num(row.remaining)} left
                </option>
              ))}
            </select>
          </label>
          <label className="block text-[12px] font-medium text-[var(--muted)]">
            Days to encash
            <input
              type="number"
              min="0.5"
              step="0.5"
              className={fieldClass}
              value={encashForm.daysToEncash}
              onChange={(e) => setEncashField("daysToEncash", e.target.value)}
              required
            />
          </label>
          <label className="block text-[12px] font-medium text-[var(--muted)]">
            Fiscal year
            <select
              className={fieldClass}
              value={encashForm.fiscalYear}
              onChange={(e) => setEncashField("fiscalYear", e.target.value)}
            >
              {yearOptions.map((y) => (
                <option key={y} value={y}>
                  {y}
                </option>
              ))}
            </select>
          </label>
          <label className="block text-[12px] font-medium text-[var(--muted)]">
            Remarks <span className="font-normal">(optional)</span>
            <input
              className={fieldClass}
              value={encashForm.remarks}
              onChange={(e) => setEncashField("remarks", e.target.value)}
            />
          </label>
          <Button
            type="submit"
            className="h-11 w-full rounded-xl"
            disabled={encashSaving}
          >
            {encashSaving ? "Submitting…" : "Submit encashment"}
          </Button>
        </form>
      </SlideOver>
    </div>
  );
}
