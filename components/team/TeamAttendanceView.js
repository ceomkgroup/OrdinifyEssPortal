"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import Link from "next/link";
import {
  ArrowRight,
  CalendarCheck2,
  ClipboardPen,
  Eye,
  LogIn,
  LogOut,
  Monitor,
  Pencil,
  Plus,
  SearchX,
} from "lucide-react";
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
import { PageLoader } from "@/components/ui/Spinner";
import { PortalPage } from "@/components/ui/PortalPage";
import { SlideOver } from "@/components/ui/SlideOver";
import { SoftStat, SUMMARY_GRID_CLASS } from "@/components/ui/SoftStat";
import { TablePanel } from "@/components/ui/TablePanel";
import {
  DetailField,
  PersonHero,
  SectionCard,
} from "@/components/team/TeamDrawer";
import { TeamPunchDrawer } from "@/components/team/TeamPunchDrawer";
import { TeamRowMenu } from "@/components/team/TeamRowMenu";
import { useAttendanceTypes } from "@/hooks/useAttendanceTypes";
import { useCompanySettings } from "@/hooks/useCompanySettings";
import { useTeamAttendanceLogs, useTeamAttendanceRequests } from "@/hooks/useTeamAttendance";
import { useTeamMembers } from "@/hooks/useTeamMembers";
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

const fieldClass =
  "h-11 w-full rounded-xl border border-[var(--border)] bg-[var(--surface)] px-3 text-[13px] text-[var(--text)] outline-none transition focus:border-[var(--violet)] focus:ring-2 focus:ring-[var(--lavender-soft)]";

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
  const [punch, setPunch] = useState({
    open: false,
    mode: "mark",
    member: null,
    log: null,
  });

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
  }

  const openPunch = useCallback((nextMode, { member = null, log = null } = {}) => {
    setSelected(null);
    setPunch({ open: true, mode: nextMode, member, log });
  }, []);

  const openLog = useCallback(
    (row, nextMode = "view") => {
      if (nextMode === "view") {
        setPunch((prev) => ({ ...prev, open: false }));
        setSelected(row);
        return;
      }
      openPunch(nextMode, { log: row });
    },
    [openPunch]
  );

  function openMarkBlank() {
    openPunch("mark");
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
          return (
            <TeamRowMenu menuId={row.logId} items={items} />
          );
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
      openLog,
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
          <TeamRowMenu
            menuId={row.id}
            items={[
              {
                label: "View",
                icon: <Eye className="h-4 w-4 text-[var(--violet)]" />,
                onClick: () => setViewCorrection(row),
              },
            ]}
          />
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

  const lockedPerson = selected
    ? members.find((m) => m.employeeId === selected.employeeId) || selected
    : null;
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
          ? "Daily punches for people who report to you. Use the 3-dot menu on a day, or on Team → Members, to mark a punch or request a correction."
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
          {isLogs && canRegularize ? (
            <Button
              type="button"
              variant="outline"
              onClick={() => openPunch("regularize")}
            >
              <ClipboardPen className="h-4 w-4" />
              Request correction
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
              : "Use a member’s 3-dot menu on Team → Members to request a correction for any day."
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
        open={Boolean(selected)}
        onClose={closePanel}
        wide
        title="Attendance details"
        subtitle={lockedPerson?.employeeName || selected?.employeeName || ""}
        footer={
          canFillSelected || canCorrectSelected ? (
            <div className="flex justify-end gap-2">
              {canFillSelected ? (
                <Button
                  type="button"
                  variant="outline"
                  className="h-11 rounded-xl"
                  onClick={() => openPunch("mark", { log: selected })}
                >
                  <Plus className="h-4 w-4" />
                  Fill punch
                </Button>
              ) : null}
              {canCorrectSelected ? (
                <Button
                  type="button"
                  className="h-11 rounded-xl"
                  onClick={() => openPunch("regularize", { log: selected })}
                >
                  <ClipboardPen className="h-4 w-4" />
                  Request correction
                </Button>
              ) : null}
            </div>
          ) : null
        }
      >
        {selected ? (
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
        ) : null}
      </SlideOver>

      <TeamPunchDrawer
        open={punch.open}
        mode={punch.mode}
        member={punch.member}
        log={punch.log}
        members={members}
        onClose={() =>
          setPunch({ open: false, mode: "mark", member: null, log: null })
        }
        onSuccess={(message) => {
          setFlash(message);
          setFlashTone("success");
          refetch();
        }}
      />

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
