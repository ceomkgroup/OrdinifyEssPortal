"use client";

import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { createPortal } from "react-dom";
import Link from "next/link";
import {
  ArrowRight,
  CalendarCheck2,
  ClipboardPen,
  Clock3,
  Eye,
  LogIn,
  LogOut,
  Monitor,
  MoreVertical,
  Pencil,
  Plus,
  SearchX,
} from "lucide-react";
import {
  markTeamAttendance,
  regularizeTeamAttendance,
} from "@/api/team";
import { AttendanceTypeBadge } from "@/components/attendance/AttendanceTypeBadge";
import { AttendanceStatusFilter } from "@/components/attendance/AttendanceStatusFilter";
import { useTeam } from "@/components/team/TeamCapabilitiesProvider";
import { ComingSoon } from "@/components/ui/ComingSoon";
import { Avatar } from "@/components/ui/Avatar";
import { Button } from "@/components/ui/Button";
import { CollapsibleSection } from "@/components/ui/CollapsibleSection";
import { FilterDrawerDateRange } from "@/components/ui/FilterDrawerDateRange";
import { FlashBanner } from "@/components/ui/FlashBanner";
import { MetaBadge } from "@/components/ui/MetaBadge";
import { MuiDateField } from "@/components/ui/MuiDateField";
import { PageLoader } from "@/components/ui/Spinner";
import { PortalPage } from "@/components/ui/PortalPage";
import { SlideOver } from "@/components/ui/SlideOver";
import { SoftStat, SUMMARY_GRID_CLASS } from "@/components/ui/SoftStat";
import { TablePanel } from "@/components/ui/TablePanel";
import {
  DetailField,
  FieldBlock,
  HintBanner,
  PersonHero,
  SectionCard,
} from "@/components/team/TeamDrawer";
import { useAttendanceTypes } from "@/hooks/useAttendanceTypes";
import { useCompanySettings } from "@/hooks/useCompanySettings";
import { useModules } from "@/components/modules/ModulesProvider";
import { useTeamAttendanceLogs, useTeamAttendanceRequests } from "@/hooks/useTeamAttendance";
import { useTeamMembers } from "@/hooks/useTeamMembers";
import { getApiErrorMessage } from "@/lib/api-error";
import {
  downloadCsv,
  filterAttendanceByStatus,
  getAttendanceTypeColor,
} from "@/lib/attendance-history";
import {
  formatDate,
  formatHoursMinutes,
  formatTime,
  rowSerial,
} from "@/lib/format";

const fieldClass =
  "mt-1.5 h-11 w-full rounded-xl border border-[var(--border)] bg-[var(--surface)] px-3 text-[13px] text-[var(--text)] outline-none transition focus:border-[var(--violet)] focus:ring-2 focus:ring-[var(--lavender-soft)]";

const RANGE_TABS = [
  { key: "week", label: "This Week" },
  { key: "month", label: "This Month" },
  { key: "lastMonth", label: "Last Month" },
  { key: "year", label: "This Year" },
];

const REQ_STATUS_TABS = [
  { value: "all", label: "All" },
  { value: "pending", label: "Pending" },
  { value: "approved", label: "Approved" },
  { value: "rejected", label: "Rejected" },
];

function ymdToday() {
  const d = new Date();
  const y = d.getFullYear();
  const m = String(d.getMonth() + 1).padStart(2, "0");
  const day = String(d.getDate()).padStart(2, "0");
  return `${y}-${m}-${day}`;
}

