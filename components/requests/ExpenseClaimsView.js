"use client";

import {
  Banknote,
  CalendarDays,
  CheckCircle2,
  Download,
  ExternalLink,
  Eye,
  FileText,
  Inbox,
  MoreVertical,
  Plus,
  Receipt,
  RefreshCw,
  Send,
  Trash2,
  Wallet,
  X,
  XCircle,
} from "lucide-react";
import { useEffect, useMemo, useRef, useState } from "react";
import { createPortal } from "react-dom";
import { Button } from "@/components/ui/Button";
import { FlashBanner } from "@/components/ui/FlashBanner";
import { FilterDrawerDateRange } from "@/components/ui/FilterDrawerDateRange";
import { MuiDateField } from "@/components/ui/MuiDateField";
import { CollapsibleSection } from "@/components/ui/CollapsibleSection";
import { SoftStat, SUMMARY_GRID_CLASS } from "@/components/ui/SoftStat";
import { PortalPage } from "@/components/ui/PortalPage";
import { SlideOver } from "@/components/ui/SlideOver";
import { TablePanel } from "@/components/ui/TablePanel";
import {
  cancelClaim,
  createClaim,
  submitClaim,
  useExpenseCategories,
  useExpenseClaimsList,
} from "@/hooks/useExpenseClaims";
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
import { resolveMediaUrl } from "@/lib/media";
import { useModules } from "@/components/modules/ModulesProvider";
import { ComingSoon } from "@/components/ui/ComingSoon";
import { PageLoader } from "@/components/ui/Spinner";

const fieldClass =
  "mt-1.5 h-11 w-full rounded-xl border border-[var(--border)] bg-[var(--surface)] px-3 text-[13px] text-[var(--text)] outline-none transition focus:border-[var(--violet)] focus:ring-2 focus:ring-[var(--lavender-soft)]";

function todayKey() {
  const today = new Date();
  const y = today.getFullYear();
  const m = String(today.getMonth() + 1).padStart(2, "0");
  const d = String(today.getDate()).padStart(2, "0");
  return `${y}-${m}-${d}`;
}

function emptyItem() {
  return {
    categoryId: "",
    description: "",
    amount: "",
    expenseDate: todayKey(),
    receiptUrl: "",
    receipt: null,
  };
}

function emptyForm() {
  return {
    reason: "",
    items: [emptyItem()],
  };
}

