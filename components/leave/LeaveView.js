"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import { createPortal } from "react-dom";
import {
  Banknote,
  Clock3,
  Eye,
  FilePenLine,
  Inbox,
  MoreVertical,
  Plus,
  RefreshCw,
  SearchX,
  Send,
  X,
} from "lucide-react";
import { Button } from "@/components/ui/Button";
import { Card } from "@/components/ui/Card";
import { FlashBanner } from "@/components/ui/FlashBanner";
import { SearchableFilter } from "@/components/attendance/AttendanceStatusFilter";
import {
  readQueryInt,
  readQueryString,
  usePersistListQuery,
  usePortalQuery,
} from "@/hooks/usePortalQuery";
import { MetaBadge } from "@/components/ui/MetaBadge";
import { PortalPage } from "@/components/ui/PortalPage";
import { PageLoader } from "@/components/ui/Spinner";
import { SlideOver } from "@/components/ui/SlideOver";
import { TablePanel } from "@/components/ui/TablePanel";
import { FilterDrawerDateRange } from "@/components/ui/FilterDrawerDateRange";
import { LeaveBalanceBoard } from "@/components/leave/LeaveBalanceBoard";
import { useLeavePage } from "@/hooks/useLeave";
import { useLeaveTypes } from "@/hooks/useLeaveTypes";
import { formatDate, formatDateTime, rowSerial } from "@/lib/format";
import {
  countActiveDateFilters,
  rowMatchesDateRange,
} from "@/lib/request-date-filter";

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

function leaveTypeName(leaveTypeId, types = [], balances = []) {
  const fromType = (types || []).find(
    (t) => String(t.id || t.leaveTypeId) === String(leaveTypeId)
  );
  if (fromType?.text || fromType?.leaveTypeName) {
    return fromType.text || fromType.leaveTypeName;
  }
  const row = (balances || []).find(
    (b) => String(b.leaveTypeId) === String(leaveTypeId)
  );
  return row?.leaveTypeName || "—";
}