function ymdDaysAgo(days) {
  const d = new Date();
  d.setHours(12, 0, 0, 0);
  if (days != null && !Number.isNaN(Number(days))) {
    d.setDate(d.getDate() - Number(days));
  } else {
    d.setFullYear(d.getFullYear() - 1);
  }
  const y = d.getFullYear();
  const m = String(d.getMonth() + 1).padStart(2, "0");
  const day = String(d.getDate()).padStart(2, "0");
  return `${y}-${m}-${day}`;
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

function toTimeInputValue(iso) {
  if (!iso) return "";
  const d = new Date(iso);
  if (Number.isNaN(d.getTime())) return "";
  return `${String(d.getHours()).padStart(2, "0")}:${String(d.getMinutes()).padStart(2, "0")}`;
}

function toIsoFromLocal(dateStr, timeStr) {
  if (!dateStr || !timeStr) return undefined;
  const [y, m, d] = dateStr.split("-").map(Number);
  const [hh, mm] = timeStr.split(":").map(Number);
  if (![y, m, d, hh, mm].every((n) => Number.isFinite(n))) return undefined;
  return new Date(y, m - 1, d, hh, mm, 0, 0).toISOString();
}

function daysFromToday(ymd) {
  if (!ymd) return null;
  const [y, m, d] = ymd.split("-").map(Number);
  if (![y, m, d].every((n) => Number.isFinite(n))) return null;
  const target = new Date(y, m - 1, d, 12, 0, 0);
  const today = new Date();
  today.setHours(12, 0, 0, 0);
  return Math.round((today - target) / 86400000);
}

function inWindow(ymd, days) {
  const ago = daysFromToday(ymd);
  if (ago == null || ago < 0) return false;
  if (days == null || Number.isNaN(Number(days))) return true;
  return ago <= Number(days);
}

function DateRangeBadge({ from, to, dateFormat = "DD/MM/YYYY" }) {
  if (!from && !to) return null;
  return (
    <MetaBadge>
      <span>{formatDate(from, dateFormat)}</span>
      <ArrowRight className="h-3 w-3 shrink-0 opacity-60" strokeWidth={2.2} />
      <span>{formatDate(to, dateFormat)}</span>
    </MetaBadge>
  );
}

function SourcePill({ source }) {
  const raw = String(source || "").trim();
  if (!raw) return <span className="text-[var(--muted)]">—</span>;
  const lower = raw.toLowerCase();
  const isManual =
    lower.includes("manual") || lower === "admin" || lower === "hr";
  const Icon = isManual ? Pencil : Monitor;
  return (
    <span className="inline-flex items-center gap-1.5 rounded-full border border-[var(--border)] bg-[var(--surface)] px-2.5 py-1 text-[11px] font-semibold capitalize text-[var(--text)]">
      <Icon className="h-3 w-3 text-[var(--muted)]" />
      {raw}
    </span>
  );
}

function HoursPill({ value }) {
  if (value == null || value === "") {
    return <span className="text-[var(--muted)]">—</span>;
  }
  return (
    <span className="inline-flex rounded-full bg-[var(--lavender-soft)] px-2.5 py-1 text-[11px] font-semibold text-[var(--violet)]">
      {formatHoursMinutes(value)}
    </span>
  );
}

function MemberCard({ person }) {
  if (!person) return null;
  return (
    <div className="flex items-center gap-3 rounded-2xl border border-[var(--border)] bg-[var(--panel-soft)] px-3 py-3">
      <Avatar name={person.employeeName} person={person} size={40} />
      <div className="min-w-0">
        <p className="truncate text-[14px] font-semibold text-[var(--text)]">
          {person.employeeName || "—"}
        </p>
        <p className="text-[12px] text-[var(--muted)]">
          {person.employeeCode || "Team member"}
        </p>
      </div>
    </div>
  );
}

function MemberPicker({ members, value, onChange, lockedPerson }) {
  if (lockedPerson) {
    return <MemberCard person={lockedPerson} />;
  }

  const selected = members.find((member) => member.employeeId === value);

  return (
    <div className="space-y-2">
      <MemberCard person={selected} />
      <label className="block text-[12px] font-medium text-[var(--muted)]">
        Team member
        <select
          className={fieldClass}
          value={value}
          onChange={(e) => onChange(e.target.value)}
        >
          {!value ? <option value="">Select a team member</option> : null}
          {members.map((member) => (
            <option key={member.employeeId} value={member.employeeId}>
              {member.employeeName} ({member.employeeCode})
            </option>
          ))}
        </select>
      </label>
      {!members.length ? (
        <p className="text-[12px] text-[var(--muted)]">
          No team members loaded yet.
        </p>
      ) : null}
    </div>
  );
}

function PunchTime({ iso, timeFormat }) {
  if (!iso) {
    return (
      <span className="inline-flex rounded-full bg-[var(--danger-soft)] px-2 py-0.5 text-[11px] font-semibold text-[var(--danger)]">
        Missing
      </span>
    );
  }
  return formatTime(iso, timeFormat);
}

function TimeCard({
  label,
  icon: Icon,
  value,
  onChange,
  currentIso,
  timeFormat,
  locked,
  emptyHint,
}) {
  return (
    <div
      className={`rounded-2xl border p-3.5 ${
        locked
          ? "border-[var(--border)] bg-[var(--panel-soft)]"
          : "border-[var(--border)] bg-[var(--surface)]"
      }`}
    >
      <div className="flex items-center gap-2">
        <span className="flex h-8 w-8 items-center justify-center rounded-xl bg-[var(--lavender-soft)] text-[var(--violet)]">
          <Icon className="h-4 w-4" />
        </span>
        <div>
          <p className="text-[12px] font-semibold text-[var(--text)]">{label}</p>
          <p className="text-[11px] text-[var(--muted)]">
            {currentIso
              ? `Current ${formatTime(currentIso, timeFormat)}`
              : emptyHint}
          </p>
        </div>
      </div>
      <input
        className={`${fieldClass} ${locked ? "cursor-not-allowed opacity-60" : ""}`}
        type="time"
        value={value}
        disabled={locked}
        onChange={(e) => onChange(e.target.value)}
      />
      {locked ? (
        <p className="mt-1.5 text-[11px] leading-relaxed text-[var(--muted)]">
          Already punched. Use Request correction to change this time.
        </p>
      ) : null}
    </div>
  );
}

function statusTone(status) {
  const s = String(status || "").toLowerCase();
  if (s === "approved") {
    return "border-[var(--success)]/25 bg-[var(--success-soft)] text-[var(--success)]";
  }
  if (s === "rejected" || s === "cancelled") {
    return "border-[var(--danger)]/25 bg-[var(--danger-soft)] text-[var(--danger)]";
  }
  if (s === "pending" || s === "submitted") {
    return "border-[var(--violet)]/25 bg-[var(--lavender-soft)] text-[var(--violet)]";
  }
  return "border-[var(--border)] bg-[var(--panel-soft)] text-[var(--muted)]";
}

function csvEscape(value) {
  if (value == null) return "";
  const text = String(value);
  if (/[",\n\r]/.test(text)) return `"${text.replace(/"/g, '""')}"`;
  return text;
}

function teamAttendanceCsv(rows) {
  const headers = [
    "Employee",
    "Code",
    "Date",
    "Status",
    "Code type",
    "Check In",
    "Check Out",
    "Shift",
    "Working Hours",
    "Late Minutes",
    "Punch Source",
    "Remarks",
  ];
  const lines = [headers.join(",")];
  for (const row of rows || []) {
    lines.push(
      [
        row.employeeName,
        row.employeeCode,
        row.attendanceDate,
        row.attTypeName,
        row.attTypeCode,
        row.checkInTime,
        row.checkOutTime,
        row.shiftName,
        row.workingHours,
        row.lateMinutes,
        row.punchSource,
        row.remarks,
      ]
        .map(csvEscape)
        .join(",")
    );
  }
  return lines.join("\r\n");
}

function RowActions({ logId, items }) {
  const [open, setOpen] = useState(false);
  const [coords, setCoords] = useState({ top: 0, left: 0 });
  const buttonRef = useRef(null);

  useEffect(() => {
    if (!open) return undefined;

    function placeMenu() {
      const rect = buttonRef.current?.getBoundingClientRect();
      if (!rect) return;
      const menuWidth = 200;
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
        event.target.closest?.(`[data-team-att-menu="${logId}"]`)
      ) {
        return;
      }
      setOpen(false);
    }

    document.addEventListener("mousedown", onDocClick);
    window.addEventListener("resize", placeMenu);
    window.addEventListener("scroll", placeMenu, true);
    return () => {
      document.removeEventListener("mousedown", onDocClick);
      window.removeEventListener("resize", placeMenu);
      window.removeEventListener("scroll", placeMenu, true);
    };
  }, [open, logId]);

  if (!items?.length) return null;

  return (
    <>
      <button
        ref={buttonRef}
        type="button"
        className="inline-flex h-8 w-8 items-center justify-center rounded-lg border border-[var(--border)] bg-[var(--surface)] text-[var(--muted)] transition hover:bg-[var(--panel-soft)] hover:text-[var(--text)]"
        aria-label="Row actions"
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
              data-team-att-menu={logId}
              className="fixed z-[9999] w-[200px] overflow-hidden rounded-xl border border-[var(--border)] bg-[var(--surface)] shadow-[0_12px_32px_rgba(15,23,42,0.18)]"
              style={{ top: coords.top, left: coords.left }}
            >
              {items.map((item) => (
                <button
                  key={item.label}
                  type="button"
                  className="flex w-full items-center gap-2 px-3 py-2.5 text-left text-[13px] font-semibold text-[var(--text)] hover:bg-[var(--panel-soft)]"
                  onClick={() => {
                    setOpen(false);
                    item.onClick?.();
                  }}
                >
                  {item.icon}
                  {item.label}
                </button>
              ))}
            </div>,
            document.body
          )
        : null}
    </>
  );
}

export function TeamAttendanceView({ section = "logs" }) {
  const isLogs = section !== "corrections";
  const isCorrections = section === "corrections";
  const { capabilities } = useTeam();
  const attendanceCap = capabilities?.attendance || {};
  const canView = Boolean(attendanceCap.view);
  const canRegularize = Boolean(attendanceCap.apply);
  const canMark = Boolean(attendanceCap.markAttendance);
  const correctionDays = attendanceCap.correctionWindowDays;
  const markDays = attendanceCap.markAttendanceWindowDays;

  const { settings } = useCompanySettings();
  const { hasFlag } = useModules();
  const breakEnabled = hasFlag("breakManagement");
  const dateFormat = settings.dateFormat || "DD/MM/YYYY";
  const timeFormat = settings.timeFormat || "12h";

  const { types: attendanceTypes, filterOptions: statusFilterOptions } =
    useAttendanceTypes();
  const { rows: members } = useTeamMembers({ enabled: canView });

  const logs = useTeamAttendanceLogs({ enabled: canView && isLogs });
  const {
    rangePreset,
    range,
    customFrom,
    customTo,
    setPreset,
    setCustomRange,
    page,
    limit,
    setPage,
    setPageSize,
    rows,
    loadAll,
    meta,
    loading,
    error,
    refetch,
  } = logs;

  const [statusFilter, setStatusFilter] = useState("all");
  const [employeeFilter, setEmployeeFilter] = useState("");
  const [search, setSearch] = useState("");
  const [draftStatus, setDraftStatus] = useState("all");
  const [draftEmployee, setDraftEmployee] = useState("");
  const [draftFrom, setDraftFrom] = useState("");
  const [draftTo, setDraftTo] = useState("");
  const [flash, setFlash] = useState("");
  const [flashTone, setFlashTone] = useState("success");
  const [exporting, setExporting] = useState(false);
  const [filterRows, setFilterRows] = useState(null);
  const [filterLoading, setFilterLoading] = useState(false);

  const [selected, setSelected] = useState(null);
  const [mode, setMode] = useState("view");
  const [form, setForm] = useState({
    employeeId: "",
    attendanceDate: "",
    checkInTime: "",
    checkOutTime: "",
    breakOutTime: "",
    breakInTime: "",
    reason: "",
    logId: "",
  });
  const [saving, setSaving] = useState(false);
  const [formError, setFormError] = useState("");

  const [reqStatus, setReqStatus] = useState("all");
  const [reqSearch, setReqSearch] = useState("");
  const [reqPage, setReqPage] = useState(1);
  const [reqFrom, setReqFrom] = useState("");
  const [reqTo, setReqTo] = useState("");
  const [draftReqFrom, setDraftReqFrom] = useState("");
  const [draftReqTo, setDraftReqTo] = useState("");
  const [viewCorrection, setViewCorrection] = useState(null);
  const reqSearching = Boolean(reqSearch.trim());
  const requests = useTeamAttendanceRequests({
    enabled: canView && isCorrections,
    status: reqStatus,
    from: reqFrom,
    to: reqTo,
    page: reqSearching ? 1 : reqPage,
    limit: reqSearching ? 200 : 20,
  });

  const filteredRequests = useMemo(() => {
    const q = reqSearch.trim().toLowerCase();
    if (!q) return requests.rows;
    return requests.rows.filter((row) =>
      [
        row.employeeName,
        row.employeeCode,
        row.reason,
        row.status,
      ]
        .filter(Boolean)
        .join(" ")
        .toLowerCase()
        .includes(q)
    );
  }, [requests.rows, reqSearch]);

  const reqDateFilterCount = (reqFrom ? 1 : 0) + (reqTo ? 1 : 0);
  const reqHasSearchOrFilter = reqSearching || reqDateFilterCount > 0;
  const reqDisplayRows = reqSearching
    ? filteredRequests.slice((reqPage - 1) * 20, reqPage * 20)
    : requests.rows;
  const reqTotal = reqSearching
    ? filteredRequests.length
    : Number(requests.meta.total) || 0;
  const reqTotalPages = reqSearching
    ? Math.max(1, Math.ceil(reqTotal / 20) || 1)
    : Math.max(1, Number(requests.meta.totalPages) || 1);

  const clientFilterActive =
    statusFilter !== "all" || Boolean(employeeFilter) || Boolean(search.trim());

  useEffect(() => {
    let alive = true;
    queueMicrotask(() => {
      if (!alive) return;
      setDraftFrom(customFrom || range.from);
      setDraftTo(customTo || range.to);
    });
    return () => {
      alive = false;
    };
  }, [customFrom, customTo, range.from, range.to]);

  useEffect(() => {
    let alive = true;
    if (!clientFilterActive || !isLogs) {
      queueMicrotask(() => {
        if (!alive) return;
        setFilterRows(null);
        setFilterLoading(false);
      });
      return () => {
        alive = false;
      };
    }
    queueMicrotask(() => {
      if (alive) setFilterLoading(true);
    });
    (async () => {
      try {
        const all = await loadAll();
        if (!alive) return;
        setFilterRows(all);
      } catch {
        if (!alive) return;
        setFilterRows([]);
      } finally {
        if (alive) setFilterLoading(false);
      }
    })();
    return () => {
      alive = false;
    };
  }, [clientFilterActive, loadAll, isLogs, range.from, range.to]);

  const filteredLogs = useMemo(() => {
    let list = clientFilterActive ? filterRows || [] : rows;
    if (employeeFilter) {
      list = list.filter((row) => row.employeeId === employeeFilter);
    }
    if (statusFilter !== "all") {
      list = filterAttendanceByStatus(list, statusFilter, attendanceTypes);
    }
    const q = search.trim().toLowerCase();
    if (q) {
      list = list.filter((row) =>
        [
          row.employeeName,
          row.employeeCode,
          row.attTypeName,
          row.attTypeCode,
          row.shiftName,
          row.punchSource,
          row.remarks,
        ]
          .filter(Boolean)
          .join(" ")
          .toLowerCase()
          .includes(q)
      );
    }
    return list;
  }, [
    clientFilterActive,
    filterRows,
    rows,
    employeeFilter,
    statusFilter,
    attendanceTypes,
    search,
  ]);

  const displayRows = useMemo(() => {
    if (!clientFilterActive) return rows;
    return filteredLogs.slice((page - 1) * limit, page * limit);
  }, [clientFilterActive, filteredLogs, rows, page, limit]);

  const total = clientFilterActive
    ? filteredLogs.length
    : Number(meta?.total) || 0;
  const totalPages = clientFilterActive
    ? Math.max(1, Math.ceil(total / limit) || 1)
    : Math.max(1, Number(meta?.totalPages) || 1);

  const statsSource = clientFilterActive ? filteredLogs : rows;
  const stats = useMemo(() => {
    let present = 0;
    let absent = 0;
    let leave = 0;
    for (const row of statsSource || []) {
      const code = String(row.attTypeCode || "").toUpperCase();
      const name = String(row.attTypeName || "").toLowerCase();
      if (code === "AB" || name.includes("absent")) absent += 1;
      else if (code === "CL" || name.includes("leave")) leave += 1;
      else if (row.checkInTime || code === "PR" || name.includes("present")) {
        present += 1;
      }
    }
    return { present, absent, leave, total: statsSource.length };
  }, [statsSource]);

  function applyFilters() {
    setStatusFilter(draftStatus);
    setEmployeeFilter(draftEmployee);
    setPage(1);
    if (
      rangePreset === "custom" ||
      draftFrom !== range.from ||
      draftTo !== range.to
    ) {
      setCustomRange(draftFrom, draftTo);
    }
  }

  function resetFilters() {
    setDraftStatus("all");
    setStatusFilter("all");
    setDraftEmployee("");
    setEmployeeFilter("");
    setPage(1);
    if (rangePreset === "custom") setPreset("month");
  }

  const handleExportCsv = useCallback(async () => {
    setExporting(true);
    try {
      const all = await loadAll();
      let list = all;
      if (employeeFilter) {
        list = list.filter((row) => row.employeeId === employeeFilter);
      }
      list = filterAttendanceByStatus(list, statusFilter, attendanceTypes);
      downloadCsv(
        `team-attendance-${range.from}_${range.to}.csv`,
        teamAttendanceCsv(list)
      );
    } finally {
      setExporting(false);
    }
  }, [loadAll, employeeFilter, statusFilter, attendanceTypes, range.from, range.to]);

  function closePanel() {
    setSelected(null);
    setMode("view");
    setFormError("");
  }

  function openLog(row, nextMode = "view") {
    const date = toDateInputValue(row.attendanceDate);
    setSelected(row);
    setMode(nextMode);
    setFormError("");
    setForm({
      employeeId: row.employeeId || "",
      attendanceDate: date,
      checkInTime: toTimeInputValue(row.checkInTime),
      checkOutTime: toTimeInputValue(row.checkOutTime),
      breakOutTime: toTimeInputValue(row.breakOutTime),
      breakInTime: toTimeInputValue(row.breakInTime),
      reason: "",
      logId: row.logId || "",
    });
  }

  function openMarkBlank() {
    setSelected(null);
    setMode("mark");
    setFormError("");
    setForm({
      employeeId: members[0]?.employeeId || "",
      attendanceDate: ymdToday(),
      checkInTime: "",
      checkOutTime: "",
      breakOutTime: "",
      breakInTime: "",
      reason: "",
      logId: "",
    });
  }

  async function submitForm() {
    setFormError("");
    if (!form.employeeId || !form.attendanceDate) {
      setFormError("Employee and date are required.");
      return;
    }
    if (mode === "regularize" && !form.reason.trim()) {
      setFormError("Add a reason for this correction.");
      return;
    }
    const checkInTime = toIsoFromLocal(form.attendanceDate, form.checkInTime);
    const checkOutTime = toIsoFromLocal(form.attendanceDate, form.checkOutTime);
    if (!checkInTime && !checkOutTime) {
      setFormError("Enter at least check-in or check-out time.");
      return;
    }
    setSaving(true);
    try {
      if (mode === "mark") {
        const payload = {
          attendanceDate: form.attendanceDate,
        };
        if (!selected?.checkInTime && checkInTime) {
          payload.checkInTime = checkInTime;
        }
        if (!selected?.checkOutTime && checkOutTime) {
          payload.checkOutTime = checkOutTime;
        }
        if (breakEnabled) {
          if (!selected?.breakOutTime && form.breakOutTime) {
            payload.breakOutTime = toIsoFromLocal(
              form.attendanceDate,
              form.breakOutTime
            );
          }
          if (!selected?.breakInTime && form.breakInTime) {
            payload.breakInTime = toIsoFromLocal(
              form.attendanceDate,
              form.breakInTime
            );
          }
        }
        if (!payload.checkInTime && !payload.checkOutTime) {
          setFormError("Enter the missing check-in or check-out time.");
          setSaving(false);
          return;
        }
        await markTeamAttendance(form.employeeId, payload);
        setFlash("Missing punch filled for this team member.");
      } else {
        await regularizeTeamAttendance(form.employeeId, {
          logId: form.logId || undefined,
          attendanceDate: selected?.attendanceDate || form.attendanceDate,
          checkInTime,
          checkOutTime,
          reason: form.reason.trim(),
        });
        setFlash(
          "Correction submitted. Track it under Team → Corrections while it waits for approval."
        );
      }
      setFlashTone("success");
      closePanel();
      refetch();
    } catch (err) {
      setFormError(getApiErrorMessage(err, "Could not save attendance."));
    } finally {
      setSaving(false);
    }
  }

  const logColumns = useMemo(
    () => [
      {
        id: "serial",
        header: "#",
        headerClassName: "w-12",
        cellClassName: "tabular-nums text-[var(--muted)]",
        cell: (_row, { index }) =>
          rowSerial(index, clientFilterActive ? page : Number(meta.page) || page, limit),
      },
      {
        id: "employee",
        header: "Employee",
        cell: (row) => (
          <div className="flex min-w-0 items-center gap-2.5">
            <Avatar name={row.employeeName} person={row} size={32} />
            <div className="min-w-0">
              <p className="truncate font-semibold text-[var(--text)]">
                {row.employeeName || "—"}
              </p>
              <p className="text-[11px] text-[var(--muted)]">
                {row.employeeCode || "—"}
              </p>
            </div>
          </div>
        ),
      },
      {
        id: "date",
        header: "Date",
        cellClassName: "whitespace-nowrap font-medium text-[var(--text)]",
        cell: (row) => formatDate(row.attendanceDate, dateFormat),
      },
      {
        id: "status",
        header: "Status",
        cell: (row) => (
          <AttendanceTypeBadge row={row} types={attendanceTypes} />
        ),
      },
      {
        id: "source",
        header: "Source",
        cell: (row) => (
          <SourcePill
            source={row.punchSource || (row.isManualOverride ? "Manual" : null)}
          />
        ),
      },
      {
        id: "shift",
        header: "Shift",
        cellClassName: "max-w-[140px] truncate text-[var(--muted)]",
        cell: (row) => row.shiftName || "—",
      },
      {
        id: "checkIn",
        header: "Check In",
        cellClassName: "whitespace-nowrap font-semibold text-[var(--success)]",
        cell: (row) => (
          <PunchTime iso={row.checkInTime} timeFormat={timeFormat} />
        ),
      },
      {
        id: "checkOut",
        header: "Check Out",
        cellClassName: "whitespace-nowrap font-semibold text-[var(--violet)]",
        cell: (row) => (
          <PunchTime iso={row.checkOutTime} timeFormat={timeFormat} />
        ),
      },
      {
        id: "hours",
        header: "Hours",
        cell: (row) => <HoursPill value={row.workingHours} />,
      },
      {
        id: "action",
        header: "Action",
        headerClassName: "w-16 text-right",
        cellClassName: "text-right",
        cell: (row) => {
          const ymd = toDateInputValue(row.attendanceDate);
          const missingPunch = !row.checkInTime || !row.checkOutTime;
          const items = [
            {
              label: "View",
              icon: <Eye className="h-4 w-4 text-[var(--violet)]" />,
              onClick: () => openLog(row, "view"),
            },
          ];
          if (canMark && missingPunch && inWindow(ymd, markDays)) {
            items.push({
              label: "Mark punch",
              icon: <Plus className="h-4 w-4 text-[var(--success)]" />,
              onClick: () => openLog(row, "mark"),
            });
          }
          if (canRegularize && inWindow(ymd, correctionDays)) {
            items.push({
              label: "Request correction",
              icon: <ClipboardPen className="h-4 w-4 text-[var(--violet)]" />,
              onClick: () => openLog(row, "regularize"),
            });
          }
          return <RowActions logId={row.logId} items={items} />;
        },
      },
    ],
    [
      attendanceTypes,
      canMark,
      canRegularize,
      clientFilterActive,
      correctionDays,
      dateFormat,
      limit,
      markDays,
      meta.page,
      page,
      timeFormat,
    ]
  );

  const requestColumns = useMemo(
    () => [
      {
        id: "serial",
        header: "#",
        headerClassName: "w-12",
        cellClassName: "tabular-nums text-[var(--muted)]",
        cell: (_row, { index }) => rowSerial(index, reqPage, 20),
      },
      {
        id: "employee",
        header: "Employee",
        cell: (row) => (
          <div className="flex min-w-0 items-center gap-2.5">
            <Avatar name={row.employeeName} person={row} size={32} />
            <p className="truncate font-semibold text-[var(--text)]">
              {row.employeeName || "—"}
            </p>
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
        id: "date",
        header: "Date",
        cell: (row) =>
          formatDate(row.attendanceDate || row.logDate, dateFormat),
      },
      {
        id: "times",
        header: "In / Out",
        cell: (row) =>
          `${formatTime(row.checkInTime, timeFormat)} – ${formatTime(row.checkOutTime, timeFormat)}`,
      },
      {
        id: "status",
        header: "Status",
        cell: (row) => (
          <span
            className={`inline-flex rounded-full border px-2.5 py-0.5 text-[11px] font-semibold capitalize ${statusTone(row.status)}`}
          >
            {row.status || "pending"}
          </span>
        ),
      },
      {
        id: "reason",
        header: "Reason",
        cellClassName: "max-w-[220px] truncate text-[var(--muted)]",
        cell: (row) => row.reason || "—",
      },
      {
        id: "action",
        header: "Action",
        headerClassName: "w-16 text-right",
        cellClassName: "text-right",
        cell: (row) => (
          <button
            type="button"
            className="inline-flex h-8 w-8 items-center justify-center rounded-lg border border-[var(--border)] bg-[var(--surface)] text-[var(--muted)] transition hover:bg-[var(--panel-soft)] hover:text-[var(--text)]"
            aria-label="View correction"
            onClick={() => setViewCorrection(row)}
          >
            <Eye className="h-4 w-4" />
          </button>
        ),
      },
    ],
    [dateFormat, reqPage, timeFormat]
  );

  if (!canView) {
    return (
      <ComingSoon
        title={isLogs ? "Attendance log" : "Corrections"}
        badge="Not enabled"
        description="Team attendance is turned off for your manager self-service settings."
        icon={isLogs ? CalendarCheck2 : ClipboardPen}
        secondaryHref="/team/requests"
        secondaryLabel="Open approvals"
      />
    );
  }

  if (isLogs && loading && !rows.length && !clientFilterActive) {
    return (
      <PageLoader
        label="Loading attendance log"
        hint="Fetching daily punches for your reports…"
      />
    );
  }

  if (isCorrections && requests.loading && !requests.rows.length) {
    return (
      <PageLoader
        label="Loading corrections"
        hint="Fetching attendance corrections you submitted…"
      />
    );
  }

  const panelOpen = Boolean(mode === "mark" || selected);
  const lockedPerson = selected
    ? members.find((m) => m.employeeId === selected.employeeId) || selected
    : null;
  const formMember =
    lockedPerson || members.find((m) => m.employeeId === form.employeeId);
  const lockIn = mode === "mark" && Boolean(selected?.checkInTime);
  const lockOut = mode === "mark" && Boolean(selected?.checkOutTime);
  const lockBreakOut = mode === "mark" && Boolean(selected?.breakOutTime);
  const lockBreakIn = mode === "mark" && Boolean(selected?.breakInTime);
  const panelTitle =
    mode === "mark"
      ? selected
        ? "Fill missing punch"
        : "Mark punch"
      : mode === "regularize"
        ? "Request correction"
        : "Attendance details";
  const selectedYmd = selected
    ? toDateInputValue(selected.attendanceDate)
    : "";
  const canFillSelected = Boolean(
    selected &&
      canMark &&
      (!selected.checkInTime || !selected.checkOutTime) &&
      inWindow(selectedYmd, markDays)
  );
  const canCorrectSelected = Boolean(
    selected && canRegularize && inWindow(selectedYmd, correctionDays)
  );

  return (
    <PortalPage
      fill
      title={isLogs ? "Attendance log" : "Corrections"}
      subtitle={
        isLogs
          ? "Daily punches for people who report to you. Fill a missing time with Mark punch. Change an existing time with Request correction."
          : "Corrections you submitted for your team. Track pending, approved, and rejected items here."
      }
      error={isLogs ? error : requests.error}
      actions={
        <>
          {isLogs ? (
            <DateRangeBadge
              from={range.from}
              to={range.to}
              dateFormat={dateFormat}
            />
          ) : null}
          {isLogs && canMark ? (
            <Button type="button" onClick={openMarkBlank}>
              <Plus className="h-4 w-4" />
              Mark punch
            </Button>
          ) : null}
          <Button
            type="button"
            variant="outline"
            onClick={isLogs ? refetch : requests.refetch}
            disabled={isLogs ? loading : requests.loading}
          >
            Refresh
          </Button>
        </>
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

      {isLogs ? (
        <CollapsibleSection title="Overview">
          <div className={SUMMARY_GRID_CLASS}>
            <SoftStat label="Logs in view" value={total} color="#7b39ec" />
            <SoftStat
              label="Present"
              value={stats.present}
              color={getAttendanceTypeColor("P", attendanceTypes, "#22c55e")}
            />
            <SoftStat
              label="Absent"
              value={stats.absent}
              color={getAttendanceTypeColor("A", attendanceTypes, "#ef4444")}
            />
            <SoftStat
              label="Leave"
              value={stats.leave}
              color={getAttendanceTypeColor("CL", attendanceTypes, "#eab308")}
            />
          </div>
        </CollapsibleSection>
      ) : (
        <CollapsibleSection title="Summary">
          <div className={SUMMARY_GRID_CLASS}>
            <SoftStat label="Total Requests" value={requests.stats.total} />
            <SoftStat
              label="Pending"
              value={requests.stats.pending}
              color="#7b39ec"
            />
            <SoftStat
              label="Approved"
              value={requests.stats.approved}
              color="#22c55e"
            />
            <SoftStat
              label="Rejected"
              value={requests.stats.rejected}
              color="#ef4444"
            />
          </div>
        </CollapsibleSection>
      )}

      {isLogs ? (
        <TablePanel
          title="Team punches"
          titleCount={total}
          titleCountLabel="Logs"
          tabs={RANGE_TABS.map((item) => ({
            value: item.key,
            label: item.label,
          }))}
          tab={rangePreset === "custom" ? "" : rangePreset}
          onTabChange={setPreset}
          headerExtra={
            <DateRangeBadge
              from={range.from}
              to={range.to}
              dateFormat={dateFormat}
            />
          }
          search={search}
          onSearchChange={(next) => {
            setSearch(next);
            setPage(1);
          }}
          searchPlaceholder="Search employee, status, shift…"
          filterActive={
            statusFilter !== "all" ||
            Boolean(employeeFilter) ||
            rangePreset === "custom"
          }
          activeFilterCount={
            (statusFilter !== "all" ? 1 : 0) +
            (employeeFilter ? 1 : 0) +
            (rangePreset === "custom" ? 1 : 0)
          }
          filterTitle="Filters"
          drawerFields={
            <div className="space-y-5">
              <label className="block text-[12px] font-medium text-[var(--muted)]">
                Team member
                <select
                  className={fieldClass}
                  value={draftEmployee}
                  onChange={(e) => setDraftEmployee(e.target.value)}
                >
                  <option value="">All members</option>
                  {members.map((member) => (
                    <option key={member.employeeId} value={member.employeeId}>
                      {member.employeeName} ({member.employeeCode})
                    </option>
                  ))}
                </select>
              </label>
              <AttendanceStatusFilter
                value={draftStatus}
                onChange={setDraftStatus}
                options={statusFilterOptions}
                defaultValue="all"
              />
              <FilterDrawerDateRange
                from={draftFrom}
                to={draftTo}
                onFromChange={setDraftFrom}
                onToChange={setDraftTo}
              />
            </div>
          }
          onApplyFilters={applyFilters}
          onResetFilters={resetFilters}
          onRefresh={refetch}
          onExport={handleExportCsv}
          exporting={exporting}
          columns={logColumns}
          rows={displayRows}
          getRowKey={(row) => row.logId}
          minWidth="1100px"
          loading={loading || filterLoading}
          loadingLabel="Loading team logs"
          emptyIcon={CalendarCheck2}
          emptyTitle={
            meta.allowed === false
              ? "Attendance not available"
              : "No team logs"
          }
          emptyHint={
            meta.allowed === false
              ? "Team attendance is disabled for your account."
              : "When your reports punch in, their days will show here."
          }
          page={clientFilterActive ? page : Number(meta.page) || page}
          pageSize={limit}
          total={total}
          totalPages={totalPages}
          onPageChange={setPage}
          onPageSizeChange={setPageSize}
        />
      ) : (
        <TablePanel
          title="Correction Logs"
          titleCount={reqTotal}
          titleCountLabel="Requests"
          tabs={REQ_STATUS_TABS}
          tab={reqStatus}
          onTabChange={(next) => {
            setReqStatus(next);
            setReqPage(1);
          }}
          recordCount={reqHasSearchOrFilter ? filteredRequests.length : reqTotal}
          search={reqSearch}
          onSearchChange={(next) => {
            setReqSearch(next);
            setReqPage(1);
          }}
          searchPlaceholder="Search employee name, code…"
          filterTitle="Filters"
          filterSubtitle="Date range"
          filterActive={reqDateFilterCount > 0}
          activeFilterCount={reqDateFilterCount}
          drawerFields={
            <FilterDrawerDateRange
              from={draftReqFrom}
              to={draftReqTo}
              onFromChange={setDraftReqFrom}
              onToChange={setDraftReqTo}
              hint="Filter corrections by attendance date."
            />
          }
          onApplyFilters={() => {
            setReqFrom(draftReqFrom);
            setReqTo(draftReqTo);
            setReqPage(1);
          }}
          onResetFilters={() => {
            setDraftReqFrom("");
            setDraftReqTo("");
            setReqFrom("");
            setReqTo("");
            setReqPage(1);
          }}
          onRefresh={requests.refetch}
          columns={requestColumns}
          rows={reqDisplayRows}
          getRowKey={(row) => row.id}
          minWidth="900px"
          loading={requests.loading}
          loadingLabel="Loading corrections"
          emptyIcon={reqHasSearchOrFilter ? SearchX : ClipboardPen}
          emptyTitle={
            reqHasSearchOrFilter
              ? "Data not found"
              : "No corrections"
          }
          emptyHint={
            reqHasSearchOrFilter
              ? "No corrections match your search or date filters. Try a different name or clear filters."
              : "Open a day on Attendance log and choose Request correction. Only people who report to you can be selected."
          }
          emptyAction={
            reqHasSearchOrFilter ? (
              <Button
                type="button"
                variant="outline"
                onClick={() => {
                  setReqSearch("");
                  setDraftReqFrom("");
                  setDraftReqTo("");
                  setReqFrom("");
                  setReqTo("");
                  setReqPage(1);
                }}
              >
                Clear search & filters
              </Button>
            ) : (
              <Link href="/team/attendance">
                <Button type="button" variant="outline">
                  Open attendance log
                </Button>
              </Link>
            )
          }
          page={reqPage}
          pageSize={20}
          total={reqTotal}
          totalPages={reqTotalPages}
          onPageChange={setReqPage}
        />
      )}

      <SlideOver
        open={panelOpen}
        onClose={closePanel}
        wide
        title={panelTitle}
        subtitle={
          formMember?.employeeName ||
          (mode === "mark" ? "Choose a team member and the missing times" : "")
        }
        footer={
          mode === "view" ? (
            canFillSelected || canCorrectSelected ? (
              <div className="flex justify-end gap-2">
                {canFillSelected ? (
                  <Button
                    type="button"
                    variant="outline"
                    className="h-11 rounded-xl"
                    onClick={() => setMode("mark")}
                  >
                    <Plus className="h-4 w-4" />
                    Fill punch
                  </Button>
                ) : null}
                {canCorrectSelected ? (
                  <Button
                    type="button"
                    className="h-11 rounded-xl"
                    onClick={() => setMode("regularize")}
                  >
                    <ClipboardPen className="h-4 w-4" />
                    Request correction
                  </Button>
                ) : null}
              </div>
            ) : null
          ) : (
            <div className="flex justify-end gap-2">
              <Button
                type="button"
                variant="outline"
                className="h-11 min-w-[100px] rounded-xl"
                onClick={closePanel}
                disabled={saving}
              >
                Cancel
              </Button>
              <Button
                type="button"
                className="h-11 min-w-[150px] rounded-xl"
                onClick={submitForm}
                disabled={saving}
              >
                {saving
                  ? "Saving…"
                  : mode === "mark"
                    ? "Save punch"
                    : "Submit correction"}
              </Button>
            </div>
          )
        }
      >
        {formError ? (
          <p className="mb-3 rounded-xl border border-[var(--danger)]/20 bg-[var(--danger-soft)] px-3 py-2 text-[13px] text-[var(--danger)]">
            {formError}
          </p>
        ) : null}

        {mode === "view" && selected ? (
          <div className="space-y-4 pb-2">
            <PersonHero
              person={lockedPerson || selected}
              badge={
                <AttendanceTypeBadge row={selected} types={attendanceTypes} />
              }
            />
            <div className="grid grid-cols-2 gap-3">
              <div className="rounded-2xl border border-[var(--border)] bg-[var(--panel-soft)] p-3.5">
                <p className="text-[11px] font-semibold uppercase tracking-wide text-[var(--muted)]">
                  Date
                </p>
                <p className="mt-1 text-[14px] font-semibold text-[var(--text)]">
                  {formatDate(selected.attendanceDate, dateFormat)}
                </p>
              </div>
              <div className="rounded-2xl border border-[var(--border)] bg-[var(--panel-soft)] p-3.5">
                <p className="text-[11px] font-semibold uppercase tracking-wide text-[var(--muted)]">
                  Status
                </p>
                <p className="mt-1 text-[14px] font-semibold text-[var(--text)]">
                  {selected.attTypeName || "—"}
                </p>
              </div>
            </div>
            <div className="grid grid-cols-2 gap-3">
              <div className="rounded-2xl border border-[var(--border)] bg-[var(--surface)] p-3.5">
                <div className="flex items-center gap-2 text-[12px] font-semibold text-[var(--text)]">
                  <LogIn className="h-4 w-4 text-[var(--success)]" />
                  Check in
                </div>
                <p className="mt-2 text-[18px] font-semibold text-[var(--success)]">
                  {selected.checkInTime
                    ? formatTime(selected.checkInTime, timeFormat)
                    : "Missing"}
                </p>
              </div>
              <div className="rounded-2xl border border-[var(--border)] bg-[var(--surface)] p-3.5">
                <div className="flex items-center gap-2 text-[12px] font-semibold text-[var(--text)]">
                  <LogOut className="h-4 w-4 text-[var(--violet)]" />
                  Check out
                </div>
                <p className="mt-2 text-[18px] font-semibold text-[var(--violet)]">
                  {selected.checkOutTime
                    ? formatTime(selected.checkOutTime, timeFormat)
                    : "Missing"}
                </p>
              </div>
            </div>
            <SectionCard kicker="Overview" title="Shift & hours">
              <dl className="grid grid-cols-1 gap-x-6 gap-y-4 sm:grid-cols-2">
                <DetailField label="Shift">{selected.shiftName}</DetailField>
                <DetailField label="Hours">
                  {formatHoursMinutes(selected.workingHours)}
                </DetailField>
                <DetailField label="Late">
                  {selected.lateMinutes ? `${selected.lateMinutes}m` : null}
                </DetailField>
                <DetailField label="Source">
                  <SourcePill
                    source={
                      selected.punchSource ||
                      (selected.isManualOverride ? "Manual" : null)
                    }
                  />
                </DetailField>
                <DetailField label="Remarks" className="sm:col-span-2">
                  {selected.remarks ? (
                    <p className="whitespace-pre-wrap font-normal leading-relaxed">
                      {selected.remarks}
                    </p>
                  ) : null}
                </DetailField>
              </dl>
            </SectionCard>
          </div>
        ) : (
          <div className="space-y-4">
            <HintBanner icon={Clock3}>
              {mode === "mark" ? (
                <span>
                  Mark punch only fills missing times. Punched times stay
                  locked. To change a time that already exists, use Request
                  correction instead.
                </span>
              ) : (
                <span>
                  This sends a correction for approval. The log will not change
                  until it is approved. Track it later under Team → Corrections.
                </span>
              )}
            </HintBanner>

            <MemberPicker
              members={members}
              value={form.employeeId}
              lockedPerson={lockedPerson}
              onChange={(employeeId) =>
                setForm((prev) => ({ ...prev, employeeId }))
              }
            />

            {selected ? (
              <div className="rounded-2xl border border-[var(--border)] bg-[var(--panel-soft)] px-3 py-3">
                <p className="text-[11px] font-semibold uppercase tracking-wide text-[var(--muted)]">
                  Date
                </p>
                <p className="mt-1 text-[14px] font-semibold text-[var(--text)]">
                  {formatDate(selected.attendanceDate, dateFormat)}
                </p>
              </div>
            ) : (
              <MuiDateField
                label="Attendance date"
                required
                dateFormat={dateFormat}
                value={form.attendanceDate}
                min={
                  (mode === "mark" ? markDays : correctionDays) != null
                    ? ymdDaysAgo(mode === "mark" ? markDays : correctionDays)
                    : undefined
                }
                max={ymdToday()}
                onChange={(next) =>
                  setForm((prev) => ({ ...prev, attendanceDate: next }))
                }
              />
            )}

            <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
              <TimeCard
                label="Check in"
                icon={LogIn}
                value={form.checkInTime}
                onChange={(checkInTime) =>
                  setForm((prev) => ({ ...prev, checkInTime }))
                }
                currentIso={selected?.checkInTime}
                timeFormat={timeFormat}
                locked={lockIn}
                emptyHint="Not punched yet"
              />
              <TimeCard
                label="Check out"
                icon={LogOut}
                value={form.checkOutTime}
                onChange={(checkOutTime) =>
                  setForm((prev) => ({ ...prev, checkOutTime }))
                }
                currentIso={selected?.checkOutTime}
                timeFormat={timeFormat}
                locked={lockOut}
                emptyHint="Not punched yet"
              />
            </div>

            {mode === "mark" && breakEnabled ? (
              <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
                <TimeCard
                  label="Break out"
                  icon={Clock3}
                  value={form.breakOutTime}
                  onChange={(breakOutTime) =>
                    setForm((prev) => ({ ...prev, breakOutTime }))
                  }
                  currentIso={selected?.breakOutTime}
                  timeFormat={timeFormat}
                  locked={lockBreakOut}
                  emptyHint="Optional"
                />
                <TimeCard
                  label="Break in"
                  icon={Clock3}
                  value={form.breakInTime}
                  onChange={(breakInTime) =>
                    setForm((prev) => ({ ...prev, breakInTime }))
                  }
                  currentIso={selected?.breakInTime}
                  timeFormat={timeFormat}
                  locked={lockBreakIn}
                  emptyHint="Optional"
                />
              </div>
            ) : null}

            {mode === "regularize" ? (
              <FieldBlock
                label="Reason"
                required
                hint="Explain why this punch needs to change"
              >
                <textarea
                  className={`${fieldClass} h-24 py-2.5`}
                  value={form.reason}
                  onChange={(e) =>
                    setForm((prev) => ({ ...prev, reason: e.target.value }))
                  }
                  placeholder="Why does this punch need to change?"
                />
              </FieldBlock>
            ) : null}
          </div>
        )}
      </SlideOver>

      <SlideOver
        open={Boolean(viewCorrection)}
        onClose={() => setViewCorrection(null)}
        wide
        title="Correction details"
        subtitle={
          viewCorrection
            ? [
                viewCorrection.employeeName,
                formatDate(
                  viewCorrection.attendanceDate || viewCorrection.logDate,
                  dateFormat
                ),
              ]
                .filter(Boolean)
                .join(" · ")
            : ""
        }
      >
        {viewCorrection ? (
          <div className="space-y-4 pb-2">
            <PersonHero
              person={viewCorrection}
              badge={
                <span
                  className={`inline-flex rounded-full border px-2.5 py-1 text-[11px] font-semibold capitalize ${statusTone(viewCorrection.status)}`}
                >
                  {viewCorrection.status || "pending"}
                </span>
              }
            />
            <SectionCard kicker="Overview" title="Requested times">
              <dl className="grid grid-cols-1 gap-x-6 gap-y-4 sm:grid-cols-2">
                <DetailField label="Date">
                  {formatDate(
                    viewCorrection.attendanceDate || viewCorrection.logDate,
                    dateFormat
                  )}
                </DetailField>
                <DetailField label="Status">
                  <span className="capitalize">
                    {viewCorrection.status || "pending"}
                  </span>
                </DetailField>
                <DetailField label="Check in">
                  {formatTime(viewCorrection.checkInTime, timeFormat)}
                </DetailField>
                <DetailField label="Check out">
                  {formatTime(viewCorrection.checkOutTime, timeFormat)}
                </DetailField>
                <DetailField label="Reason" className="sm:col-span-2">
                  <p className="whitespace-pre-wrap font-normal leading-relaxed">
                    {viewCorrection.reason || "—"}
                  </p>
                </DetailField>
              </dl>
            </SectionCard>
          </div>
        ) : null}
      </SlideOver>
    </PortalPage>
  );
}