function normalizeStatusLabel(status, statusLabel) {
  const s = String(status || "").toLowerCase();
  if (s === "rejected" || s === "cancelled" || s === "canceled") {
    return statusLabel || "Cancelled";
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
  if (s === "draft") {
    return "border-[var(--border)] bg-[var(--panel-soft)] text-[var(--muted)]";
  }
  if (s === "pending" || s === "submitted") {
    return "border-[var(--violet)]/20 bg-[var(--lavender-soft)] text-[var(--violet)]";
  }
  return "border-[var(--border)] bg-[var(--panel-soft)] text-[var(--muted)]";
}

function prettyLabel(value) {
  if (value == null || value === "") return "—";
  return String(value).replace(/_/g, " ");
}

function receiptFileName(url, fallback = "receipt") {
  if (!url) return fallback;
  try {
    const path = String(url).split("?")[0];
    const name = path.split("/").pop();
    return name || fallback;
  } catch {
    return fallback;
  }
}

async function triggerBrowserDownload(url, fileName) {
  const resolved = resolveMediaUrl(url) || url;
  if (!resolved) return;
  try {
    const res = await fetch(resolved);
    const blob = await res.blob();
    const objectUrl = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = objectUrl;
    a.download = fileName || "receipt";
    document.body.appendChild(a);
    a.click();
    a.remove();
    URL.revokeObjectURL(objectUrl);
  } catch {
    window.open(resolved, "_blank", "noopener,noreferrer");
  }
}

function RequestRowActions({
  requestId,
  canSubmit,
  canCancel,
  busy,
  onView,
  onSubmit,
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
      setCoords({ top: rect.bottom + 6, left });
    }

    placeMenu();

    function onDocClick(event) {
      if (
        buttonRef.current?.contains(event.target) ||
        event.target.closest?.(`[data-expense-menu="${requestId}"]`)
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
        disabled={busy}
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
              data-expense-menu={requestId}
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
              {canSubmit ? (
                <button
                  type="button"
                  className="flex w-full items-center gap-2 px-3 py-2.5 text-left text-[13px] font-semibold text-[var(--success)] hover:bg-[var(--success-soft)]"
                  onClick={() => {
                    setOpen(false);
                    onSubmit?.();
                  }}
                >
                  <Send className="h-4 w-4" />
                  Submit
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
                  <XCircle className="h-4 w-4" />
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
  const isDraft = statusLower === "draft";

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
          {isDraft ? "Draft" : `${total} level${total === 1 ? "" : "s"}`}
        </span>
      </div>
      {isDraft ? (
        <p className="text-[13px] text-[var(--muted)]">
          Submit this claim to start the approval workflow.
        </p>
      ) : (
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
      )}
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
        {children ?? "—"}
      </dd>
    </div>
  );
}

function ClaimItems({ items, currency, dateFormat }) {
  if (!items?.length) {
    return <p className="text-[13px] text-[var(--muted)]">No line items.</p>;
  }

  return (
    <div className="space-y-2.5">
      {items.map((item, index) => {
        const url = resolveMediaUrl(item.receiptUrl || item.fileUrl || null);
        const name =
          item.fileName ||
          item.receiptName ||
          receiptFileName(url, `receipt-${index + 1}`);

        return (
          <div
            key={item.itemId || `${item.categoryId}-${index}`}
            className="rounded-xl border border-[var(--border)] bg-[var(--panel-soft)] px-3.5 py-3"
          >
            <div className="flex flex-wrap items-start justify-between gap-2">
              <div className="min-w-0">
                <p className="text-[13px] font-semibold text-[var(--text)]">
                  {item.categoryName || item.category?.name || `Item ${index + 1}`}
                </p>
                <p className="mt-0.5 text-[12px] text-[var(--muted)]">
                  {item.description || "No description"}
                </p>
              </div>
              <p className="text-[13px] font-bold tabular-nums text-[var(--text)]">
                {item.amount != null
                  ? formatCurrency(item.amount, currency)
                  : "—"}
              </p>
            </div>

            <div className="mt-2 flex flex-wrap items-center gap-x-3 gap-y-2 text-[11px] text-[var(--muted)]">
              <span className="inline-flex items-center gap-1">
                <CalendarDays className="h-3.5 w-3.5" />
                {item.expenseDate
                  ? formatDate(item.expenseDate, dateFormat)
                  : "—"}
              </span>
            </div>

            {url ? (
              <div className="mt-3 flex flex-wrap gap-2">
                <Button
                  type="button"
                  variant="outline"
                  className="h-8 rounded-lg px-2.5 text-[12px]"
                  onClick={() =>
                    window.open(url, "_blank", "noopener,noreferrer")
                  }
                >
                  <ExternalLink className="h-3.5 w-3.5" />
                  Open receipt
                </Button>
                <Button
                  type="button"
                  variant="outline"
                  className="h-8 rounded-lg px-2.5 text-[12px]"
                  onClick={() => triggerBrowserDownload(url, name)}
                >
                  <Download className="h-3.5 w-3.5" />
                  Download
                </Button>
                <span className="inline-flex max-w-full items-center gap-1 truncate text-[11px] text-[var(--muted)]">
                  <FileText className="h-3.5 w-3.5 shrink-0" />
                  <span className="truncate">{name}</span>
                </span>
              </div>
            ) : (
              <p className="mt-2 text-[11px] text-[var(--muted)]">
                No receipt attached
              </p>
            )}
          </div>
        );
      })}
    </div>
  );
}

export function ExpenseClaimsView({
  dateFormat = "DD/MM/YYYY",
  timeFormat = "12h",
  currency = "PKR",
}) {
  const { canShowRequestTile, loading: modulesLoading } = useModules();
  const moduleEnabled = canShowRequestTile("expenseClaims");

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
  const [form, setForm] = useState(emptyForm);
  const [selected, setSelected] = useState(null);
  const [submitting, setSubmitting] = useState(false);
  const [submitMode, setSubmitMode] = useState("submit");
  const [busyId, setBusyId] = useState(null);
  const [formError, setFormError] = useState("");
  const [flash, setFlash] = useState("");
  const [flashTone, setFlashTone] = useState("success");

  const listStatus = status === "draft" ? "all" : status;

  const { rows, meta, stats, loading, error, refetch } = useExpenseClaimsList({
    status: listStatus,
    page,
    limit,
    enabled: moduleEnabled && !modulesLoading,
  });
  const { categories, loading: categoriesLoading } = useExpenseCategories({
    enabled: moduleEnabled && !modulesLoading && showForm,
  });

  const dateFilterCount = countActiveDateFilters(dateFrom, dateTo);

  const filteredRows = useMemo(() => {
    const q = listQuery.trim().toLowerCase();
    return rows.filter((row) => {
      if (
        !rowMatchesDateRange(row, dateFrom, dateTo, [
          "submittedAt",
          "createdAt",
          "approvedAt",
        ])
      ) {
        return false;
      }
      if (!q) return true;
      const hay = [
        row.claimNumber,
        row.reason,
        row.status,
        row.statusLabel,
        ...(row.items || []).map((i) => i.categoryName || i.description),
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

  const categoryOptions = categories;

  useEffect(() => {
    if (!showForm || !categoryOptions.length) return;
    setForm((prev) => {
      const nextItems = prev.items.map((item) =>
        item.categoryId
          ? item
          : { ...item, categoryId: categoryOptions[0].categoryId }
      );
      return { ...prev, items: nextItems };
    });
  }, [showForm, categoryOptions]);

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
        id: "claim",
        header: "Claim #",
        cellClassName: "whitespace-nowrap font-semibold text-[var(--text)]",
        cell: (row) => row.claimNumber || "—",
      },
      {
        id: "amount",
        header: "Amount",
        cellClassName: "whitespace-nowrap font-semibold tabular-nums",
        cell: (row) =>
          row.totalAmount != null
            ? formatCurrency(row.totalAmount, currency)
            : "—",
      },
      {
        id: "items",
        header: "Items",
        cellClassName: "tabular-nums text-[var(--muted)]",
        cell: (row) => row.itemCount ?? row.items?.length ?? 0,
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
        cell: (row) => (
          <span
            className={`inline-flex rounded-full border px-2.5 py-0.5 text-[11px] font-semibold capitalize ${statusTone(row.status)}`}
          >
            {normalizeStatusLabel(row.status, row.statusLabel)}
          </span>
        ),
      },
      {
        id: "submitted",
        header: "Submitted",
        cellClassName: "whitespace-nowrap text-[var(--muted)]",
        cell: (row) =>
          row.submittedAt
            ? formatDateTime(row.submittedAt, dateFormat, timeFormat)
            : row.createdAt
              ? formatDateTime(row.createdAt, dateFormat, timeFormat)
              : "—",
      },
      {
        id: "action",
        header: "Action",
        headerClassName: "w-14",
        cell: (row) => (
          <RequestRowActions
            requestId={row.expenseClaimId}
            canSubmit={Boolean(row.canSubmit)}
            canCancel={Boolean(row.canCancel)}
            busy={busyId === row.expenseClaimId}
            onView={() => setSelected(row)}
            onSubmit={() => handleSubmitDraft(row)}
            onCancel={() => handleCancel(row)}
          />
        ),
      },
    ],
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [currentPage, limit, dateFormat, timeFormat, currency, busyId]
  );

  function refreshAll() {
    refetch();
  }

  function updateItem(index, patch) {
    setForm((prev) => ({
      ...prev,
      items: prev.items.map((item, i) =>
        i === index ? { ...item, ...patch } : item
      ),
    }));
  }

  function addItem() {
    setForm((prev) => ({
      ...prev,
      items: [
        ...prev.items,
        {
          ...emptyItem(),
          categoryId: categoryOptions[0]?.categoryId || "",
        },
      ],
    }));
  }

  function removeItem(index) {
    setForm((prev) => {
      if (prev.items.length <= 1) return prev;
      return {
        ...prev,
        items: prev.items.filter((_, i) => i !== index),
      };
    });
  }

  async function handleCreate(e) {
    e.preventDefault();
    setFormError("");

    if (!moduleEnabled) {
      setFormError("This request module is not enabled for your company.");
      return;
    }

    for (let i = 0; i < form.items.length; i += 1) {
      const item = form.items[i];
      if (!item.categoryId) {
        setFormError(`Item ${i + 1}: select a category.`);
        return;
      }
      if (!item.amount || Number(item.amount) <= 0) {
        setFormError(`Item ${i + 1}: enter a valid amount.`);
        return;
      }
      if (!item.expenseDate) {
        setFormError(`Item ${i + 1}: expense date is required.`);
        return;
      }
    }

    setSubmitting(true);
    try {
      const payload = {
        reason: form.reason.trim() || undefined,
        items: form.items.map((item) => ({
          categoryId: item.categoryId,
          description: item.description.trim() || undefined,
          amount: Number(item.amount),
          expenseDate: item.expenseDate,
          receiptUrl: item.receiptUrl.trim() || undefined,
          receipt: item.receipt || undefined,
        })),
      };

      const created = await createClaim(payload);
      const claimId = created?.data?.expenseClaimId;

      if (submitMode === "submit" && claimId) {
        await submitClaim(claimId);
        setFlashTone("success");
        setFlash(created?.message || "Expense claim submitted.");
      } else {
        setFlashTone("success");
        setFlash(created?.message || "Expense claim saved as draft.");
      }

      setShowForm(false);
      setForm(emptyForm());
      setPage(1);
      refreshAll();
    } catch (err) {
      setFormError(getApiErrorMessage(err, "Failed to create expense claim."));
    } finally {
      setSubmitting(false);
    }
  }

  async function handleSubmitDraft(row) {
    if (!row?.expenseClaimId) return;
    if (!window.confirm(`Submit claim ${row.claimNumber || ""} for approval?`)) {
      return;
    }
    setBusyId(row.expenseClaimId);
    try {
      const res = await submitClaim(row.expenseClaimId);
      setFlashTone("success");
      setFlash(res?.message || "Expense claim submitted.");
      if (selected?.expenseClaimId === row.expenseClaimId) setSelected(null);
      refreshAll();
    } catch (err) {
      setFlashTone("danger");
      setFlash(getApiErrorMessage(err, "Failed to submit expense claim."));
    } finally {
      setBusyId(null);
    }
  }

  async function handleCancel(row) {
    if (!row?.expenseClaimId) return;
    if (
      !window.confirm(
        `Cancel claim ${row.claimNumber || ""}? This cannot be undone.`
      )
    ) {
      return;
    }
    setBusyId(row.expenseClaimId);
    try {
      const res = await cancelClaim(row.expenseClaimId);
      setFlashTone("success");
      setFlash(res?.message || "Expense claim cancelled.");
      if (selected?.expenseClaimId === row.expenseClaimId) setSelected(null);
      refreshAll();
    } catch (err) {
      setFlashTone("danger");
      setFlash(getApiErrorMessage(err, "Failed to cancel expense claim."));
    } finally {
      setBusyId(null);
    }
  }

  if (modulesLoading) {
    return (
      <PageLoader label="Loading" hint="Checking expense claims access…" />
    );
  }

  if (!moduleEnabled) {
    return (
      <ComingSoon
        title="Expense Claims"
        description="This request module is not enabled for your company."
      />
    );
  }

  return (
    <PortalPage
      fill
      title="Expense Claims"
      subtitle="Submit expense claims with line items and track reimbursement approval."
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
              setSubmitMode("submit");
            }}
          >
            <Plus className="h-4 w-4" />
            New claim
          </Button>
        </>
      }
    >
      <CollapsibleSection title="Summary">
        <div className={SUMMARY_GRID_CLASS}>
          <SoftStat label="Total" value={stats.total} />
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
        title="Claim logs"
        titleCount={total}
        titleCountLabel="Total claims"
        tabs={[
          { value: "all", label: "All" },
          { value: "pending", label: "Pending" },
          { value: "approved", label: "Approved" },
          { value: "cancelled", label: "Cancelled" },
        ]}
        tab={status === "draft" ? "all" : status}
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
        searchPlaceholder="Search by claim #, reason…"
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
            hint="Filter by submitted / created date."
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
        getRowKey={(row) => row.expenseClaimId}
        minWidth="980px"
        loading={loading}
        loadingLabel="Loading claims"
        loadingHint="Fetching expense claims…"
        error={error}
        emptyIcon={Inbox}
        emptyTitle={`No ${status === "all" ? "" : `${status} `}claims`}
        emptyHint="Create a claim when you need reimbursement."
        emptyAction={
          <Button
            type="button"
            className="h-10 rounded-xl"
            onClick={() => setShowForm(true)}
          >
            <Plus className="h-4 w-4" />
            New claim
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
          setForm(emptyForm());
        }}
        title="New expense claim"
        subtitle="Add one or more line items, then save draft or submit"
        wide
      >
        <form className="flex min-h-full flex-col pb-6" onSubmit={handleCreate}>
          <div className="flex-1 space-y-5">
            <div className="flex items-center gap-3">
              <span className="inline-flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-[var(--lavender-soft)] text-[var(--violet)]">
                <Receipt className="h-4 w-4" />
              </span>
              <div className="min-w-0">
                <h3 className="text-[15px] font-semibold text-[var(--text)]">
                  Claim details
                </h3>
                <p className="mt-0.5 text-[12px] text-[var(--muted)]">
                  Categories load from company expense settings
                </p>
              </div>
            </div>

            <div>
              <label className="block text-[12px] font-semibold text-[var(--text)]">
                Reason
              </label>
              <input
                type="text"
                className={fieldClass}
                placeholder="Optional overall reason"
                value={form.reason}
                onChange={(e) =>
                  setForm((prev) => ({ ...prev, reason: e.target.value }))
                }
              />
            </div>

            <div className="space-y-3">
              <div className="flex items-center justify-between gap-2">
                <h4 className="text-[13px] font-semibold text-[var(--text)]">
                  Line items
                </h4>
                <Button
                  type="button"
                  variant="outline"
                  className="h-8 rounded-lg px-2.5 text-[12px]"
                  onClick={addItem}
                >
                  <Plus className="h-3.5 w-3.5" />
                  Add item
                </Button>
              </div>

              {!categoriesLoading && categoryOptions.length === 0 ? (
                <p className="rounded-xl border border-[var(--warning)]/30 bg-[var(--warning-soft)] px-3 py-2 text-[12px] font-medium text-[var(--warning)]">
                  No expense categories available. Ask HR to configure them first.
                </p>
              ) : null}

              {form.items.map((item, index) => (
                <div
                  key={`item-${index}`}
                  className="rounded-2xl border border-[var(--border)] bg-[var(--panel-soft)] p-3.5"
                >
                  <div className="mb-3 flex items-center justify-between gap-2">
                    <p className="text-[12px] font-semibold text-[var(--muted)]">
                      Item {index + 1}
                    </p>
                    {form.items.length > 1 ? (
                      <button
                        type="button"
                        className="inline-flex h-7 items-center gap-1 rounded-lg px-2 text-[11px] font-semibold text-[var(--danger)] hover:bg-[var(--danger-soft)]"
                        onClick={() => removeItem(index)}
                      >
                        <Trash2 className="h-3.5 w-3.5" />
                        Remove
                      </button>
                    ) : null}
                  </div>

                  <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
                    <div className="min-w-0 sm:col-span-2">
                      <label className="block text-[12px] font-semibold text-[var(--text)]">
                        Category <span className="text-[var(--danger)]">*</span>
                      </label>
                      <select
                        required
                        className={fieldClass}
                        value={item.categoryId}
                        disabled={categoriesLoading && !categoryOptions.length}
                        onChange={(e) =>
                          updateItem(index, { categoryId: e.target.value })
                        }
                      >
                        <option value="">
                          {categoriesLoading
                            ? "Loading categories…"
                            : "Select category"}
                        </option>
                        {categoryOptions.map((cat) => (
                          <option key={cat.categoryId} value={cat.categoryId}>
                            {cat.name}
                          </option>
                        ))}
                      </select>
                    </div>

                    <div className="min-w-0">
                      <label className="block text-[12px] font-semibold text-[var(--text)]">
                        Amount <span className="text-[var(--danger)]">*</span>
                      </label>
                      <input
                        type="number"
                        min="0"
                        step="0.01"
                        required
                        className={fieldClass}
                        value={item.amount}
                        onChange={(e) =>
                          updateItem(index, { amount: e.target.value })
                        }
                      />
                    </div>

                    <div className="min-w-0">
                      <MuiDateField
                        label="Expense date"
                        required
                        dateFormat={dateFormat}
                        value={item.expenseDate}
                        onChange={(next) =>
                          updateItem(index, { expenseDate: next })
                        }
                      />
                    </div>

                    <div className="min-w-0 sm:col-span-2">
                      <label className="block text-[12px] font-semibold text-[var(--text)]">
                        Description
                      </label>
                      <input
                        type="text"
                        className={fieldClass}
                        placeholder="Optional"
                        value={item.description}
                        onChange={(e) =>
                          updateItem(index, { description: e.target.value })
                        }
                      />
                    </div>

                    <div className="min-w-0 sm:col-span-2">
                      <label className="block text-[12px] font-semibold text-[var(--text)]">
                        Receipt URL
                      </label>
                      <input
                        type="url"
                        className={fieldClass}
                        placeholder="Optional https://…"
                        value={item.receiptUrl}
                        onChange={(e) =>
                          updateItem(index, {
                            receiptUrl: e.target.value,
                            receipt: null,
                          })
                        }
                      />
                      <input
                        type="file"
                        accept="image/*,.pdf"
                        className="mt-2 block w-full text-[12px] text-[var(--muted)] file:mr-3 file:rounded-lg file:border-0 file:bg-[var(--lavender-soft)] file:px-3 file:py-1.5 file:text-[12px] file:font-semibold file:text-[var(--violet)]"
                        onChange={(e) => {
                          const file = e.target.files?.[0] || null;
                          updateItem(index, {
                            receipt: file,
                            receiptUrl: file ? "" : item.receiptUrl,
                          });
                        }}
                      />
                      {item.receipt ? (
                        <div className="mt-2 flex items-center gap-2 rounded-xl border border-[var(--border)] bg-[var(--surface)] px-3 py-2">
                          <p className="min-w-0 flex-1 truncate text-[12px] font-medium text-[var(--text)]">
                            {item.receipt.name}
                          </p>
                          <button
                            type="button"
                            className="inline-flex h-7 items-center gap-1 rounded-lg border border-[var(--border)] px-2 text-[11px] font-semibold text-[var(--danger)]"
                            onClick={() =>
                              updateItem(index, { receipt: null })
                            }
                          >
                            <X className="h-3.5 w-3.5" />
                            Remove
                          </button>
                        </div>
                      ) : null}
                    </div>
                  </div>
                </div>
              ))}
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
            <div className="flex flex-wrap items-center justify-end gap-2">
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
                Cancel
              </Button>
              <Button
                type="submit"
                variant="outline"
                className="h-11 rounded-xl"
                disabled={submitting}
                onClick={() => setSubmitMode("draft")}
              >
                {submitting && submitMode === "draft"
                  ? "Saving…"
                  : "Save draft"}
              </Button>
              <Button
                type="submit"
                className="h-11 min-w-[140px] rounded-xl"
                disabled={submitting}
                onClick={() => setSubmitMode("submit")}
              >
                <Send className="h-4 w-4" />
                {submitting && submitMode === "submit"
                  ? "Submitting…"
                  : "Submit claim"}
              </Button>
            </div>
          </div>
        </form>
      </SlideOver>

      <SlideOver
        open={Boolean(selected)}
        onClose={() => setSelected(null)}
        title="Claim details"
        subtitle={
          selected
            ? selected.claimNumber ||
              formatCurrency(selected.totalAmount, currency)
            : undefined
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
              <div className="flex flex-wrap gap-2">
                {selected.canSubmit ? (
                  <Button
                    type="button"
                    className="h-9 rounded-xl"
                    disabled={busyId === selected.expenseClaimId}
                    onClick={() => handleSubmitDraft(selected)}
                  >
                    <Send className="h-4 w-4" />
                    {busyId === selected.expenseClaimId
                      ? "Submitting…"
                      : "Submit"}
                  </Button>
                ) : null}
                {selected.canCancel ? (
                  <Button
                    type="button"
                    variant="outline"
                    className="h-9 rounded-xl text-[var(--danger)]"
                    disabled={busyId === selected.expenseClaimId}
                    onClick={() => handleCancel(selected)}
                  >
                    <XCircle className="h-4 w-4" />
                    {busyId === selected.expenseClaimId
                      ? "Cancelling…"
                      : "Cancel claim"}
                  </Button>
                ) : null}
              </div>
            </div>

            <section className="rounded-2xl border border-[var(--border)] bg-[var(--surface)] p-5 shadow-[var(--card-shadow)]">
              <div className="mb-4 border-b border-[var(--border)] pb-3">
                <p className="text-[11px] font-semibold uppercase tracking-wide text-[var(--muted)]">
                  Overview
                </p>
                <h3 className="mt-0.5 text-[15px] font-semibold text-[var(--text)]">
                  Claim details
                </h3>
              </div>

              <dl className="grid grid-cols-1 gap-x-6 gap-y-5 sm:grid-cols-2">
                <DetailField icon={Receipt} label="Claim number">
                  {selected.claimNumber || "—"}
                </DetailField>
                <DetailField icon={Wallet} label="Total amount">
                  {selected.totalAmount != null
                    ? formatCurrency(selected.totalAmount, currency)
                    : "—"}
                </DetailField>
                <DetailField icon={Banknote} label="Approved amount">
                  {selected.approvedAmount != null
                    ? formatCurrency(selected.approvedAmount, currency)
                    : "—"}
                </DetailField>
                <DetailField label="Total paid">
                  {selected.totalPaid != null
                    ? formatCurrency(selected.totalPaid, currency)
                    : "—"}
                </DetailField>
                <DetailField label="Remaining">
                  {selected.remainingAmount != null
                    ? formatCurrency(selected.remainingAmount, currency)
                    : "—"}
                </DetailField>
                <DetailField label="Items">
                  {selected.itemCount ?? selected.items?.length ?? 0}
                </DetailField>
                {selected.reimbursementMode ? (
                  <DetailField label="Reimbursement mode">
                    {prettyLabel(selected.reimbursementMode)}
                  </DetailField>
                ) : null}
                {selected.reimbursementStatus ||
                selected.reimbursementStatusLabel ? (
                  <DetailField label="Reimbursement status">
                    {prettyLabel(
                      selected.reimbursementStatusLabel ||
                        selected.reimbursementStatus
                    )}
                  </DetailField>
                ) : null}
                <DetailField label="Taxable">
                  {selected.isTaxable ? "Yes" : "No"}
                </DetailField>
                <DetailField icon={CalendarDays} label="Submitted">
                  {selected.submittedAt
                    ? formatDateTime(
                        selected.submittedAt,
                        dateFormat,
                        timeFormat
                      )
                    : "—"}
                </DetailField>
                {selected.approvedAt ? (
                  <DetailField label="Approved at">
                    {formatDateTime(
                      selected.approvedAt,
                      dateFormat,
                      timeFormat
                    )}
                  </DetailField>
                ) : null}
                {selected.paidAt ? (
                  <DetailField label="Paid at">
                    {formatDateTime(selected.paidAt, dateFormat, timeFormat)}
                  </DetailField>
                ) : null}
                <DetailField label="Created">
                  {selected.createdAt
                    ? formatDateTime(
                        selected.createdAt,
                        dateFormat,
                        timeFormat
                      )
                    : "—"}
                </DetailField>
                {selected.reason ? (
                  <DetailField label="Reason" className="sm:col-span-2">
                    <p className="whitespace-pre-wrap font-normal leading-relaxed text-[var(--text)]">
                      {selected.reason}
                    </p>
                  </DetailField>
                ) : null}
                {selected.remarks || selected.rejectionReason ? (
                  <DetailField
                    label={
                      selected.rejectionReason ? "Rejection reason" : "Remarks"
                    }
                    className="sm:col-span-2"
                  >
                    <p className="whitespace-pre-wrap font-normal leading-relaxed text-[var(--text)]">
                      {selected.rejectionReason || selected.remarks}
                    </p>
                  </DetailField>
                ) : null}
              </dl>
            </section>

            <section className="rounded-2xl border border-[var(--border)] bg-[var(--surface)] p-5 shadow-[var(--card-shadow)]">
              <div className="mb-4 border-b border-[var(--border)] pb-3">
                <p className="text-[11px] font-semibold uppercase tracking-wide text-[var(--muted)]">
                  Line items
                </p>
                <h3 className="mt-0.5 text-[15px] font-semibold text-[var(--text)]">
                  Expenses & receipts
                </h3>
              </div>
              <ClaimItems
                items={selected.items}
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
