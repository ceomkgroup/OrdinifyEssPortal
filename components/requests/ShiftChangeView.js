"use client";

import {
  ChevronLeft,
  ChevronRight,
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
import { Button } from "@/components/ui/Button";
import { Card } from "@/components/ui/Card";
import { FlashBanner } from "@/components/ui/FlashBanner";
import {
  ListFiltersBar,
  REQUEST_STATUS_OPTIONS,
} from "@/components/ui/ListFilters";
import { SlideOver } from "@/components/ui/SlideOver";
import { PageLoader } from "@/components/ui/Spinner";
import { ShiftSelect } from "@/components/requests/ShiftSelect";
import {
  cancelShiftChange,
  submitShiftChange,
  useAvailableShifts,
  useShiftChangeList,
} from "@/hooks/useShiftChange";
import { useMyShift } from "@/hooks/useMyShift";
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
  /** Hide page hero when embedded under My Shift */
  compact = false,
  /** Open the apply form on mount (e.g. from My Shift CTA) */
  initialOpenForm = false,
  onFormOpened,
}) {
  const [status, setStatus] = useState("all");
  const [page, setPage] = useState(1);
  const [limit] = useState(10);
  const [listQuery, setListQuery] = useState("");
  const [filterBusy, setFilterBusy] = useState(false);
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
  const { shift: currentShift, loading: currentLoading } = useMyShift();
  const { shifts: catalogShifts, loading: shiftsLoading } = useAvailableShifts({
    enabled: showForm,
  });

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
    if (!q) return rows || [];
    return (rows || []).filter((row) => {
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
  }, [rows, listQuery]);

  const total = Number(meta?.total) || 0;
  const currentPage = Number(meta?.page) || page;
  const totalPages = Math.max(1, Number(meta?.totalPages) || 1);

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
      refetch();
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
      refetch();
    } catch (err) {
      setFlashTone("danger");
      setFlash(err.message || "Failed to cancel request.");
    } finally {
      setCancellingId(null);
    }
  }

  function resolveShiftName(shiftId, fallbackName) {
    if (fallbackName) return fallbackName;
    const found = shiftOptions.find((s) => s.shiftId === shiftId);
    return found?.shiftName || (shiftId ? String(shiftId).slice(0, 8) + "…" : "—");
  }

  return (
    <div className="space-y-4">
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
              onClick={refetch}
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
      ) : (
        <section className="overflow-hidden rounded-[14px] border border-[var(--border)] bg-[var(--surface)] shadow-[var(--card-shadow)]">
          <div className="flex flex-col gap-4 bg-gradient-to-br from-[var(--lavender-soft)] via-[var(--surface)] to-[var(--surface)] p-4 md:flex-row md:items-center md:justify-between md:p-5">
            <div className="flex items-start gap-3">
              <span className="inline-flex h-12 w-12 shrink-0 items-center justify-center rounded-2xl bg-[var(--violet)] text-white shadow-sm">
                <RefreshCw className="h-6 w-6" />
              </span>
              <div>
                <h1 className="font-[family-name:var(--font-heading)] text-[24px] font-semibold text-[var(--text)]">
                  Shift Change
                </h1>
                <p className="mt-1 max-w-xl text-[13px] leading-relaxed text-[var(--muted)]">
                  Request a different shift from a chosen effective date. Pending
                  requests can be cancelled anytime.
                </p>
                {!currentLoading && currentShift?.hasShift ? (
                  <p className="mt-2 text-[12px] text-[var(--text)]">
                    Current:{" "}
                    <span className="font-semibold">
                      {shiftLabel(currentShift, timeFormat)}
                    </span>
                  </p>
                ) : null}
              </div>
            </div>
            <div className="flex flex-wrap gap-2 md:justify-end">
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
        </section>
      )}

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
              Track pending, approved and cancelled shift-change requests
            </p>
          </div>
          <ListFiltersBar
            search={listQuery}
            onSearchChange={setListQuery}
            searchPlaceholder="Search shift, reason, status…"
            status={status}
            onStatusChange={(next) => {
              setStatus(next);
              setPage(1);
            }}
            statusOptions={REQUEST_STATUS_OPTIONS}
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
                ? "Fetching shift-change requests…"
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
              Submit a request when you need to move to a different shift.
            </p>
            <Button
              type="button"
              className="mt-4 h-10 rounded-xl"
              onClick={() => setShowForm(true)}
            >
              <Plus className="h-4 w-4" />
              New request
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
                      Submitted
                    </th>
                    <th className="whitespace-nowrap px-3 py-2.5 font-semibold">
                      Effective
                    </th>
                    <th className="whitespace-nowrap px-3 py-2.5 font-semibold">
                      Requested shift
                    </th>
                    <th className="px-3 py-2.5 font-semibold">Reason</th>
                    <th className="whitespace-nowrap px-3 py-2.5 font-semibold">
                      Status
                    </th>
                    <th className="px-3 py-2.5 font-semibold">Action</th>
                  </tr>
                </thead>
                <tbody>
                  {filteredRows.map((row, index) => {
                    const label = row.statusLabel || row.status || "—";
                    const isPending =
                      String(row.status || "").toLowerCase() === "pending";
                    return (
                      <tr
                        key={row.requestId}
                        className="border-b border-[var(--border)] last:border-0 hover:bg-[var(--panel-soft)]/50"
                      >
                        <td className="px-3 py-3 tabular-nums text-[var(--muted)]">
                          {rowSerial(index, page, limit)}
                        </td>
                        <td className="whitespace-nowrap px-3 py-3 text-[var(--text)]">
                          {row.createdAt
                            ? formatDateTime(
                                row.createdAt,
                                dateFormat,
                                timeFormat
                              )
                            : "—"}
                        </td>
                        <td className="whitespace-nowrap px-3 py-3 font-medium text-[var(--text)]">
                          {formatDate(row.effectiveDate, dateFormat)}
                        </td>
                        <td className="whitespace-nowrap px-3 py-3 text-[var(--text)]">
                          {resolveShiftName(
                            row.requestedShiftId,
                            row.requestedShiftName
                          )}
                        </td>
                        <td className="max-w-[220px] truncate px-3 py-3 text-[var(--muted)]">
                          {row.reason || "—"}
                        </td>
                        <td className="whitespace-nowrap px-3 py-3">
                          <span
                            className={`inline-flex rounded-full border px-2.5 py-0.5 text-[11px] font-semibold capitalize ${statusTone(row.status)}`}
                          >
                            {label}
                          </span>
                        </td>
                        <td className="px-3 py-3">
                          <RequestRowActions
                            requestId={row.requestId}
                            canCancel={isPending}
                            onView={() => setSelected(row)}
                            onCancel={() => handleCancel(row.requestId)}
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
    </div>
  );
}
