"use client";

import { useEffect, useMemo, useState } from "react";
import {
  Check,
  Eye,
  Inbox,
  RefreshCw,
  X,
} from "lucide-react";
import { decideTeamApproval } from "@/api/team";
import { Avatar } from "@/components/ui/Avatar";
import { Button } from "@/components/ui/Button";
import { FlashBanner } from "@/components/ui/FlashBanner";
import { PortalPage } from "@/components/ui/PortalPage";
import { SlideOver } from "@/components/ui/SlideOver";
import { TablePanel } from "@/components/ui/TablePanel";
import {
  DetailField,
  FieldBlock,
  HintBanner,
  PersonHero,
  SectionCard,
} from "@/components/team/TeamDrawer";
import { TeamRowMenu } from "@/components/team/TeamRowMenu";
import { useTeam } from "@/components/team/TeamCapabilitiesProvider";
import { SearchableFilter } from "@/components/attendance/AttendanceStatusFilter";
import { FilterDrawerDateRange } from "@/components/ui/FilterDrawerDateRange";
import { useCompanySettings } from "@/hooks/useCompanySettings";
import { useTeamApprovalList } from "@/hooks/useTeamApprovals";
import { usePortalQuery } from "@/hooks/usePortalQuery";
import { getApiErrorMessage } from "@/lib/api-error";
import {
  formatCurrency,
  formatDate,
  formatDateTime,
  formatTime,
  rowSerial,
} from "@/lib/format";
import {
  countActiveDateFilters,
  rowMatchesDateRange,
} from "@/lib/request-date-filter";
import { getTeamApprovalType } from "@/lib/team-nav";

const fieldClass =
  "h-11 w-full rounded-xl border border-[var(--border)] bg-[var(--surface)] px-3 text-[13px] text-[var(--text)] outline-none transition focus:border-[var(--violet)] focus:ring-2 focus:ring-[var(--lavender-soft)]";

function formatMinutes(totalMinutes) {
  if (totalMinutes == null || Number.isNaN(Number(totalMinutes))) return "—";
  const mins = Math.max(0, Math.round(Number(totalMinutes)));
  const h = Math.floor(mins / 60);
  const m = mins % 60;
  if (h > 0 && m > 0) return `${h}h ${m}m`;
  if (h > 0) return `${h}h`;
  return `${m}m`;
}

function periodLabel(fromDate, toDate, dateFormat) {
  if (!fromDate && !toDate) return "—";
  const from = formatDate(fromDate, dateFormat);
  const to = formatDate(toDate, dateFormat);
  if (!fromDate || !toDate || from === to) return from || to;
  return `${from} – ${to}`;
}

function emptyApprovalFilters() {
  return {
    dateFrom: "",
    dateTo: "",
    employeeId: "all",
    leaveType: "all",
    shiftName: "all",
    location: "all",
  };
}

function uniqueFilterOptions(rows, getValue, getLabel) {
  const seen = new Map();
  for (const row of rows) {
    const value = String(getValue(row) || "").trim();
    if (!value || seen.has(value)) continue;
    seen.set(value, {
      value,
      label: getLabel ? getLabel(row, value) : value,
    });
  }
  return Array.from(seen.values()).sort((a, b) =>
    a.label.localeCompare(b.label)
  );
}

function rowEmployeeKey(row) {
  return String(row.employeeId || row.employeeCode || row.employeeName || "");
}

function summaryFor(typeKey, row, dateFormat, timeFormat, currency) {
  switch (typeKey) {
    case "leave":
      return `${row.leaveTypeName || "Leave"} · ${row.totalDays ?? "—"}d`;
    case "wfh":
    case "compOff":
      return periodLabel(row.fromDate, row.toDate, dateFormat);
    case "onDuty":
      return [row.location, row.purpose].filter(Boolean).join(" · ") || "On duty";
    case "shiftChange":
      return `${row.currentShiftName || "—"} → ${row.requestedShiftName || "—"}`;
    case "overtime":
      return `${formatDate(row.attendanceDate, dateFormat)} · ${formatMinutes(row.overtimeMinutes)}`;
    case "loan":
    case "advance":
    case "expenseClaim":
      return formatCurrency(
        row.amount ?? row.loanAmount ?? row.totalAmount,
        currency
      );
    case "attendanceChange":
      return `${formatDate(row.attendanceDate, dateFormat)} · ${formatTime(row.checkInTime, timeFormat)}–${formatTime(row.checkOutTime, timeFormat)}`;
    case "attendanceLog":
      return formatDate(row.attendanceDate || row.logDate || row.date, dateFormat);
    default:
      return row.reason || "—";
  }
}

