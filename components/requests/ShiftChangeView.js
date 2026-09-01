"use client";

import {
  CheckCircle2,
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
import { ShiftSelect } from "@/components/requests/ShiftSelect";
import {
  cancelShiftChange,
  submitShiftChange,
  useAvailableShifts,
  useShiftChangeList,
  useShiftChangeStats,
} from "@/hooks/useShiftChange";
import { useMyShift } from "@/hooks/useMyShift";
import {
  countActiveDateFilters,
  dateInRange,
} from "@/lib/request-date-filter";
import { useRequestListQuery } from "@/hooks/useRequestListQuery";
import { formatDate, formatDateTime, formatTime, rowSerial } from "@/lib/format";

const fieldClass =
  "mt-1.5 h-11 w-full rounded-xl border border-[var(--border)] bg-[var(--surface)] px-3 text-[13px] text-[var(--text)] outline-none transition focus:border-[var(--violet)] focus:ring-2 focus:ring-[var(--lavender-soft)]";


function emptyForm() {
  return {
    requestedShiftId: "",
    effectiveDate: "",
    reason: "",
  };
}

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

function shiftLabel(shift, timeFormat) {
  if (!shift) return "—";
  const name = shift.shiftName || "Shift";
  const start = shift.startTime ? formatTime(shift.startTime, timeFormat) : "";
  const end = shift.endTime ? formatTime(shift.endTime, timeFormat) : "";
  if (start && end) return `${name} (${start} – ${end})`;
  return name;
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
      setCoords({
        top: rect.bottom + 6,
        left,
      });
    }

    placeMenu();

    function onDocClick(event) {
      if (
        buttonRef.current?.contains(event.target) ||
        event.target.closest?.(`[data-shift-change-menu="${requestId}"]`)
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
              data-shift-change-menu={requestId}
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

export function ShiftChangeView({
  timeFormat = "12h",
  dateFormat = "DD/MM/YYYY",
  compact = false,
  initialOpenForm = false,
  onFormOpened,
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
  const [cancellingId, setCancellingId] = useState(null);
  const [formError, setFormError] = useState("");
  const [flash, setFlash] = useState("");
  const [flashTone, setFlashTone] = useState("success");

  const { rows, meta, loading, error, refetch } = useShiftChangeList({
    status,
    page,
    limit,
  });
  const { stats, refetch: refetchStats } = useShiftChangeStats();
  const { shift: currentShift, loading: currentLoading } = useMyShift();
  const { shifts: catalogShifts, loading: shiftsLoading } = useAvailableShifts({
    enabled: showForm,
  });

  const dateFilterCount = countActiveDateFilters(dateFrom, dateTo);

  const shiftOptions = useMemo(() => {
    const map = new Map();
    for (const s of catalogShifts || []) {
      if (s?.shiftId) map.set(s.shiftId, s);
    }
    if (currentShift?.shiftId) {
      map.set(currentShift.shiftId, {
        shiftId: currentShift.shiftId,
        shiftName: currentShift.shiftName || "Current shift",
        startTime: currentShift.startTime,
        endTime: currentShift.endTime,
        shiftType: currentShift.shiftType,
      });
    }
    return Array.from(map.values());
  }, [catalogShifts, currentShift]);

  const filteredRows = useMemo(() => {
    const q = listQuery.trim().toLowerCase();
    return (rows || []).filter((row) => {
      if (
        (dateFrom || dateTo) &&
        !dateInRange(
          row.effectiveDate || row.createdAt,
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
        row.requestedShiftName,
        row.currentShiftName,
        row.effectiveDate,
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

  function resolveShiftName(shiftId, fallbackName) {
    if (fallbackName) return fallbackName;
    const found = shiftOptions.find((s) => s.shiftId === shiftId);
    return found?.shiftName || (shiftId ? String(shiftId).slice(0, 8) + "…" : "—");
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
        id: "effective",
        header: "Effective",
        cellClassName: "whitespace-nowrap font-medium text-[var(--text)]",
        cell: (row) => formatDate(row.effectiveDate, dateFormat),
      },
      {
        id: "requestedShift",
        header: "Requested shift",
        cellClassName: "whitespace-nowrap text-[var(--text)]",
        cell: (row) =>
          resolveShiftName(row.requestedShiftId, row.requestedShiftName),
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
        id: "action",
        header: "Action",
        cell: (row) => {
          const isPending =
            String(row.status || "").toLowerCase() === "pending";
          return (
            <RequestRowActions
              requestId={row.requestId}
              canCancel={isPending}
              onView={() => setSelected(row)}
              onCancel={() => handleCancel(row.requestId)}
            />
          );
        },
      },
    ],
    // handleCancel / resolveShiftName via closure; refresh with list state
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [currentPage, limit, dateFormat, timeFormat, shiftOptions]
  );

  function refreshAll() {
    refetch();
    refetchStats();
  }

  async function handleSubmit(event) {
    event.preventDefault();
    setFormError("");

    if (!form.requestedShiftId) {
      setFormError("Please select the shift you want.");
      return;
    }
    if (!form.effectiveDate) {
      setFormError("Effective date is required.");
      return;
    }
    if (!form.reason.trim()) {
      setFormError("Please provide a reason for the shift change.");
      return;
    }
    if (
      currentShift?.shiftId &&
      form.requestedShiftId === currentShift.shiftId
    ) {
      setFormError("Requested shift must be different from your current shift.");
      return;
    }

    setSubmitting(true);
    try {
      const res = await submitShiftChange({
        requestedShiftId: form.requestedShiftId,
        effectiveDate: form.effectiveDate,
        reason: form.reason.trim(),
      });
      setFlashTone("success");
      setFlash(
        res?.message ||
          "Shift change request submitted (pending approval)."
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
    const ok = window.confirm(
      "Cancel this pending shift-change request?"
    );
    if (!ok) return;

    setCancellingId(requestId);
    try {
      const res = await cancelShiftChange(requestId);
      setFlashTone("success");
      setFlash(res?.message || "Request cancelled");
      if (selected?.requestId === requestId) setSelected(null);
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
      hideHeader={compact}
      title="Shift Change"
      subtitle={
        <>
          Request a different shift from a chosen effective date. Pending
          requests can be cancelled anytime.
          {!currentLoading && currentShift?.hasShift ? (
            <span className="mt-2 block text-[12px] text-[var(--text)]">
              Current:{" "}
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
              Shift change requests
            </h2>
            <p className="mt-0.5 text-[12px] text-[var(--muted)]">
              Submit and track requests to change your assigned shift
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
        title="Shift Change Logs"
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
            hint="Apply uses these dates for shift change logs."
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
        loadingHint="Fetching shift-change requests…"
        error={error}
        emptyIcon={Inbox}
        emptyTitle={`No ${status === "all" ? "" : `${status} `}requests`}
        emptyHint="Submit a request when you need to move to a different shift."
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
        title="Request shift change"
        subtitle="Pick the new shift, effective date, and reason"
        wide
      >
        <form className="space-y-4 pb-8" onSubmit={handleSubmit}>
          {currentShift?.hasShift ? (
            <div className="rounded-xl border border-dashed border-[var(--border)] bg-[var(--panel-soft)] px-3 py-2.5 text-[12px] text-[var(--muted)]">
              Current shift:{" "}
              <span className="font-semibold text-[var(--text)]">
                {shiftLabel(currentShift, timeFormat)}
              </span>
            </div>
          ) : null}

          <div>
            <span className="block text-[12px] font-medium text-[var(--muted)]">
              Requested shift
            </span>
            <ShiftSelect
              shifts={shiftOptions}
              value={form.requestedShiftId}
              currentShiftId={currentShift?.shiftId || null}
              timeFormat={timeFormat}
              loading={shiftsLoading}
              disabled={submitting}
              placeholder="Choose the shift you want…"
              onChange={(id) =>
                setForm((prev) => ({
                  ...prev,
                  requestedShiftId: id,
                }))
              }
            />
          </div>

          {!shiftsLoading &&
          shiftOptions.filter((s) => s.shiftId !== currentShift?.shiftId)
            .length === 0 ? (
            <p className="text-[12px] text-[var(--warning)]">
              No other shifts available to request right now.
            </p>
          ) : null}

          <label className="block text-[12px] font-medium text-[var(--muted)]">
            Effective date
            <input
              type="date"
              required
              className={fieldClass}
              value={form.effectiveDate}
              onChange={(e) =>
                setForm((prev) => ({
                  ...prev,
                  effectiveDate: e.target.value,
                }))
              }
            />
          </label>

          <label className="block text-[12px] font-medium text-[var(--muted)]">
            Reason
            <textarea
              required
              rows={4}
              placeholder="e.g. Personal reason / commute timing"
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
        title="Shift change details"
        subtitle={
          selected?.requestId
            ? `Request ${String(selected.requestId).slice(0, 8)}…`
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
                    {selected.statusLabel || selected.status || "—"}
                  </span>
                </dd>
              </div>
              <div>
                <dt className="text-[11px] font-semibold uppercase tracking-wide text-[var(--muted)]">
                  Effective date
                </dt>
                <dd className="mt-1 font-medium text-[var(--text)]">
                  {formatDate(selected.effectiveDate, dateFormat)}
                </dd>
              </div>
              <div>
                <dt className="text-[11px] font-semibold uppercase tracking-wide text-[var(--muted)]">
                  Requested shift
                </dt>
                <dd className="mt-1 text-[var(--text)]">
                  {resolveShiftName(
                    selected.requestedShiftId,
                    selected.requestedShiftName
                  )}
                </dd>
              </div>
              <div>
                <dt className="text-[11px] font-semibold uppercase tracking-wide text-[var(--muted)]">
                  Current shift (at request)
                </dt>
                <dd className="mt-1 text-[var(--text)]">
                  {resolveShiftName(
                    selected.currentShiftId,
                    selected.currentShiftName
                  )}
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
                    ? formatDateTime(
                        selected.createdAt,
                        dateFormat,
                        timeFormat
                      )
                    : "—"}
                </dd>
              </div>
            </dl>

            {String(selected.status || "").toLowerCase() === "pending" ? (
              <Button
                type="button"
                variant="outline"
                className="h-11 w-full rounded-xl text-[var(--danger)]"
                disabled={cancellingId === selected.requestId}
                onClick={() => handleCancel(selected.requestId)}
              >
                <XCircle className="h-4 w-4" />
                {cancellingId === selected.requestId
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
