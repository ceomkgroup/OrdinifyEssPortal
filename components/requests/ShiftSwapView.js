"use client";

import {
  ArrowLeftRight,
  Check,
  CheckCircle2,
  Eye,
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
import { useAuth } from "@/components/auth/AuthProvider";
import { Button } from "@/components/ui/Button";
import { FlashBanner } from "@/components/ui/FlashBanner";
import { FilterDrawerDateRange } from "@/components/ui/FilterDrawerDateRange";
import { MuiDateRangeFields } from "@/components/ui/MuiDateField";
import { CollapsibleSection } from "@/components/ui/CollapsibleSection";
import { SoftStat, SUMMARY_GRID_CLASS } from "@/components/ui/SoftStat";
import { PortalPage } from "@/components/ui/PortalPage";
import { SlideOver } from "@/components/ui/SlideOver";
import { TablePanel } from "@/components/ui/TablePanel";
import {
  cancelShiftSwap,
  decideShiftSwap,
  submitShiftSwap,
  useShiftSwapList,
  useSwapPeers,
} from "@/hooks/useShiftSwap";
import { useMyShift } from "@/hooks/useMyShift";
import {
  countActiveDateFilters,
  rowMatchesDateRange,
} from "@/lib/request-date-filter";
import { useRequestListQuery } from "@/hooks/useRequestListQuery";
import { formatDate, formatDateTime, formatTime, rowSerial } from "@/lib/format";

const fieldClass =
  "mt-1.5 h-11 w-full rounded-xl border border-[var(--border)] bg-[var(--surface)] px-3 text-[13px] text-[var(--text)] outline-none transition focus:border-[var(--violet)] focus:ring-2 focus:ring-[var(--lavender-soft)]";

const OPEN_STATUSES = new Set([
  "pending",
  "pending_peer",
  "pending_approval",
  "submitted",
  "in_progress",
]);

function emptyForm() {
  return {
    peerEmployeeId: "",
    fromDate: "",
    toDate: "",
    reason: "",
  };
}

function formatSwapPeriod(fromDate, toDate, dateFormat) {
  const start = formatDate(fromDate, dateFormat);
  const end = formatDate(toDate || fromDate, dateFormat);
  if (start && end && start !== end) return `${start} – ${end}`;
  return start || end || "—";
}

function statusTone(status) {
  const s = String(status || "").toLowerCase();
  if (s === "approved" || s === "accepted" || s === "accept") {
    return "border-[var(--success)]/25 bg-[var(--success-soft)] text-[var(--success)]";
  }
  if (s === "rejected" || s === "cancelled" || s === "canceled") {
    return "border-[var(--danger)]/25 bg-[var(--danger-soft)] text-[var(--danger)]";
  }
  if (
    s === "pending" ||
    s === "pending_peer" ||
    s === "pending_approval" ||
    s === "submitted"
  ) {
    return "border-[var(--violet)]/25 bg-[var(--lavender-soft)] text-[var(--violet)]";
  }
  return "border-[var(--border)] bg-[var(--panel-soft)] text-[var(--muted)]";
}

function statusText(row) {
  if (row?.statusLabel) return row.statusLabel;
  const s = String(row?.status || "").toLowerCase();
  if (s === "pending_peer") return "Waiting for peer";
  if (s === "pending" || s === "pending_approval") return "Pending approval";
  if (s === "cancelled" || s === "canceled") return "Cancelled";
  if (!s) return "—";
  return s.replace(/_/g, " ");
}

function shiftLabel(shift, timeFormat) {
  if (!shift) return "—";
  const name = shift.shiftName || "Shift";
  const start = shift.startTime ? formatTime(shift.startTime, timeFormat) : "";
  const end = shift.endTime ? formatTime(shift.endTime, timeFormat) : "";
  if (start && end) return `${name} (${start} – ${end})`;
  return name;
}

function personLabel(name, code) {
  if (name && code) return `${name} (${code})`;
  return name || code || "—";
}

function prettyShiftType(value) {
  if (!value) return "";
  return String(value)
    .replace(/_/g, " ")
    .toLowerCase()
    .replace(/\b\w/g, (char) => char.toUpperCase());
}

function shiftDetail(name, type) {
  const kind = prettyShiftType(type);
  if (name && kind) return `${name} · ${kind}`;
  return name || kind || "—";
}

function buildApprovalSteps(row) {
  const status = String(row?.status || "").toLowerCase();
  const peerStatus = String(row?.peerStatus || "").toLowerCase();
  const peerName = row?.peerName || "Peer";
  const reviewer = reviewerLabel(row?.reviewedBy);
  const peerAccepted = peerStatus === "accepted" || peerStatus === "accept";
  const peerRejected = peerStatus === "rejected" || peerStatus === "reject";
  const cancelled = status === "cancelled" || status === "canceled";
  const approved = status === "approved";
  const rejected = status === "rejected";
  const waitingOnPeer =
    !peerAccepted &&
    !peerRejected &&
    !approved &&
    (status === "pending_peer" || peerStatus === "pending" || !peerStatus);
  const companyReached = peerAccepted || approved || (rejected && !peerRejected);
  const companyDone = approved;
  const companyFailed = rejected && companyReached;
  const levelLabel = row?.levelName
    ? row.levelName
    : row?.currentLevel != null
      ? `Level ${row.currentLevel}${row?.totalLevels != null ? ` of ${row.totalLevels}` : ""
      }`
      : "Company approval";

  return [
    {
      key: "peer",
      title: "Peer acceptance",
      who: peerName,
      state: peerRejected
        ? "Rejected"
        : peerAccepted || approved
          ? "Accepted"
          : cancelled
            ? "Cancelled"
            : "Waiting",
      current: waitingOnPeer && !cancelled,
      done: peerAccepted || approved,
      failed: peerRejected,
      when: row?.peerDecidedAt || null,
      note: row?.peerComments || "",
    },
    {
      key: "company",
      title: levelLabel,
      who: companyDone || companyFailed ? reviewer || "Company approver" : levelLabel,
      state: companyDone
        ? "Approved"
        : companyFailed
          ? "Rejected"
          : cancelled
            ? "Cancelled"
            : companyReached
              ? "Next"
              : "Waiting",
      current: companyReached && !companyDone && !companyFailed && !cancelled,
      done: companyDone,
      failed: companyFailed,
      when: row?.reviewedAt || null,
      note: "",
    },
  ];
}

function reviewerLabel(value) {
  if (!value) return null;
  if (typeof value === "object") {
    const name = [value.firstName, value.lastName]
      .filter(Boolean)
      .join(" ")
      .trim();
    return name || value.name || value.employeeName || null;
  }
  const text = String(value).trim();
  if (/^[0-9a-f]{8}-[0-9a-f-]{20,}$/i.test(text)) return null;
  return text || null;
}

function participation(row, myId) {
  const role = String(row?.myRole || "").toLowerCase();
  if (row?.isPeer || role === "peer" || role === "target") {
    return { isRequester: false, isPeer: true };
  }
  if (row?.isRequester || role === "requester" || role === "owner") {
    return { isRequester: true, isPeer: false };
  }
  const mine = String(myId || "");
  if (mine && String(row?.peerEmployeeId || "") === mine) {
    return { isRequester: false, isPeer: true };
  }
  if (mine && String(row?.requesterEmployeeId || "") === mine) {
    return { isRequester: true, isPeer: false };
  }
  return { isRequester: false, isPeer: false };
}

function RequestRowActions({
  requestId,
  canCancel,
  canDecide,
  onView,
  onCancel,
  onAccept,
  onReject,
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
        event.target.closest?.(`[data-shift-swap-menu="${requestId}"]`)
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
            data-shift-swap-menu={requestId}
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
            {canDecide ? (
              <button
                type="button"
                className="flex w-full items-center gap-2 px-3 py-2.5 text-left text-[13px] font-semibold text-[var(--success)] hover:bg-[var(--success-soft)]"
                onClick={() => {
                  setOpen(false);
                  onAccept?.();
                }}
              >
                <Check className="h-4 w-4" />
                Accept
              </button>
            ) : null}
            {canDecide ? (
              <button
                type="button"
                className="flex w-full items-center gap-2 px-3 py-2.5 text-left text-[13px] font-semibold text-[var(--danger)] hover:bg-[var(--danger-soft)]"
                onClick={() => {
                  setOpen(false);
                  onReject?.();
                }}
              >
                <X className="h-4 w-4" />
                Reject
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

export function ShiftSwapView({
  timeFormat = "12h",
  dateFormat = "DD/MM/YYYY",
  compact = false,
  initialOpenForm = false,
  onFormOpened,
}) {
  const { employee } = useAuth();
  const myId = employee?.employeeId || employee?.id || "";
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
  const [showForm, setShowForm] = useState(Boolean(initialOpenForm));
  const [selected, setSelected] = useState(null);

  useEffect(() => {
    if (initialOpenForm) {
      setShowForm(true);
      onFormOpened?.();
    }
  }, [initialOpenForm, onFormOpened]);

  const [form, setForm] = useState(emptyForm);
  const [submitting, setSubmitting] = useState(false);
  const [actingId, setActingId] = useState(null);
  const [formError, setFormError] = useState("");
  const [decisionNote, setDecisionNote] = useState("");
  const [flash, setFlash] = useState("");
  const [flashTone, setFlashTone] = useState("success");

  const { rows, meta, stats, loading, error, refetch } = useShiftSwapList({
    status,
    page,
    limit,
  });
  const { shift: currentShift, loading: currentLoading } = useMyShift();
  const { peers, loading: peersLoading, error: peersError } = useSwapPeers({
    enabled: showForm,
  });

  const dateFilterCount = countActiveDateFilters(dateFrom, dateTo);

  const filteredRows = useMemo(() => {
    const q = listQuery.trim().toLowerCase();
    return (rows || []).filter((row) => {
      if (
        (dateFrom || dateTo) &&
        !rowMatchesDateRange(row, dateFrom, dateTo, [
          "fromDate",
          "toDate",
          "swapDate",
          "createdAt",
        ])
      ) {
        return false;
      }
      if (!q) return true;
      const hay = [
        row.reason,
        row.status,
        row.statusLabel,
        row.requesterName,
        row.peerName,
        row.requesterCode,
        row.peerCode,
        row.requesterShiftName,
        row.peerShiftName,
        row.fromDate,
        row.toDate,
        row.swapDate,
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

  function rowAccess(row) {
    const part = participation(row, myId);
    const statusKey = String(row.status || "").toLowerCase();
    const open = OPEN_STATUSES.has(statusKey);
    const known = part.isRequester || part.isPeer;
    return {
      ...part,
      canCancel: open && (part.isRequester || !known),
      canDecide: statusKey === "pending_peer" && (part.isPeer || !known),
    };
  }

  function counterparty(row) {
    const part = participation(row, myId);
    if (part.isPeer) {
      return personLabel(row.requesterName, row.requesterCode);
    }
    return personLabel(row.peerName, row.peerCode);
  }

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
        id: "period",
        header: "Period",
        cellClassName: "whitespace-nowrap font-medium text-[var(--text)]",
        cell: (row) =>
          formatSwapPeriod(row.fromDate || row.swapDate, row.toDate, dateFormat),
      },
      {
        id: "with",
        header: "Swap with",
        cellClassName: "whitespace-nowrap text-[var(--text)]",
        cell: (row) => counterparty(row),
      },
      {
        id: "role",
        header: "Your role",
        cellClassName: "whitespace-nowrap text-[var(--muted)]",
        cell: (row) => {
          const part = participation(row, myId);
          if (part.isPeer) return "Peer";
          if (part.isRequester) return "Requester";
          return "—";
        },
      },
      {
        id: "shifts",
        header: "Shifts",
        cellClassName: "whitespace-nowrap text-[var(--text)]",
        cell: (row) => {
          if (!row.requesterShiftName && !row.peerShiftName) return "—";
          return `${row.requesterShiftName || "—"} → ${row.peerShiftName || "—"}`;
        },
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
        cell: (row) => (
          <span
            className={`inline-flex rounded-full border px-2.5 py-0.5 text-[11px] font-semibold capitalize ${statusTone(row.status)}`}
          >
            {statusText(row)}
          </span>
        ),
      },
      {
        id: "action",
        header: "Action",
        cell: (row) => {
          const access = rowAccess(row);
          return (
            <RequestRowActions
              requestId={row.requestId}
              canCancel={access.canCancel}
              canDecide={access.canDecide}
              onView={() => {
                setDecisionNote("");
                setSelected(row);
              }}
              onCancel={() => handleCancel(row.requestId)}
              onAccept={() => handleDecision(row.requestId, "accept")}
              onReject={() => handleDecision(row.requestId, "reject")}
            />
          );
        },
      },
    ],
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [currentPage, limit, dateFormat, timeFormat, myId]
  );

  function refreshAll() {
    refetch();
  }

  async function handleSubmit(event) {
    event.preventDefault();
    setFormError("");

    if (!form.peerEmployeeId) {
      setFormError("Select the person you want to swap with.");
      return;
    }
    if (!form.fromDate || !form.toDate) {
      setFormError("From date and to date are required.");
      return;
    }
    if (form.toDate < form.fromDate) {
      setFormError("To date cannot be before the from date.");
      return;
    }
    if (!form.reason.trim()) {
      setFormError("Please provide a reason for the shift swap.");
      return;
    }

    setSubmitting(true);
    try {
      const res = await submitShiftSwap({
        peerEmployeeId: form.peerEmployeeId,
        fromDate: form.fromDate,
        toDate: form.toDate,
        reason: form.reason.trim(),
      });
      setFlashTone("success");
      setFlash(
        res?.message ||
        "Shift swap submitted. The other person needs to accept it before company approval."
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

  async function handleCancel(requestId) {
    if (!requestId) return;
    const ok = window.confirm("Cancel this open shift-swap request?");
    if (!ok) return;

    setActingId(requestId);
    try {
      const res = await cancelShiftSwap(requestId);
      setFlashTone("success");
      setFlash(res?.message || "Request cancelled");
      if (selected?.requestId === requestId) setSelected(null);
      refreshAll();
    } catch (err) {
      setFlashTone("danger");
      setFlash(err.message || "Failed to cancel request.");
    } finally {
      setActingId(null);
    }
  }

  async function handleDecision(requestId, action, comments) {
    if (!requestId) return;
    const verb = action === "accept" ? "Accept" : "Reject";
    const ok = window.confirm(
      `${verb} this shift swap? ${action === "accept"
        ? "It will then go for company approval."
        : "The requester will be notified."
      }`
    );
    if (!ok) return;

    setActingId(requestId);
    try {
      const res = await decideShiftSwap(requestId, {
        action: action === "accept" ? "accepted" : "rejected",
        comments: String(comments || "").trim() || undefined,
      });
      setFlashTone("success");
      setFlash(res?.message || `Shift swap ${action === "accept" ? "accepted" : "rejected"}`);
      if (selected?.requestId === requestId) setSelected(null);
      setDecisionNote("");
      refreshAll();
    } catch (err) {
      setFlashTone("danger");
      setFlash(err.message || "Failed to record your decision.");
    } finally {
      setActingId(null);
    }
  }

  const selectedAccess = selected ? rowAccess(selected) : null;

  return (
    <PortalPage
      fill
      hideHeader={compact}
      title="Shift Swap"
      subtitle={
        <>
          Ask a colleague to exchange shifts with you. They accept first, then
          the request goes for company approval. You can cancel while it is
          still open.
          {!currentLoading && currentShift?.hasShift ? (
            <span className="mt-2 block text-[12px] text-[var(--text)]">
              Your shift:{" "}
              <span className="font-semibold">
                {shiftLabel(currentShift, timeFormat)}
              </span>
            </span>
          ) : null}
        </>
      }
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
            New request
          </Button>
        </>
      }
    >
      {compact ? (
        <div className="flex flex-wrap items-center justify-between gap-3">
          <div>
            <h2 className="text-[15px] font-semibold text-[var(--text)]">
              Shift swap requests
            </h2>
            <p className="mt-0.5 text-[12px] text-[var(--muted)]">
              Swap your shift with another person
            </p>
          </div>
          <div className="flex flex-wrap gap-2">
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
              New request
            </Button>
          </div>
        </div>
      ) : null}

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
        title="Shift Swap Logs"
        titleCount={total}
        tabs={[
          { value: "all", label: "All" },
          { value: "pending_peer", label: "Awaiting peer" },
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
          listQuery.trim() || dateFilterCount > 0 ? filteredRows.length : total
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
            hint="Apply uses these dates for shift swap logs."
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
        minWidth="1040px"
        loading={loading}
        loadingLabel="Loading requests"
        loadingHint="Fetching shift-swap requests…"
        error={error}
        emptyIcon={Inbox}
        emptyTitle={`No ${status === "all"
            ? ""
            : status === "pending_peer"
              ? "awaiting peer "
              : `${status} `
          }requests`}
        emptyHint="Submit a request when you need to swap a shift with someone else."
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
          listQuery.trim() || dateFilterCount > 0 ? filteredRows.length : total
        }
        totalPages={listQuery.trim() || dateFilterCount > 0 ? 1 : totalPages}
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
        title="Request shift swap"
        subtitle="Pick a colleague, the date range, and why you need to swap"
        wide
      >
        <form className="space-y-4 pb-8" onSubmit={handleSubmit}>
          {currentShift?.hasShift ? (
            <div className="rounded-xl border border-dashed border-[var(--border)] bg-[var(--panel-soft)] px-3 py-2.5 text-[12px] text-[var(--muted)]">
              Your shift:{" "}
              <span className="font-semibold text-[var(--text)]">
                {shiftLabel(currentShift, timeFormat)}
              </span>
            </div>
          ) : null}

          <label className="block text-[12px] font-medium text-[var(--muted)]">
            Swap with
            <select
              required
              className={fieldClass}
              value={form.peerEmployeeId}
              disabled={submitting || peersLoading || peers.length === 0}
              onChange={(event) =>
                setForm((prev) => ({
                  ...prev,
                  peerEmployeeId: event.target.value,
                }))
              }
            >
              <option value="">
                {peersLoading ? "Loading people…" : "Choose a person…"}
              </option>
              {peers.map((person) => (
                <option key={person.employeeId} value={person.employeeId}>
                  {personLabel(person.employeeName, person.employeeCode)}
                  {person.designation ? ` · ${person.designation}` : ""}
                </option>
              ))}
            </select>
          </label>

          {!peersLoading && peersError ? (
            <p className="text-[12px] text-[var(--danger)]">{peersError}</p>
          ) : null}

          {!peersLoading && !peersError && peers.length === 0 ? (
            <p className="text-[12px] text-[var(--warning)]">
              No colleagues are available to swap with.
            </p>
          ) : null}

          <MuiDateRangeFields
            from={form.fromDate}
            to={form.toDate}
            onFromChange={(next) =>
              setForm((prev) => ({
                ...prev,
                fromDate: next,
                toDate:
                  prev.toDate && next && prev.toDate < next
                    ? next
                    : prev.toDate,
              }))
            }
            onToChange={(next) =>
              setForm((prev) => ({ ...prev, toDate: next }))
            }
            fromLabel="From date"
            toLabel="To date"
            required
            clearable={false}
            dateFormat={dateFormat}
          />

          <label className="block text-[12px] font-medium text-[var(--muted)]">
            Reason
            <textarea
              required
              rows={4}
              placeholder="e.g. Need the morning shift for a personal appointment"
              className="mt-1.5 w-full rounded-xl border border-[var(--border)] bg-[var(--surface)] px-3 py-2.5 text-[13px] text-[var(--text)] outline-none transition focus:border-[var(--violet)] focus:ring-2 focus:ring-[var(--lavender-soft)]"
              value={form.reason}
              onChange={(e) =>
                setForm((prev) => ({ ...prev, reason: e.target.value }))
              }
            />
          </label>

          <p className="flex items-start gap-2 text-[12px] text-[var(--muted)]">
            <ArrowLeftRight className="mt-0.5 h-3.5 w-3.5 shrink-0 text-[var(--violet)]" />
            The other person must accept this swap. After that it goes for
            company approval.
          </p>

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
                {submitting ? "Submitting…" : "Submit for peer acceptance"}
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
        onClose={() => {
          setSelected(null);
          setDecisionNote("");
        }}
        title="Shift swap details"
        subtitle={
          selected
            ? `${selected.requesterName || "Requester"} → ${selected.peerName || "Peer"}`
            : undefined
        }
      >
        {selected ? (
          <div className="space-y-4 pb-8">
            <dl className="space-y-3 text-[13px]">
              <div>
                <dt className="text-[11px] font-semibold uppercase tracking-wide text-[var(--muted)]">
                  Status
                </dt>
                <dd className="mt-1">
                  <span
                    className={`inline-flex rounded-full border px-2.5 py-0.5 text-[11px] font-semibold capitalize ${statusTone(selected.status)}`}
                  >
                    {statusText(selected)}
                  </span>
                </dd>
              </div>
              <div>
                <dt className="text-[11px] font-semibold uppercase tracking-wide text-[var(--muted)]">
                  Period
                </dt>
                <dd className="mt-1 font-medium text-[var(--text)]">
                  {formatSwapPeriod(
                    selected.fromDate || selected.swapDate,
                    selected.toDate,
                    dateFormat
                  )}
                </dd>
              </div>
              <div>
                <dt className="text-[11px] font-semibold uppercase tracking-wide text-[var(--muted)]">
                  Approval flow
                </dt>
                <dd className="mt-2">
                  {(() => {
                    const steps = buildApprovalSteps(selected);
                    const next = steps.find((step) => step.current);
                    return (
                      <div className="rounded-xl border border-[var(--border)] bg-[var(--panel-soft)] p-3">
                        <p className="text-[12px] text-[var(--muted)]">
                          {next ? (
                            <>
                              Next:{" "}
                              <span className="font-semibold text-[var(--text)]">
                                {next.who}
                              </span>
                            </>
                          ) : selected.status === "approved" ? (
                            <span className="font-semibold text-[var(--success)]">
                              Fully approved
                            </span>
                          ) : (
                            "No further approval"
                          )}
                        </p>
                        <ol className="mt-3 space-y-0">
                          {steps.map((step, index) => (
                            <li
                              key={step.key}
                              className="relative flex gap-3 pb-4 last:pb-0"
                            >
                              {index < steps.length - 1 ? (
                                <span
                                  className={`absolute left-[11px] top-6 h-[calc(100%-12px)] w-px ${step.done
                                      ? "bg-[var(--success)]/40"
                                      : "bg-[var(--border)]"
                                    }`}
                                  aria-hidden
                                />
                              ) : null}
                              <span
                                className={`relative z-[1] inline-flex h-6 w-6 shrink-0 items-center justify-center rounded-full border text-[11px] font-bold ${step.done
                                    ? "border-[var(--success)] bg-[var(--success)] text-white"
                                    : step.failed
                                      ? "border-[var(--danger)] bg-[var(--danger)] text-white"
                                      : step.current
                                        ? "border-[var(--violet)] bg-[var(--violet)] text-white"
                                        : "border-[var(--border)] bg-[var(--surface)] text-[var(--muted)]"
                                  }`}
                              >
                                {step.done ? (
                                  <CheckCircle2 className="h-3.5 w-3.5" />
                                ) : (
                                  index + 1
                                )}
                              </span>
                              <div className="min-w-0">
                                <p className="text-[13px] font-semibold text-[var(--text)]">
                                  {step.title}
                                </p>
                                <p className="text-[12px] text-[var(--muted)]">
                                  {step.done || step.failed
                                    ? `${step.state} by ${step.who}`
                                    : step.current
                                      ? `Waiting on ${step.who}`
                                      : step.state}
                                  {step.when
                                    ? ` · ${formatDateTime(step.when, dateFormat, timeFormat)}`
                                    : ""}
                                </p>
                                {step.note ? (
                                  <p className="mt-1 whitespace-pre-wrap text-[12px] text-[var(--text)]">
                                    {step.note}
                                  </p>
                                ) : null}
                              </div>
                            </li>
                          ))}
                        </ol>
                      </div>
                    );
                  })()}
                </dd>
              </div>
              <div>
                <dt className="text-[11px] font-semibold uppercase tracking-wide text-[var(--muted)]">
                  Requester
                </dt>
                <dd className="mt-1 text-[var(--text)]">
                  {personLabel(selected.requesterName, selected.requesterCode)}
                </dd>
              </div>
              <div>
                <dt className="text-[11px] font-semibold uppercase tracking-wide text-[var(--muted)]">
                  Requester shift
                </dt>
                <dd className="mt-1 text-[var(--text)]">
                  {shiftDetail(
                    selected.requesterShiftName,
                    selected.requesterShiftType
                  )}
                </dd>
              </div>
              <div>
                <dt className="text-[11px] font-semibold uppercase tracking-wide text-[var(--muted)]">
                  Swap with
                </dt>
                <dd className="mt-1 text-[var(--text)]">
                  {personLabel(selected.peerName, selected.peerCode)}
                </dd>
              </div>
              <div>
                <dt className="text-[11px] font-semibold uppercase tracking-wide text-[var(--muted)]">
                  Peer shift
                </dt>
                <dd className="mt-1 text-[var(--text)]">
                  {shiftDetail(selected.peerShiftName, selected.peerShiftType)}
                </dd>
              </div>
              <div>
                <dt className="text-[11px] font-semibold uppercase tracking-wide text-[var(--muted)]">
                  Your role
                </dt>
                <dd className="mt-1 text-[var(--text)]">
                  {selectedAccess?.isPeer
                    ? "Peer"
                    : selectedAccess?.isRequester
                      ? "Requester"
                      : "—"}
                </dd>
              </div>
              <div>
                <dt className="text-[11px] font-semibold uppercase tracking-wide text-[var(--muted)]">
                  Reason
                </dt>
                <dd className="mt-1 whitespace-pre-wrap text-[var(--text)]">
                  {selected.reason || "—"}
                </dd>
              </div>
              <div>
                <dt className="text-[11px] font-semibold uppercase tracking-wide text-[var(--muted)]">
                  Submitted
                </dt>
                <dd className="mt-1 text-[var(--muted)]">
                  {selected.createdAt
                    ? formatDateTime(selected.createdAt, dateFormat, timeFormat)
                    : "—"}
                </dd>
              </div>
            </dl>

            {selectedAccess?.canDecide ? (
              <div className="space-y-3">
                <label className="block text-[12px] font-medium text-[var(--muted)]">
                  Note for the requester
                  <textarea
                    rows={3}
                    placeholder="Optional"
                    className="mt-1.5 w-full rounded-xl border border-[var(--border)] bg-[var(--surface)] px-3 py-2.5 text-[13px] text-[var(--text)] outline-none transition focus:border-[var(--violet)] focus:ring-2 focus:ring-[var(--lavender-soft)]"
                    value={decisionNote}
                    onChange={(event) => setDecisionNote(event.target.value)}
                  />
                </label>
                <div className="flex gap-2">
                  <Button
                    type="button"
                    className="h-11 flex-1 rounded-xl"
                    disabled={actingId === selected.requestId}
                    onClick={() =>
                      handleDecision(selected.requestId, "accept", decisionNote)
                    }
                  >
                    <Check className="h-4 w-4" />
                    Accept
                  </Button>
                  <Button
                    type="button"
                    variant="outline"
                    className="h-11 flex-1 rounded-xl text-[var(--danger)]"
                    disabled={actingId === selected.requestId}
                    onClick={() =>
                      handleDecision(selected.requestId, "reject", decisionNote)
                    }
                  >
                    <XCircle className="h-4 w-4" />
                    Reject
                  </Button>
                </div>
              </div>
            ) : null}

            {selectedAccess?.canCancel ? (
              <Button
                type="button"
                variant="outline"
                className="h-11 w-full rounded-xl text-[var(--danger)]"
                disabled={actingId === selected.requestId}
                onClick={() => handleCancel(selected.requestId)}
              >
                <XCircle className="h-4 w-4" />
                {actingId === selected.requestId
                  ? "Cancelling…"
                  : "Cancel request"}
              </Button>
            ) : null}
          </div>
        ) : null}
      </SlideOver>
    </PortalPage>
  );
}