function RowActions({ requestId, canDecide, onView, onApprove, onReject }) {
  const items = [
    {
      label: "View",
      icon: <Eye className="h-4 w-4 text-[var(--violet)]" />,
      onClick: onView,
    },
  ];
  if (canDecide) {
    items.push(
      {
        label: "Approve",
        icon: <Check className="h-4 w-4" />,
        tone: "success",
        onClick: onApprove,
      },
      {
        label: "Reject",
        icon: <X className="h-4 w-4" />,
        tone: "danger",
        onClick: onReject,
      }
    );
  }
  return <TeamRowMenu menuId={requestId} items={items} />;
}

function requestFacts(typeKey, row, dateFormat, timeFormat, currency) {
  const facts = [];
  if (row.leaveTypeName) {
    facts.push({ label: "Leave type", value: row.leaveTypeName });
  }
  if (row.totalDays != null && row.totalDays !== "") {
    facts.push({ label: "Days", value: `${row.totalDays}d` });
  }
  if (row.fromDate || row.toDate) {
    facts.push({
      label: "Period",
      value: periodLabel(row.fromDate, row.toDate, dateFormat),
      wide: true,
    });
  }
  if (row.effectiveDate) {
    facts.push({
      label: "Effective",
      value: formatDate(row.effectiveDate, dateFormat),
    });
  }
  if (row.attendanceDate || row.logDate || row.date) {
    facts.push({
      label: "Attendance date",
      value: formatDate(
        row.attendanceDate || row.logDate || row.date,
        dateFormat
      ),
    });
  }
  if (row.checkInTime || row.checkOutTime) {
    facts.push({
      label: "Requested times",
      value: `${formatTime(row.checkInTime, timeFormat)} – ${formatTime(row.checkOutTime, timeFormat)}`,
      wide: true,
    });
  }
  if (row.overtimeMinutes != null) {
    facts.push({
      label: "Overtime",
      value: formatMinutes(row.overtimeMinutes),
    });
  }
  if (row.currentShiftName || row.requestedShiftName) {
    facts.push({
      label: "Shift change",
      value: `${row.currentShiftName || "—"} → ${row.requestedShiftName || "—"}`,
      wide: true,
    });
  }
  if (row.claimNumber) {
    facts.push({ label: "Claim number", value: row.claimNumber });
  }
  if (row.amount != null || row.loanAmount != null || row.totalAmount != null) {
    facts.push({
      label: "Amount",
      value: formatCurrency(
        row.amount ?? row.loanAmount ?? row.totalAmount,
        currency
      ),
    });
  }
  if (row.location) facts.push({ label: "Location", value: row.location });
  if (row.purpose) facts.push({ label: "Purpose", value: row.purpose, wide: true });
  if (row.createdAt) {
    facts.push({
      label: "Submitted",
      value: formatDateTime(row.createdAt, dateFormat, timeFormat),
      wide: true,
    });
  }
  return facts;
}