function daysBetweenInclusive(fromDate, toDate) {
  if (!fromDate || !toDate) return null;
  const a = new Date(`${fromDate}T00:00:00`);
  const b = new Date(`${toDate}T00:00:00`);
  if (Number.isNaN(a.getTime()) || Number.isNaN(b.getTime())) return null;
  const diff = Math.round((b - a) / 86400000) + 1;
  return diff > 0 ? diff : null;
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

export function LeaveView({ section = "logs" }) {
  const isLogs = section === "logs";
  const isEncashment = section === "encashment";
  const isBalance = section === "balance";

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
    ensureBalances,
    submitLeave,
    cancelLeave,
    updateLeave,
    submitEncashment,
    cancelEncashment,
  } = useLeavePage({
    loadBalance: isBalance,
    loadRequests: isLogs,
    loadEncashment: isEncashment,
  });

  const [formOpen, setFormOpen] = useState(false);
  const [encashOpen, setEncashOpen] = useState(false);

  const {
    types: leaveTypes,
    filterOptions: leaveTypeFilterOptions,
    loading: leaveTypesLoading,
  } = useLeaveTypes({
    // Dropdown only when filters / apply forms need it — not on balance screen.
    enabled: isLogs || isEncashment || formOpen || encashOpen,
  });

  const { searchParams } = usePortalQuery();
  const currentYear = new Date().getFullYear();
  const leaveQueryDefaults = useMemo(
    () => ({
      status: "all",
      q: "",
      leaveType: "all",
      from: "",
      to: "",
      fy: String(currentYear),
      page: "1",
      limit: "10",
      encashStatus: "all",
      encashQ: "",
      encashType: "all",
      encashFrom: "",
      encashTo: "",
      encashPage: "1",
      encashLimit: "10",
    }),
    [currentYear]
  );
  const urlBootRef = useRef(false);

  const [form, setForm] = useState(emptyLeaveForm);
  const [editingRequestId, setEditingRequestId] = useState("");
  const [saving, setSaving] = useState(false);
  const [message, setMessage] = useState("");
  const [cancellingId, setCancellingId] = useState("");
  const [detail, setDetail] = useState(null);

  const [encashForm, setEncashForm] = useState(emptyEncashForm);
  const [encashSaving, setEncashSaving] = useState(false);
  const [encashCancellingId, setEncashCancellingId] = useState("");
  const [encashDetail, setEncashDetail] = useState(null);
  const [listQuery, setListQuery] = useState(() =>
    readQueryString(searchParams, "q", "")
  );
  const [leaveTypeFilter, setLeaveTypeFilter] = useState(() =>
    readQueryString(searchParams, "leaveType", "all")
  );
  const [draftLeaveType, setDraftLeaveType] = useState(leaveTypeFilter);
  const [dateFrom, setDateFrom] = useState(() =>
    readQueryString(searchParams, "from", "")
  );
  const [dateTo, setDateTo] = useState(() =>
    readQueryString(searchParams, "to", "")
  );
  const [draftDateFrom, setDraftDateFrom] = useState(dateFrom);
  const [draftDateTo, setDraftDateTo] = useState(dateTo);
  const [encashQuery, setEncashQuery] = useState(() =>
    readQueryString(searchParams, "encashQ", "")
  );
  const [encashTypeFilter, setEncashTypeFilter] = useState(() =>
    readQueryString(searchParams, "encashType", "all")
  );
  const [draftEncashType, setDraftEncashType] = useState(encashTypeFilter);
  const [encashDateFrom, setEncashDateFrom] = useState(() =>
    readQueryString(searchParams, "encashFrom", "")
  );
  const [encashDateTo, setEncashDateTo] = useState(() =>
    readQueryString(searchParams, "encashTo", "")
  );
  const [draftEncashDateFrom, setDraftEncashDateFrom] =
    useState(encashDateFrom);
  const [draftEncashDateTo, setDraftEncashDateTo] = useState(encashDateTo);
  const [balanceQuery, setBalanceQuery] = useState("");
  const [draftFiscalYear, setDraftFiscalYear] = useState(String(fiscalYear));

  useEffect(() => {
    if (urlBootRef.current) return;
    urlBootRef.current = true;
    setFiscalYear(readQueryInt(searchParams, "fy", currentYear));
    setStatusFilter(readQueryString(searchParams, "status", "all"));
    setPage(readQueryInt(searchParams, "page", 1));
    setLimit(readQueryInt(searchParams, "limit", 10));
    setEncashStatusFilter(readQueryString(searchParams, "encashStatus", "all"));
    setEncashPage(readQueryInt(searchParams, "encashPage", 1));
    setEncashLimit(readQueryInt(searchParams, "encashLimit", 10));
  }, [
    searchParams,
    currentYear,
    setFiscalYear,
    setStatusFilter,
    setPage,
    setLimit,
    setEncashStatusFilter,
    setEncashPage,
    setEncashLimit,
  ]);

  usePersistListQuery(
    {
      status,
      q: listQuery,
      leaveType: leaveTypeFilter,
      from: dateFrom,
      to: dateTo,
      fy: fiscalYear,
      page,
      limit,
      encashStatus,
      encashQ: encashQuery,
      encashType: encashTypeFilter,
      encashFrom: encashDateFrom,
      encashTo: encashDateTo,
      encashPage,
      encashLimit,
    },
    leaveQueryDefaults,
    [
      status,
      listQuery,
      leaveTypeFilter,
      dateFrom,
      dateTo,
      fiscalYear,
      page,
      limit,
      encashStatus,
      encashQuery,
      encashTypeFilter,
      encashDateFrom,
      encashDateTo,
      encashPage,
      encashLimit,
    ]
  );

  useEffect(() => {
    setDraftLeaveType(leaveTypeFilter);
  }, [leaveTypeFilter]);

  useEffect(() => {
    setDraftEncashType(encashTypeFilter);
  }, [encashTypeFilter]);

  useEffect(() => {
    setDraftDateFrom(dateFrom);
    setDraftDateTo(dateTo);
  }, [dateFrom, dateTo]);

  useEffect(() => {
    setDraftEncashDateFrom(encashDateFrom);
    setDraftEncashDateTo(encashDateTo);
  }, [encashDateFrom, encashDateTo]);

  useEffect(() => {
    setDraftFiscalYear(String(fiscalYear));
  }, [fiscalYear]);

  const statusTabs = [
    { value: "all", label: "All" },
    { value: "pending", label: "Pending" },
    { value: "approved", label: "Approved" },
    { value: "cancelled", label: "Cancelled" },
  ];
  // Encashment API: pending | approved | rejected (no cancelled filter value).
  const encashStatusTabs = [
    { value: "all", label: "All" },
    { value: "pending", label: "Pending" },
    { value: "approved", label: "Approved" },
    { value: "cancelled", label: "Cancelled" },
  ];

  const yearOptions = useMemo(() => {
    const y = currentYear;
    return [y - 1, y, y + 1];
  }, [currentYear]);

  const fiscalYearFilterOptions = useMemo(
    () => yearOptions.map((y) => ({ value: String(y), label: `FY ${y}` })),
    [yearOptions]
  );

  const fyFilterActive = Number(fiscalYear) !== currentYear;
  const leaveDateFilterCount = countActiveDateFilters(dateFrom, dateTo);
  const encashDateFilterCount = countActiveDateFilters(
    encashDateFrom,
    encashDateTo
  );
  const leaveListFilterCount =
    (leaveTypeFilter !== "all" ? 1 : 0) + leaveDateFilterCount;
  const encashListFilterCount =
    (encashTypeFilter !== "all" ? 1 : 0) + encashDateFilterCount;

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

  const selectedLeaveType = useMemo(
    () =>
      leaveTypes.find(
        (t) => String(t.id || t.leaveTypeId) === String(form.leaveTypeId)
      ) || null,
    [leaveTypes, form.leaveTypeId]
  );

  const requestTotal = Number(meta?.total) || 0;
  const requestPages = Math.max(1, Number(meta?.totalPages) || 1);
  const encashTotal = Number(encashMeta?.total) || 0;
  const encashPages = Math.max(1, Number(encashMeta?.totalPages) || 1);

  const leaveTypeOptions = useMemo(() => {
    if (leaveTypeFilterOptions.length > 1) return leaveTypeFilterOptions;
    // Fallback while dropdown loads / fails: balances + requests
    const map = new Map();
    for (const row of balances || []) {
      if (row.leaveTypeId) {
        map.set(String(row.leaveTypeId), row.leaveTypeName || "Leave type");
      }
    }
    for (const row of requests || []) {
      const id = row.leaveTypeId;
      if (id && !map.has(String(id))) {
        map.set(String(id), row.leaveTypeName || "Leave type");
      }
    }
    return [
      { value: "all", label: "All leave types" },
      ...Array.from(map.entries()).map(([value, label]) => ({ value, label })),
    ];
  }, [leaveTypeFilterOptions, balances, requests]);

  const applyTypeOptions = useMemo(() => {
    if (leaveTypes.length) {
      return leaveTypes.map((t) => {
        const bal = (balances || []).find(
          (b) => String(b.leaveTypeId) === String(t.id)
        );
        return {
          id: t.id,
          label: bal
            ? `${t.text} · ${Number(bal.remaining)} left`
            : t.text,
        };
      });
    }
    return (balances || []).map((row) => ({
      id: row.leaveTypeId,
      label: `${row.leaveTypeName} · ${Number(row.remaining)} left`,
    }));
  }, [leaveTypes, balances]);

  const filteredRequests = useMemo(() => {
    const q = listQuery.trim().toLowerCase();
    return (requests || []).filter((row) => {
      if (
        leaveTypeFilter !== "all" &&
        String(row.leaveTypeId || "") !== leaveTypeFilter
      ) {
        return false;
      }
      if (
        !rowMatchesDateRange(row, dateFrom, dateTo, [
          "fromDate",
          "toDate",
          "createdAt",
          "submittedAt",
        ])
      ) {
        return false;
      }
      if (!q) return true;
      const hay = [
        row.leaveTypeName,
        row.reason,
        row.status,
        row.statusLabel,
        row.fromDate,
        row.toDate,
      ]
        .filter(Boolean)
        .join(" ")
        .toLowerCase();
      return hay.includes(q);
    });
  }, [requests, listQuery, leaveTypeFilter, dateFrom, dateTo]);

  const filteredEncashRows = useMemo(() => {
    const q = encashQuery.trim().toLowerCase();
    return (encashRows || []).filter((row) => {
      if (
        encashTypeFilter !== "all" &&
        String(row.leaveTypeId || "") !== encashTypeFilter
      ) {
        return false;
      }
      if (
        !rowMatchesDateRange(row, encashDateFrom, encashDateTo, [
          "createdAt",
          "submittedAt",
          "requestedAt",
          "fromDate",
          "toDate",
        ])
      ) {
        return false;
      }
      if (!q) return true;
      const hay = [
        row.leaveTypeName,
        row.remarks,
        row.reason,
        row.status,
        row.statusLabel,
      ]
        .filter(Boolean)
        .join(" ")
        .toLowerCase();
      return hay.includes(q);
    });
  }, [
    encashRows,
    encashQuery,
    encashTypeFilter,
    encashDateFrom,
    encashDateTo,
  ]);

  const filteredBalances = useMemo(() => {
    const q = balanceQuery.trim().toLowerCase();
    return (balances || []).filter((row) => {
      if (!q) return true;
      const name = leaveTypeName(row.leaveTypeId, leaveTypes, balances);
      const hay = [name, row.leaveTypeName, row.leaveTypeId]
        .filter(Boolean)
        .join(" ")
        .toLowerCase();
      return hay.includes(q);
    });
  }, [balances, balanceQuery, leaveTypes]);

  const requestColumns = useMemo(
    () => [
      {
        id: "serial",
        header: "#",
        headerClassName: "w-12",
        cellClassName: "tabular-nums text-[var(--muted)]",
        cell: (_row, { index }) => rowSerial(index, page, limit),
      },
      {
        id: "leaveType",
        header: "Leave type",
        cellClassName: "font-medium text-[var(--text)]",
        cell: (row) => {
          const half =
            row.isFirstHalf || row.isSecondHalf
              ? row.isFirstHalf
                ? " · 1st half"
                : " · 2nd half"
              : "";
          return (
            <>
              {row.leaveTypeName ||
                leaveTypeName(row.leaveTypeId, leaveTypes, balances)}
              {half ? (
                <span className="text-[11px] text-[var(--muted)]">{half}</span>
              ) : null}
            </>
          );
        },
      },
      {
        id: "from",
        header: "From",
        cellClassName: "whitespace-nowrap text-[var(--text)]",
        cell: (row) => formatDate(row.fromDate),
      },
      {
        id: "to",
        header: "To",
        cellClassName: "whitespace-nowrap text-[var(--text)]",
        cell: (row) => formatDate(row.toDate),
      },
      {
        id: "days",
        header: "Days",
        cellClassName: "tabular-nums text-[var(--text)]",
        cell: (row) => row.totalDays ?? "—",
      },
      {
        id: "status",
        header: "Status",
        cell: (row) => (
          <>
            <StatusPill
              status={row.status}
              label={row.statusLabel || row.status}
            />
            {row.rejectionReason ? (
              <p className="mt-1 max-w-[160px] truncate text-[10px] text-[var(--danger)]">
                {row.rejectionReason}
              </p>
            ) : null}
          </>
        ),
      },
      {
        id: "submitted",
        header: "Submitted",
        cellClassName: "whitespace-nowrap text-[var(--muted)]",
        cell: (row) =>
          row.createdAt ? formatDateTime(row.createdAt) : "—",
      },
      {
        id: "reason",
        header: "Reason",
        cellClassName: "max-w-[180px] truncate text-[var(--muted)]",
        cell: (row) => (
          <span title={row.reason || ""}>{row.reason || "—"}</span>
        ),
      },
      {
        id: "action",
        header: "Action",
        cell: (row) => {
          const requestId =
            row.requestId || row.id || row.leaveRequestId;
          const isPending =
            String(row.status || "").toLowerCase() === "pending";
          return (
            <LeaveRequestRowActions
              requestId={requestId}
              canEdit={isPending}
              canCancel={isPending}
              onView={() => setDetail({ ...row, requestId })}
              onEdit={() => openEdit({ ...row, requestId })}
              onCancel={() => onCancelLeave(requestId)}
            />
          );
        },
      },
    ],
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [page, limit, leaveTypes, balances]
  );

  const encashColumns = useMemo(
    () => [
      {
        id: "serial",
        header: "#",
        headerClassName: "w-12",
        cellClassName: "tabular-nums text-[var(--muted)]",
        cell: (_row, { index }) =>
          rowSerial(index, encashPage, encashLimit),
      },
      {
        id: "leaveType",
        header: "Leave type",
        cellClassName: "font-medium text-[var(--text)]",
        cell: (row) =>
          row.leaveTypeName ||
          leaveTypeName(row.leaveTypeId, leaveTypes, balances),
      },
      {
        id: "days",
        header: "Days",
        cellClassName: "tabular-nums text-[var(--text)]",
        cell: (row) => row.daysToEncash ?? row.days ?? "—",
      },
      {
        id: "amount",
        header: "Amount",
        cellClassName: "tabular-nums text-[var(--text)]",
        cell: (row) => {
          const amount =
            row.amount ??
            row.encashmentAmount ??
            row.totalAmount ??
            row.payableAmount;
          return amount != null && amount !== "" ? amount : "—";
        },
      },
      {
        id: "fy",
        header: "FY",
        cell: (row) => row.fiscalYear ?? "—",
      },
      {
        id: "status",
        header: "Status",
        cell: (row) => (
          <StatusPill
            status={row.status}
            label={row.statusLabel || row.status}
          />
        ),
      },
      {
        id: "submitted",
        header: "Submitted",
        cellClassName: "whitespace-nowrap text-[var(--muted)]",
        cell: (row) =>
          row.createdAt
            ? formatDateTime(row.createdAt)
            : row.requestedAt
              ? formatDateTime(row.requestedAt)
              : "—",
      },
      {
        id: "remarks",
        header: "Remarks",
        cellClassName: "max-w-[160px] truncate text-[var(--muted)]",
        cell: (row) => (
          <span title={row.remarks || ""}>{row.remarks || "—"}</span>
        ),
      },
      {
        id: "action",
        header: "Action",
        cell: (row) => {
          const id = row.encashmentId || row.requestId || row.id;
          const isPending =
            String(row.status || "").toLowerCase() === "pending";
          return (
            <LeaveRequestRowActions
              requestId={String(id)}
              canEdit={false}
              canCancel={isPending}
              onView={() => setEncashDetail(row)}
              onCancel={() => onCancelEncash(id)}
            />
          );
        },
      },
    ],
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [encashPage, encashLimit, leaveTypes, balances]
  );

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
    ensureBalances();
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
    ensureBalances();
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

      const policy =
        leaveTypes.find(
          (t) => String(t.id) === String(form.leaveTypeId)
        ) || null;
      const spanDays = daysBetweenInclusive(form.fromDate, form.toDate);
      if (policy && spanDays != null) {
        if (
          policy.minDuration != null &&
          Number(policy.minDuration) > 0 &&
          spanDays < Number(policy.minDuration)
        ) {
          throw new Error(
            `Minimum duration for ${policy.text} is ${policy.minDuration} day(s).`
          );
        }
        if (
          policy.maxDuration != null &&
          Number(policy.maxDuration) > 0 &&
          spanDays > Number(policy.maxDuration)
        ) {
          throw new Error(
            `Maximum duration for ${policy.text} is ${policy.maxDuration} day(s).`
          );
        }
      }
      if (policy?.advanceNoticeDays != null && Number(policy.advanceNoticeDays) > 0) {
        const today = new Date();
        today.setHours(0, 0, 0, 0);
        const from = new Date(`${form.fromDate}T00:00:00`);
        const notice = Math.round((from - today) / 86400000);
        if (notice < Number(policy.advanceNoticeDays)) {
          throw new Error(
            `${policy.text} requires at least ${policy.advanceNoticeDays} day(s) advance notice.`
          );
        }
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

  const leaveHasSearchOrFilter = Boolean(
    listQuery.trim() ||
    leaveTypeFilter !== "all" ||
    dateFrom ||
    dateTo ||
    status !== "all"
  );
  const encashHasSearchOrFilter = Boolean(
    encashQuery.trim() ||
    encashTypeFilter !== "all" ||
    encashDateFrom ||
    encashDateTo ||
    encashStatus !== "all"
  );
  const balanceHasSearchOrFilter = Boolean(
    balanceQuery.trim() || fyFilterActive
  );

  function clearLeaveListFilters() {
    setListQuery("");
    setDraftDateFrom("");
    setDraftDateTo("");
    setDateFrom("");
    setDateTo("");
    setDraftLeaveType("all");
    setLeaveTypeFilter("all");
    setStatusFilter("all");
    setPage(1);
  }

  function clearEncashListFilters() {
    setEncashQuery("");
    setDraftEncashDateFrom("");
    setDraftEncashDateTo("");
    setEncashDateFrom("");
    setEncashDateTo("");
    setDraftEncashType("all");
    setEncashTypeFilter("all");
    setEncashStatusFilter("all");
    setEncashPage(1);
  }

  function clearBalanceListFilters() {
    setBalanceQuery("");
    const y = String(currentYear);
    setDraftFiscalYear(y);
    setFiscalYear(currentYear);
  }

  if (
    (isBalance && balanceLoading && !balances.length) ||
    (isLogs && requestsLoading && !requests.length) ||
    (isEncashment && encashLoading && !encashRows.length)
  ) {
    return (
      <PageLoader
        label={
          isEncashment
            ? "Loading encashment"
            : isBalance
              ? "Loading leave balance"
              : "Loading leave"
        }
        hint="Fetching your leave data…"
      />
    );
  }

  const pageTitle = isEncashment
    ? "Leave Encashment"
    : isBalance
      ? "Leave Balance"
      : "Leave Logs";
  const pageSubtitle = isEncashment
    ? "Convert unused leave days to salary and track encashment requests."
    : isBalance
      ? "See allocated, used, pending, and remaining leave by type."
      : "Apply for leave and track the status of your leave requests.";

  return (
    <PortalPage
      fill
      title={pageTitle}
      subtitle={pageSubtitle}
      actions={
        <>
          {isBalance ? <MetaBadge>FY {fiscalYear}</MetaBadge> : null}
          <Button
            type="button"
            variant="outline"
            className="h-10 rounded-xl"
            onClick={refetch}
          >
            <RefreshCw className="h-4 w-4" />
            Refresh
          </Button>
          {isLogs ? (
            <Button
              type="button"
              className="h-10 rounded-xl"
              onClick={() => openApply()}
            >
              <Plus className="h-4 w-4" />
              Apply leave
            </Button>
          ) : null}
          {isEncashment && encashmentEnabled && !encashDisabled ? (
            <Button
              type="button"
              className="h-10 rounded-xl"
              onClick={() => {
                setEncashOpen(true);
                setEncashForm((prev) => ({
                  ...prev,
                  fiscalYear: String(fiscalYear),
                }));
                ensureBalances();
              }}
            >
              <Banknote className="h-4 w-4" />
              Apply encashment
            </Button>
          ) : null}
        </>
      }
    >
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
      {isEncashment && encashMessage && encashDisabled ? (
        <FlashBanner
          message={encashMessage}
          tone="danger"
          autoDismiss={false}
        />
      ) : null}

      <Card
        data-fill-panel=""
        className="!p-0 min-h-0 overflow-hidden"
        bodyClassName="!min-h-0 flex flex-col overflow-hidden"
      >
        {isLogs ? (
          <TablePanel
            className="min-h-0 flex-1 border-0 shadow-none rounded-none"
            title="Leave Logs"
            titleCount={requestTotal}
            tabs={statusTabs}
            tab={status}
            onTabChange={setStatusFilter}
            recordCount={filteredRequests.length}
            search={listQuery}
            onSearchChange={setListQuery}
            searchPlaceholder="Search logs…"
            filterTitle="Filters"
            filterSubtitle="Date range and leave type"
            filterActive={leaveListFilterCount > 0}
            activeFilterCount={leaveListFilterCount}
            drawerFields={
              <div className="space-y-5">
                <FilterDrawerDateRange
                  from={draftDateFrom}
                  to={draftDateTo}
                  onFromChange={setDraftDateFrom}
                  onToChange={setDraftDateTo}
                  title="Leave period"
                  hint="Filter by leave from / to dates."
                />
                <SearchableFilter
                  label="Leave type"
                  value={draftLeaveType}
                  onChange={setDraftLeaveType}
                  options={leaveTypeOptions}
                  defaultValue="all"
                />
              </div>
            }
            onApplyFilters={() => {
              setDateFrom(draftDateFrom);
              setDateTo(draftDateTo);
              setLeaveTypeFilter(draftLeaveType);
              setPage(1);
            }}
            onResetFilters={() => {
              setDraftDateFrom("");
              setDraftDateTo("");
              setDateFrom("");
              setDateTo("");
              setDraftLeaveType("all");
              setLeaveTypeFilter("all");
              setPage(1);
            }}
            onRefresh={refetch}
            columns={requestColumns}
            rows={filteredRequests}
            getRowKey={(row) =>
              row.requestId || row.id || row.leaveRequestId
            }
            minWidth="960px"
            loading={requestsLoading}
            loadingLabel="Loading requests"
            loadingHint="Fetching leave requests…"
            emptyIcon={leaveHasSearchOrFilter ? SearchX : Inbox}
            emptyTitle={
              leaveHasSearchOrFilter ? "Data not found" : "No leave requests"
            }
            emptyHint={
              leaveHasSearchOrFilter
                ? "No leave logs match your search or filters. Try a different date range, leave type, or clear filters."
                : "When you apply for leave, your requests will show up here."
            }
            emptyAction={
              leaveHasSearchOrFilter ? (
                <Button
                  type="button"
                  variant="outline"
                  className="h-10 rounded-xl"
                  onClick={clearLeaveListFilters}
                >
                  Clear search & filters
                </Button>
              ) : (
                <Button
                  type="button"
                  className="h-10 rounded-xl"
                  onClick={() => openApply()}
                >
                  <Plus className="h-4 w-4" />
                  Apply leave
                </Button>
              )
            }
            page={page}
            pageSize={limit}
            total={requestTotal}
            totalPages={requestPages}
            onPageChange={setPage}
            onPageSizeChange={(n) => {
              setLimit(n);
              setPage(1);
            }}
          />
        ) : null}

        {isEncashment ? (
          encashmentEnabled && !encashDisabled ? (
            <TablePanel
              className="min-h-0 flex-1 border-0 shadow-none rounded-none"
              title="Encashment Logs"
              titleCount={encashTotal}
              toolbarExtra={
                <Button
                  type="button"
                  variant="outline"
                  className="h-7 rounded-lg px-2.5 text-[11px]"
                  onClick={() => {
                    setEncashOpen(true);
                    setEncashForm((prev) => ({
                      ...prev,
                      fiscalYear: String(fiscalYear),
                    }));
                    ensureBalances();
                  }}
                >
                  <Banknote className="h-3.5 w-3.5" />
                  Apply encashment
                </Button>
              }
              tabs={encashStatusTabs}
              tab={encashStatus}
              onTabChange={setEncashStatusFilter}
              recordCount={filteredEncashRows.length}
              search={encashQuery}
              onSearchChange={setEncashQuery}
              searchPlaceholder="Search logs…"
              filterTitle="Filters"
              filterSubtitle="Date range and leave type"
              filterActive={encashListFilterCount > 0}
              activeFilterCount={encashListFilterCount}
              drawerFields={
                <div className="space-y-5">
                  <FilterDrawerDateRange
                    from={draftEncashDateFrom}
                    to={draftEncashDateTo}
                    onFromChange={setDraftEncashDateFrom}
                    onToChange={setDraftEncashDateTo}
                    title="Date range"
                    hint="Filter encashment requests by submitted / period dates."
                  />
                  <SearchableFilter
                    label="Leave type"
                    value={draftEncashType}
                    onChange={setDraftEncashType}
                    options={leaveTypeOptions}
                    defaultValue="all"
                  />
                </div>
              }
              onApplyFilters={() => {
                setEncashDateFrom(draftEncashDateFrom);
                setEncashDateTo(draftEncashDateTo);
                setEncashTypeFilter(draftEncashType);
                setEncashPage(1);
              }}
              onResetFilters={() => {
                setDraftEncashDateFrom("");
                setDraftEncashDateTo("");
                setEncashDateFrom("");
                setEncashDateTo("");
                setDraftEncashType("all");
                setEncashTypeFilter("all");
                setEncashPage(1);
              }}
              onRefresh={refetch}
              columns={encashColumns}
              rows={filteredEncashRows}
              getRowKey={(row) =>
                row.encashmentId || row.requestId || row.id
              }
              minWidth="960px"
              loading={encashLoading}
              loadingLabel="Loading encashment"
              loadingHint="Fetching encashment requests…"
              emptyIcon={encashHasSearchOrFilter ? SearchX : Banknote}
              emptyTitle={
                encashHasSearchOrFilter
                  ? "Data not found"
                  : "No encashment requests"
              }
              emptyHint={
                encashHasSearchOrFilter
                  ? "No encashment logs match your search or filters. Try different dates, leave type, or clear filters."
                  : "Convert unused leave days to salary when your policy allows it."
              }
              emptyAction={
                encashHasSearchOrFilter ? (
                  <Button
                    type="button"
                    variant="outline"
                    className="h-10 rounded-xl"
                    onClick={clearEncashListFilters}
                  >
                    Clear search & filters
                  </Button>
                ) : (
                  <Button
                    type="button"
                    className="h-10 rounded-xl"
                    onClick={() => {
                      setEncashForm((prev) => ({
                        ...prev,
                        fiscalYear: String(fiscalYear),
                      }));
                      setEncashOpen(true);
                      ensureBalances();
                    }}
                  >
                    Apply encashment
                  </Button>
                )
              }
              page={encashPage}
              pageSize={encashLimit}
              total={encashTotal}
              totalPages={encashPages}
              onPageChange={setEncashPage}
              onPageSizeChange={(n) => {
                setEncashLimit(n);
                setEncashPage(1);
              }}
            />
          ) : (
            <div className="flex flex-1 flex-col items-center justify-center gap-2 px-6 py-16 text-center">
              <Banknote className="h-8 w-8 text-[var(--muted)]" />
              <p className="text-[14px] font-semibold text-[var(--text)]">
                Encashment not available
              </p>
              <p className="max-w-sm text-[12px] text-[var(--muted)]">
                {encashMessage ||
                  "Leave encashment is not enabled for your company."}
              </p>
            </div>
          )
        ) : null}

        {isBalance ? (
          <LeaveBalanceBoard
            rows={filteredBalances}
            resolveName={(row) =>
              leaveTypeName(row.leaveTypeId, leaveTypes, balances) ||
              row.leaveTypeName
            }
            loading={balanceLoading}
            search={balanceQuery}
            onSearchChange={setBalanceQuery}
            fiscalYear={fiscalYear}
            draftFiscalYear={draftFiscalYear}
            onDraftFiscalYearChange={setDraftFiscalYear}
            fiscalYearOptions={fiscalYearFilterOptions}
            currentYear={currentYear}
            filterActive={fyFilterActive}
            activeFilterCount={fyFilterActive ? 1 : 0}
            onApplyFilters={() => {
              setFiscalYear(Number(draftFiscalYear));
            }}
            onResetFilters={() => {
              clearBalanceListFilters();
            }}
            onRefresh={refetch}
            emptyFiltered={balanceHasSearchOrFilter}
            emptyTitle={
              balanceHasSearchOrFilter ? "Data not found" : "No leave balance"
            }
            emptyHint={
              balanceHasSearchOrFilter
                ? "No leave balance matches your search or fiscal year filter. Try clearing them."
                : "Leave balances for this fiscal year will show here."
            }
            emptyAction={
              balanceHasSearchOrFilter ? (
                <Button
                  type="button"
                  variant="outline"
                  className="h-10 rounded-xl"
                  onClick={clearBalanceListFilters}
                >
                  Clear search & filters
                </Button>
              ) : null
            }
          />
        ) : null}
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
              disabled={leaveTypesLoading && !applyTypeOptions.length}
            >
              <option value="">
                {leaveTypesLoading
                  ? "Loading leave types…"
                  : "Select leave type"}
              </option>
              {applyTypeOptions.map((row) => (
                <option key={row.id} value={row.id}>
                  {row.label}
                </option>
              ))}
            </select>
          </label>

          {selectedLeaveType || selectedBalance ? (
            <div className="space-y-2 rounded-2xl border border-[var(--border)] bg-[var(--panel-soft)] px-3.5 py-3">
              {selectedBalance ? (
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <span
                      className="h-2.5 w-2.5 rounded-full"
                      style={{
                        background:
                          selectedBalance.colorCode || "var(--violet)",
                      }}
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
              {selectedLeaveType ? (
                <div className="flex flex-wrap gap-1.5 pt-0.5 text-[11px] text-[var(--muted)]">
                  {selectedLeaveType.minDuration != null ? (
                    <span className="rounded-md bg-[var(--surface)] px-2 py-0.5">
                      Min {selectedLeaveType.minDuration}d
                    </span>
                  ) : null}
                  {selectedLeaveType.maxDuration != null ? (
                    <span className="rounded-md bg-[var(--surface)] px-2 py-0.5">
                      Max {selectedLeaveType.maxDuration}d
                    </span>
                  ) : null}
                  {selectedLeaveType.advanceNoticeDays != null ? (
                    <span className="rounded-md bg-[var(--surface)] px-2 py-0.5">
                      Notice {selectedLeaveType.advanceNoticeDays}d
                    </span>
                  ) : null}
                  {selectedLeaveType.allowNegativeBalance ? (
                    <span className="rounded-md bg-[var(--warning-soft)] px-2 py-0.5 text-[var(--warning)]">
                      Negative balance allowed
                    </span>
                  ) : null}
                </div>
              ) : null}
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
                    className={`rounded-xl border px-3 py-2.5 text-[13px] font-semibold transition ${active
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
                    leaveTypeName(
                      detail.leaveTypeId,
                      leaveTypes,
                      balances
                    )}
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
                    leaveTypeName(
                      encashDetail.leaveTypeId,
                      leaveTypes,
                      balances
                    )}
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
              disabled={leaveTypesLoading && !applyTypeOptions.length}
            >
              <option value="">
                {leaveTypesLoading ? "Loading…" : "Select"}
              </option>
              {applyTypeOptions.map((row) => (
                <option key={row.id} value={row.id}>
                  {row.label}
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
    </PortalPage>
  );
}