export function TeamApprovalsView() {
  const { settings } = useCompanySettings();
  const dateFormat = settings.dateFormat || "DD/MM/YYYY";
  const timeFormat = settings.timeFormat || "12h";
  const currency = settings.currency || "PKR";
  const { visibleApprovalTypes, canApplyType } = useTeam();
  const { searchParams, replaceQuery } = usePortalQuery();

  const typeFromUrl = searchParams.get("type") || "";
  const idFromUrl = searchParams.get("id") || "";
  const firstKey = visibleApprovalTypes[0]?.key || "";
  const activeKey = visibleApprovalTypes.some((item) => item.key === typeFromUrl)
    ? typeFromUrl
    : firstKey;
  const activeType = getTeamApprovalType(activeKey);
  const canDecide = canApplyType(activeKey);

  const { rows, meta, loading, error, refetch, removeRow } = useTeamApprovalList(activeKey, {
    enabled: Boolean(activeKey),
  });

  const [flash, setFlash] = useState("");
  const [flashTone, setFlashTone] = useState("success");
  const [search, setSearch] = useState("");
  const [appliedFilters, setAppliedFilters] = useState(emptyApprovalFilters);
  const [draftFilters, setDraftFilters] = useState(emptyApprovalFilters);
  const [selected, setSelected] = useState(null);
  const [mode, setMode] = useState("view");
  const [comments, setComments] = useState("");
  const [rejectionReason, setRejectionReason] = useState("");
  const [approvedMinutes, setApprovedMinutes] = useState("");
  const [payoutMode, setPayoutMode] = useState("cash");
  const [approvedAmount, setApprovedAmount] = useState("");
  const [saving, setSaving] = useState(false);
  const [formError, setFormError] = useState("");

  useEffect(() => {
    if (!idFromUrl || !rows.length) return undefined;
    const match = rows.find((row) => row.id === idFromUrl);
    if (!match) return undefined;
    let alive = true;
    queueMicrotask(() => {
      if (!alive) return;
      setSelected(match);
      setMode("view");
    });
    return () => {
      alive = false;
    };
  }, [idFromUrl, rows]);

  const employeeOptions = useMemo(
    () => [
      { value: "all", label: "All employees" },
      ...uniqueFilterOptions(
        rows,
        rowEmployeeKey,
        (row) =>
          row.employeeName
            ? `${row.employeeName}${
                row.employeeCode ? ` (${row.employeeCode})` : ""
              }`
            : row.employeeCode || rowEmployeeKey(row)
      ),
    ],
    [rows]
  );

  const leaveTypeOptions = useMemo(
    () => [
      { value: "all", label: "All leave types" },
      ...uniqueFilterOptions(rows, (row) => row.leaveTypeName),
    ],
    [rows]
  );

  const shiftOptions = useMemo(
    () => [
      { value: "all", label: "All shifts" },
      ...uniqueFilterOptions(rows, (row) => row.requestedShiftName),
    ],
    [rows]
  );

  const locationOptions = useMemo(
    () => [
      { value: "all", label: "All locations" },
      ...uniqueFilterOptions(rows, (row) => row.location),
    ],
    [rows]
  );

  const activeFilterCount = useMemo(() => {
    let count = countActiveDateFilters(
      appliedFilters.dateFrom,
      appliedFilters.dateTo
    );
    if (appliedFilters.employeeId !== "all") count += 1;
    if (activeKey === "leave" && appliedFilters.leaveType !== "all") count += 1;
    if (activeKey === "shiftChange" && appliedFilters.shiftName !== "all") {
      count += 1;
    }
    if (activeKey === "onDuty" && appliedFilters.location !== "all") count += 1;
    return count;
  }, [activeKey, appliedFilters]);

  const filteredRows = useMemo(() => {
    const q = search.trim().toLowerCase();
    return rows.filter((row) => {
      if (
        appliedFilters.employeeId !== "all" &&
        rowEmployeeKey(row) !== appliedFilters.employeeId
      ) {
        return false;
      }
      if (
        activeKey === "leave" &&
        appliedFilters.leaveType !== "all" &&
        String(row.leaveTypeName || "") !== appliedFilters.leaveType
      ) {
        return false;
      }
      if (
        activeKey === "shiftChange" &&
        appliedFilters.shiftName !== "all" &&
        String(row.requestedShiftName || "") !== appliedFilters.shiftName
      ) {
        return false;
      }
      if (
        activeKey === "onDuty" &&
        appliedFilters.location !== "all" &&
        String(row.location || "") !== appliedFilters.location
      ) {
        return false;
      }
      if (
        !rowMatchesDateRange(row, appliedFilters.dateFrom, appliedFilters.dateTo, [
          "createdAt",
          "submittedAt",
          "attendanceDate",
          "effectiveDate",
          "workDate",
        ])
      ) {
        return false;
      }
      if (!q) return true;
      return [
        row.employeeName,
        row.employeeCode,
        row.reason,
        row.claimNumber,
        row.leaveTypeName,
        row.location,
        row.purpose,
      ]
        .filter(Boolean)
        .join(" ")
        .toLowerCase()
        .includes(q);
    });
  }, [activeKey, appliedFilters, rows, search]);

  function resetApprovalFilters() {
    const cleared = emptyApprovalFilters();
    setAppliedFilters(cleared);
    setDraftFilters(cleared);
  }

  function openRow(row, nextMode = "view") {
    setSelected(row);
    setMode(nextMode);
    setComments("");
    setRejectionReason("");
    setFormError("");
    setApprovedMinutes(
      row?.overtimeMinutes != null ? String(row.overtimeMinutes) : ""
    );
    setPayoutMode("cash");
    setApprovedAmount(
      row?.amount != null ||
        row?.loanAmount != null ||
        row?.totalAmount != null
        ? String(row.amount ?? row.loanAmount ?? row.totalAmount)
        : ""
    );
  }

  function closePanel() {
    setSelected(null);
    setMode("view");
    setFormError("");
    if (idFromUrl) replaceQuery({ id: "" });
  }

  async function submitDecision(action) {
    if (!selected || !activeType) return;
    setFormError("");
    if (action === "rejected") {
      const reason =
        activeType.decisionKind === "leave"
          ? rejectionReason.trim() || comments.trim()
          : comments.trim();
      if (!reason) {
        setFormError("Add a remark before rejecting.");
        return;
      }
    }
    setSaving(true);
    try {
      const payload = { action, comments: comments.trim() || undefined };
      if (action === "rejected" && activeType.decisionKind === "leave") {
        payload.rejectionReason = rejectionReason.trim() || comments.trim();
      }
      if (action === "approved" && activeType.decisionKind === "overtime") {
        payload.approvedMinutes = Number(approvedMinutes) || 0;
        payload.payoutMode = payoutMode || "cash";
      }
      if (
        action === "approved" &&
        (activeType.decisionKind === "loan" ||
          activeType.decisionKind === "expense")
      ) {
        payload.approvedAmount = Number(approvedAmount) || 0;
      }
      await decideTeamApproval(activeKey, selected.id, payload);
      const decidedId = selected.id;
      setFlash(
        action === "approved"
          ? "Approved. It is off your inbox — the employee will see it on their request."
          : "Rejected. It is off your inbox — the employee will see it on their request."
      );
      setFlashTone(action === "approved" ? "success" : "danger");
      closePanel();
      removeRow(decidedId);
    } catch (err) {
      setFormError(getApiErrorMessage(err, "Could not record this decision."));
    } finally {
      setSaving(false);
    }
  }

  const columns = useMemo(
    () => [
      {
        id: "serial",
        header: "#",
        headerClassName: "w-12",
        cellClassName: "whitespace-nowrap tabular-nums text-[var(--muted)]",
        cell: (_row, { index }) => rowSerial(index, 1, filteredRows.length),
      },
      {
        id: "employee",
        header: "Employee",
        cell: (row) => (
          <div className="flex min-w-0 items-center gap-2.5">
            <Avatar
              name={row.employeeName}
              person={row}
              size={32}
            />
            <div className="min-w-0">
              <p className="truncate font-semibold text-[var(--text)]">
                {row.employeeName || "—"}
              </p>
            </div>
          </div>
        ),
      },
      {
        id: "code",
        header: "Code",
        cell: (row) =>
          row.employeeCode ? (
            <span className="inline-flex rounded-full border border-[var(--border)] bg-[var(--panel-soft)] px-2.5 py-1 text-[11px] font-semibold tabular-nums text-[var(--text)]">
              {row.employeeCode}
            </span>
          ) : (
            <span className="text-[var(--muted)]">—</span>
          ),
      },
      {
        id: "summary",
        header: "Details",
        cellClassName: "min-w-[180px]",
        cell: (row) => (
          <span className="text-[13px] text-[var(--text)]">
            {summaryFor(activeKey, row, dateFormat, timeFormat, currency)}
          </span>
        ),
      },
      {
        id: "reason",
        header: "Reason",
        cellClassName: "max-w-[220px] truncate text-[var(--muted)]",
        cell: (row) => (
          <span title={row.reason || ""}>{row.reason || "—"}</span>
        ),
      },
      {
        id: "level",
        header: "Level",
        cellClassName: "whitespace-nowrap text-[var(--muted)]",
        cell: (row) =>
          row.statusLabel ||
          (row.currentLevel != null ? `L${row.currentLevel}` : "—"),
      },
      {
        id: "created",
        header: "Submitted",
        cellClassName: "whitespace-nowrap text-[var(--muted)]",
        cell: (row) => formatDateTime(row.createdAt, dateFormat, timeFormat),
      },
      {
        id: "action",
        header: "Action",
        headerClassName: "w-16 text-right",
        cellClassName: "text-right",
        cell: (row) => (
          <RowActions
            requestId={row.id}
            canDecide={canDecide}
            onView={() => openRow(row, "view")}
            onApprove={() => openRow(row, "approve")}
            onReject={() => openRow(row, "reject")}
          />
        ),
      },
    ],
    [activeKey, canDecide, currency, dateFormat, filteredRows.length, timeFormat]
  );

  const tabs = visibleApprovalTypes.map((item) => ({
    value: item.key,
    label: `${item.title}${
      item.key === activeKey && !loading ? ` (${meta.total})` : ""
    }`,
  }));

  return (
    <PortalPage
      fill
      title="Team approvals"
      subtitle="Pending only. After you approve or reject, it leaves this inbox. The employee keeps the record on their own Leave / Requests page."
      error={error}
      actions={
        <Button
          type="button"
          variant="outline"
          className="h-10 rounded-xl"
          onClick={refetch}
          disabled={loading}
        >
          <RefreshCw className="h-4 w-4" />
          Refresh
        </Button>
      }
    >
      {flash ? (
        <FlashBanner
          message={flash}
          tone={flashTone}
          duration={4000}
          onDismiss={() => setFlash("")}
        />
      ) : null}

      <TablePanel
        title="Pending team requests"
        titleCount={meta.total}
        titleCountLabel="Pending"
        tabs={tabs}
        tab={activeKey}
        onTabChange={(next) => {
          setSearch("");
          resetApprovalFilters();
          closePanel();
          replaceQuery({ type: next, id: "" });
        }}
        recordCount={
          search.trim() || activeFilterCount > 0
            ? filteredRows.length
            : meta.total
        }
        search={search}
        onSearchChange={setSearch}
        searchPlaceholder="Search employee, code, reason…"
        filterTitle="Filters"
        filterSubtitle="Date range, employee, and type-specific filters"
        filterActive={activeFilterCount > 0}
        activeFilterCount={activeFilterCount}
        drawerFields={
          <div className="space-y-5">
            <SearchableFilter
              label="Employee"
              value={draftFilters.employeeId}
              onChange={(next) =>
                setDraftFilters((prev) => ({ ...prev, employeeId: next }))
              }
              options={employeeOptions}
              defaultValue="all"
            />
            {activeKey === "leave" && leaveTypeOptions.length > 1 ? (
              <SearchableFilter
                label="Leave type"
                value={draftFilters.leaveType}
                onChange={(next) =>
                  setDraftFilters((prev) => ({ ...prev, leaveType: next }))
                }
                options={leaveTypeOptions}
                defaultValue="all"
              />
            ) : null}
            {activeKey === "shiftChange" && shiftOptions.length > 1 ? (
              <SearchableFilter
                label="Requested shift"
                value={draftFilters.shiftName}
                onChange={(next) =>
                  setDraftFilters((prev) => ({ ...prev, shiftName: next }))
                }
                options={shiftOptions}
                defaultValue="all"
              />
            ) : null}
            {activeKey === "onDuty" && locationOptions.length > 1 ? (
              <SearchableFilter
                label="Location"
                value={draftFilters.location}
                onChange={(next) =>
                  setDraftFilters((prev) => ({ ...prev, location: next }))
                }
                options={locationOptions}
                defaultValue="all"
              />
            ) : null}
            <FilterDrawerDateRange
              from={draftFilters.dateFrom}
              to={draftFilters.dateTo}
              onFromChange={(next) =>
                setDraftFilters((prev) => ({ ...prev, dateFrom: next }))
              }
              onToChange={(next) =>
                setDraftFilters((prev) => ({ ...prev, dateTo: next }))
              }
              hint="Apply uses period, attendance, or submitted date."
            />
          </div>
        }
        onApplyFilters={() => setAppliedFilters({ ...draftFilters })}
        onResetFilters={resetApprovalFilters}
        onRefresh={refetch}
        columns={columns}
        rows={filteredRows}
        getRowKey={(row) => row.id}
        minWidth="980px"
        loading={loading}
        loadingLabel="Loading team requests"
        loadingHint="Fetching pending approvals for this type…"
        emptyIcon={Inbox}
        emptyTitle="No pending requests"
        emptyHint={
          meta.allowed === false
            ? "You do not have access to this approval type."
            : search.trim() || activeFilterCount > 0
              ? "No pending requests match these filters."
              : "When your team submits this request type, it will land here until you decide. Approved items are not kept in this list."
        }
        showPagination={false}
      />

      <SlideOver
        open={Boolean(selected)}
        onClose={closePanel}
        wide
        title={
          mode === "approve"
            ? "Approve request"
            : mode === "reject"
              ? "Reject request"
              : `${activeType?.title || "Request"} details`
        }
        subtitle={
          selected
            ? [
                selected.employeeName,
                summaryFor(
                  activeKey,
                  selected,
                  dateFormat,
                  timeFormat,
                  currency
                ),
              ]
                .filter(Boolean)
                .join(" · ")
            : ""
        }
        footer={
          selected && canDecide ? (
            <div className="flex flex-col gap-2">
              {formError ? (
                <p className="rounded-xl border border-[var(--danger)]/20 bg-[var(--danger-soft)] px-3 py-2 text-[12px] text-[var(--danger)]">
                  {formError}
                </p>
              ) : null}
              {mode === "view" ? (
                <div className="flex justify-end gap-2">
                  <Button
                    type="button"
                    variant="outline"
                    className="h-11 min-w-[100px] rounded-xl text-[var(--danger)]"
                    onClick={() => setMode("reject")}
                  >
                    <X className="h-4 w-4" />
                    Reject
                  </Button>
                  <Button
                    type="button"
                    className="h-11 min-w-[120px] rounded-xl"
                    onClick={() => setMode("approve")}
                  >
                    <Check className="h-4 w-4" />
                    Approve
                  </Button>
                </div>
              ) : (
                <div className="flex justify-end gap-2">
                  <Button
                    type="button"
                    variant="outline"
                    className="h-11 min-w-[100px] rounded-xl"
                    onClick={() => setMode("view")}
                    disabled={saving}
                  >
                    Back
                  </Button>
                  <Button
                    type="button"
                    className={`h-11 min-w-[150px] rounded-xl ${
                      mode === "reject"
                        ? "border-[var(--danger)] bg-[var(--danger)] !text-white"
                        : ""
                    }`}
                    disabled={saving}
                    onClick={() =>
                      submitDecision(mode === "reject" ? "rejected" : "approved")
                    }
                  >
                    {saving
                      ? "Saving…"
                      : mode === "reject"
                        ? "Confirm reject"
                        : "Confirm approve"}
                  </Button>
                </div>
              )}
            </div>
          ) : null
        }
      >
        {selected ? (
          <div className="space-y-4 pb-2">
            <PersonHero
              person={selected}
              meta={selected.relationship}
              badge={
                <span className="inline-flex rounded-full bg-[var(--lavender-soft)] px-2.5 py-1 text-[11px] font-semibold text-[var(--violet)]">
                  {activeType?.title || "Request"}
                  {selected.statusLabel || selected.currentLevel != null
                    ? ` · ${selected.statusLabel || `L${selected.currentLevel}`}`
                    : " · Pending"}
                </span>
              }
            />

            <SectionCard kicker="Overview" title="Request details">
              <dl className="grid grid-cols-1 gap-x-6 gap-y-4 sm:grid-cols-2">
                {requestFacts(
                  activeKey,
                  selected,
                  dateFormat,
                  timeFormat,
                  currency
                ).map((fact) => (
                  <DetailField
                    key={fact.label}
                    label={fact.label}
                    className={fact.wide ? "sm:col-span-2" : ""}
                  >
                    {fact.value}
                  </DetailField>
                ))}
                <DetailField label="Reason" className="sm:col-span-2">
                  <p className="whitespace-pre-wrap font-normal leading-relaxed text-[var(--text)]">
                    {selected.reason || "—"}
                  </p>
                </DetailField>
              </dl>
            </SectionCard>

            {mode !== "view" ? (
              <SectionCard
                kicker="Decision"
                title={mode === "reject" ? "Reject this request" : "Approve this request"}
              >
                <div className="space-y-4">
                  <HintBanner icon={mode === "reject" ? X : Check}>
                    {mode === "reject"
                      ? "A remark is required. After reject, this leaves your inbox — the employee keeps the record on their own page."
                      : "After approve, this leaves your inbox. The employee will see the decision on their own request."}
                  </HintBanner>

                  {mode === "approve" &&
                  activeType?.decisionKind === "overtime" ? (
                    <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
                      <FieldBlock
                        label="Approved minutes"
                        required
                        hint="Minutes to grant for this overtime"
                      >
                        <input
                          className={fieldClass}
                          type="number"
                          min="0"
                          value={approvedMinutes}
                          onChange={(e) => setApprovedMinutes(e.target.value)}
                        />
                      </FieldBlock>
                      <FieldBlock label="Payout mode" required>
                        <select
                          className={fieldClass}
                          value={payoutMode}
                          onChange={(e) => setPayoutMode(e.target.value)}
                        >
                          <option value="cash">Cash</option>
                          <option value="leave">Leave</option>
                        </select>
                      </FieldBlock>
                    </div>
                  ) : null}

                  {mode === "approve" &&
                  (activeType?.decisionKind === "loan" ||
                    activeType?.decisionKind === "expense") ? (
                    <FieldBlock
                      label="Approved amount"
                      required
                      hint={`Amount in ${currency}`}
                    >
                      <input
                        className={fieldClass}
                        type="number"
                        min="0"
                        value={approvedAmount}
                        onChange={(e) => setApprovedAmount(e.target.value)}
                      />
                    </FieldBlock>
                  ) : null}

                  {mode === "reject" &&
                  activeType?.decisionKind === "leave" ? (
                    <FieldBlock
                      label="Rejection reason"
                      required
                      hint="Shown to the employee on their leave request"
                    >
                      <textarea
                        className={`${fieldClass} h-24 py-2.5`}
                        placeholder="Why is this leave being rejected?"
                        value={rejectionReason}
                        onChange={(e) => setRejectionReason(e.target.value)}
                      />
                    </FieldBlock>
                  ) : null}

                  <FieldBlock
                    label="Comments"
                    required={mode === "reject"}
                    hint={
                      mode === "reject"
                        ? "Required before you can reject"
                        : "Optional note for this approval"
                    }
                  >
                    <textarea
                      className={`${fieldClass} h-24 py-2.5`}
                      placeholder={
                        mode === "reject"
                          ? "Add a remark for the employee"
                          : "Add an optional comment"
                      }
                      value={comments}
                      onChange={(e) => setComments(e.target.value)}
                    />
                  </FieldBlock>
                </div>
              </SectionCard>
            ) : null}
          </div>
        ) : null}
      </SlideOver>
    </PortalPage>
  );
}
