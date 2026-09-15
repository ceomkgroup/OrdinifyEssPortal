"use client";

import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { createPortal } from "react-dom";
import Link from "next/link";
import {
  ArrowRight,
  CalendarDays,
  FilePenLine,
  Monitor,
  MoreVertical,
  Pencil,
} from "lucide-react";
import { getAttendanceHistoryAll } from "@/api/attendance";
import { AttendanceTypeBadge } from "@/components/attendance/AttendanceTypeBadge";
import { useAuth } from "@/components/auth/AuthProvider";
import { useModules } from "@/components/modules/ModulesProvider";
import { Avatar } from "@/components/ui/Avatar";
import { Button } from "@/components/ui/Button";
import { AttendanceStatusFilter } from "@/components/attendance/AttendanceStatusFilter";
import { FilterDrawerDateRange } from "@/components/ui/FilterDrawerDateRange";
import { MetaBadge } from "@/components/ui/MetaBadge";
import { PageLoader } from "@/components/ui/Spinner";
import { CollapsibleSection } from "@/components/ui/CollapsibleSection";
import { SoftStat, SUMMARY_GRID_CLASS } from "@/components/ui/SoftStat";
import { PortalPage } from "@/components/ui/PortalPage";
import { TablePanel } from "@/components/ui/TablePanel";
import { useAttendancePage } from "@/hooks/useAttendance";
import { useAttendanceTypes } from "@/hooks/useAttendanceTypes";
import { useCompanySettings } from "@/hooks/useCompanySettings";
import {
  readQueryString,
  usePortalQuery,
} from "@/hooks/usePortalQuery";
import {
  attendanceRowsToCsv,
  downloadCsv,
  filterAttendanceByStatus,
  getAttendanceTypeColor,
} from "@/lib/attendance-history";
import {
  formatDate,
  formatHoursMinutes,
  formatMonthYear,
  formatTime,
  getDisplayName,
} from "@/lib/format";

const RANGE_TABS = [
  { key: "week", label: "This Week" },
  { key: "month", label: "This Month" },
  { key: "lastMonth", label: "Last Month" },
  { key: "year", label: "This Year" },
];

function pickNumber(...values) {
  for (const value of values) {
    if (value == null || value === "") continue;
    const n = Number(value);
    if (Number.isFinite(n)) return n;
  }
  return null;
}

function DateRangeBadge({ from, to, dateFormat = "DD/MM/YYYY", className = "" }) {
  if (!from && !to) return null;
  return (
    <MetaBadge className={className}>
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

function HistoryRowActions({ logId }) {
  const [open, setOpen] = useState(false);
  const [coords, setCoords] = useState({ top: 0, left: 0 });
  const buttonRef = useRef(null);

  useEffect(() => {
    if (!open) return undefined;

    function placeMenu() {
      const rect = buttonRef.current?.getBoundingClientRect();
      if (!rect) return;
      const menuWidth = 224;
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
        event.target.closest?.(`[data-history-menu="${logId}"]`)
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
  }, [open, logId]);

  if (!logId) return null;

  return (
    <>
      <button
        ref={buttonRef}
        type="button"
        className="inline-flex h-8 w-8 items-center justify-center rounded-lg text-[var(--muted)] transition hover:bg-[var(--panel-soft)] hover:text-[var(--text)]"
        aria-label="Row actions"
        onClick={() => setOpen((v) => !v)}
      >
        <MoreVertical className="h-4 w-4" />
      </button>
      {open && typeof document !== "undefined"
        ? createPortal(
            <div
              data-history-menu={logId}
              className="fixed z-[90] w-56 overflow-hidden rounded-xl border border-[var(--border)] bg-[var(--surface)] shadow-[0_12px_32px_rgba(15,23,42,0.14)]"
              style={{ top: coords.top, left: coords.left }}
            >
              <Link
                href={`/requests/attendance-change?logId=${encodeURIComponent(logId)}`}
                className="flex items-center gap-2.5 px-3 py-2.5 text-[13px] font-semibold text-[var(--text)] hover:bg-[var(--panel-soft)]"
                onClick={() => setOpen(false)}
              >
                <FilePenLine className="h-4 w-4 text-[var(--violet)]" />
                Request change
              </Link>
            </div>,
            document.body
          )
        : null}
    </>
  );
}

function breakTimes(row) {
  const logs = row?.breaks || row?.breakLogs || row?.breakHistory || [];
  const last = Array.isArray(logs) && logs.length ? logs[logs.length - 1] : null;
  return {
    breakOut:
      row?.breakOutTime ||
      row?.lastBreakOutTime ||
      last?.breakOutTime ||
      last?.outTime ||
      null,
    breakIn:
      row?.breakInTime ||
      row?.lastBreakInTime ||
      last?.breakInTime ||
      last?.inTime ||
      null,
    minutes: pickNumber(row?.breakMinutes, row?.totalBreakMinutes, last?.minutes),
  };
}

export function AttendanceView() {
  const { employee } = useAuth();
  const { settings } = useCompanySettings();
  const { hasFlag, hasScreen } = useModules();
  const breakEnabled = hasFlag("breakManagement");
  const canRequestChange = hasScreen("attendanceChange");

  const dateFormat = settings.dateFormat || "DD/MM/YYYY";
  const timeFormat = settings.timeFormat || "12h";
  const displayName = getDisplayName(employee) || "Employee";
  const empCode =
    employee?.employeeCode || employee?.empCode || employee?.code || "";

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
    history,
    meta,
    summary,
    summaryYear,
    summaryMonth,
    summaryLoading,
    loading,
    historyLoading,
    error,
    refetch,
  } = useAttendancePage();

  const { types: attendanceTypes, filterOptions: statusFilterOptions } =
    useAttendanceTypes();

  const { searchParams, replaceQuery } = usePortalQuery();

  const [statusFilter, setStatusFilter] = useState(() =>
    readQueryString(searchParams, "status", "all")
  );
  const [historyQuery, setHistoryQuery] = useState(() =>
    readQueryString(searchParams, "q", "")
  );
  const [draftStatus, setDraftStatus] = useState(() =>
    readQueryString(searchParams, "status", "all")
  );
  const [draftFrom, setDraftFrom] = useState("");
  const [draftTo, setDraftTo] = useState("");
  const [logsCollapsed, setLogsCollapsed] = useState(false);
  const [monthRows, setMonthRows] = useState([]);
  const [monthRowsLoading, setMonthRowsLoading] = useState(false);
  const [exporting, setExporting] = useState(false);
  const [filterError, setFilterError] = useState("");

  const searchActive = Boolean(historyQuery.trim());
  const statusActive = statusFilter !== "all";
  /** Status or search need full-range rows (not server page only). */
  const clientFilterActive = statusActive || searchActive;
  const activeFilterCount =
    (statusActive ? 1 : 0) + (rangePreset === "custom" ? 1 : 0);

  const queryDefaults = {
    range: "month",
    from: "",
    to: "",
    page: "1",
    limit: "10",
    status: "all",
    q: "",
  };

  // Persist list state in the URL (survives reload / hard refresh).
  useEffect(() => {
    replaceQuery(
      {
        range: rangePreset,
        from: rangePreset === "custom" ? customFrom : "",
        to: rangePreset === "custom" ? customTo : "",
        page,
        limit,
        status: statusFilter,
        q: historyQuery,
      },
      queryDefaults
    );
  }, [
    rangePreset,
    customFrom,
    customTo,
    page,
    limit,
    statusFilter,
    historyQuery,
    replaceQuery,
  ]);

  // Keep drawer drafts aligned with applied filters (ListToolbar has no onOpen sync).
  useEffect(() => {
    setDraftStatus(statusFilter);
    setDraftFrom(customFrom || range.from);
    setDraftTo(customTo || range.to);
  }, [statusFilter, customFrom, customTo, range.from, range.to]);

  useEffect(() => {
    let alive = true;

    if (!clientFilterActive) {
      queueMicrotask(() => {
        if (!alive) return;
        setMonthRows([]);
        setMonthRowsLoading(false);
        setFilterError("");
      });
      return () => {
        alive = false;
      };
    }

    if (rangePreset === "custom" && (!customFrom || !customTo)) {
      return () => {
        alive = false;
      };
    }

    queueMicrotask(() => {
      if (alive) {
        setMonthRowsLoading(true);
        setFilterError("");
      }
    });

    (async () => {
      try {
        const rows = await getAttendanceHistoryAll({
          from: range.from,
          to: range.to,
        });
        if (!alive) return;
        setMonthRows(rows);
      } catch (err) {
        if (!alive) return;
        setMonthRows([]);
        setFilterError(err.message || "Failed to load filtered history");
      } finally {
        if (alive) setMonthRowsLoading(false);
      }
    })();

    return () => {
      alive = false;
    };
  }, [
    clientFilterActive,
    range.from,
    range.to,
    rangePreset,
    customFrom,
    customTo,
  ]);

  const filteredRows = useMemo(() => {
    let rows = clientFilterActive ? monthRows : history;
    if (statusActive) {
      rows = filterAttendanceByStatus(rows, statusFilter, attendanceTypes);
    }
    const q = historyQuery.trim().toLowerCase();
    if (!q) return rows || [];
    return (rows || []).filter((row) => {
      const hay = [
        row.attendanceDate,
        formatDate(row.attendanceDate, dateFormat),
        row.attTypeName,
        row.attTypeCode,
        row.statusLabel,
        row.shiftName,
        row.punchSource,
        row.isManualOverride ? "Manual" : "",
        row.checkInTime,
        row.checkOutTime,
        formatTime(row.checkInTime, timeFormat),
        formatTime(row.checkOutTime, timeFormat),
        row.remarks,
      ]
        .filter(Boolean)
        .join(" ")
        .toLowerCase();
      return hay.includes(q);
    });
  }, [
    clientFilterActive,
    monthRows,
    history,
    statusActive,
    statusFilter,
    attendanceTypes,
    historyQuery,
    dateFormat,
    timeFormat,
  ]);

  const displayRows = useMemo(() => {
    if (!clientFilterActive) return history || [];
    return filteredRows.slice((page - 1) * limit, page * limit);
  }, [clientFilterActive, filteredRows, history, page, limit]);

  const total = clientFilterActive
    ? filteredRows.length
    : Number(meta?.total) || 0;
  const currentPage = clientFilterActive ? page : Number(meta?.page) || page;
  const pageLimit = clientFilterActive
    ? limit
    : Number(meta?.limit) || limit;
  const totalPages = clientFilterActive
    ? Math.max(1, Math.ceil(total / pageLimit) || 1)
    : Math.max(1, Number(meta?.totalPages) || 1);
  const listLoading = historyLoading || (clientFilterActive && monthRowsLoading);

  useEffect(() => {
    if (clientFilterActive && page > totalPages) {
      setPage(1);
    }
  }, [clientFilterActive, page, totalPages, setPage]);

  function applyFilters() {
    setStatusFilter(draftStatus);
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
    setPage(1);
    if (rangePreset === "custom") {
      setPreset("month");
    }
  }

  function onSearchChange(next) {
    setHistoryQuery(next);
    setPage(1);
  }

  const handleExportCsv = useCallback(async () => {
    setExporting(true);
    setFilterError("");
    try {
      const rows = await getAttendanceHistoryAll({
        from: range.from,
        to: range.to,
      });
      const filtered = filterAttendanceByStatus(
        rows,
        statusFilter,
        attendanceTypes
      );
      const csv = attendanceRowsToCsv(filtered, { includeBreak: breakEnabled });
      downloadCsv(
        `attendance-${range.from}_${range.to}.csv`,
        csv
      );
    } catch (err) {
      setFilterError(err.message || "Failed to export CSV");
    } finally {
      setExporting(false);
    }
  }, [range.from, range.to, statusFilter, breakEnabled, attendanceTypes]);

  const columns = useMemo(() => {
    const cols = [
      {
        id: "employee",
        header: "Employee",
        headerClassName: "px-3",
        cellClassName: "px-3",
        cell: () => (
          <div className="flex items-center gap-2">
            <Avatar person={employee} name={displayName} size={28} />
            <div className="min-w-0 leading-tight">
              <p className="truncate text-[12px] font-semibold text-[var(--text)]">
                {displayName}
              </p>
              {empCode ? (
                <p className="text-[10px] text-[var(--muted)]">#{empCode}</p>
              ) : null}
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
            source={
              row.punchSource || (row.isManualOverride ? "Manual" : null)
            }
          />
        ),
      },
      {
        id: "shift",
        header: "Shift",
        cellClassName: "max-w-[140px] truncate text-[var(--muted)]",
        cell: (row) => (
          <span title={row.shiftName || ""}>{row.shiftName || "—"}</span>
        ),
      },
      {
        id: "checkIn",
        header: "Check In",
        cellClassName: "whitespace-nowrap font-semibold text-[var(--success)]",
        cell: (row) => formatTime(row.checkInTime, timeFormat),
      },
      {
        id: "checkOut",
        header: "Check Out",
        cellClassName: "whitespace-nowrap font-semibold text-[var(--violet)]",
        cell: (row) => formatTime(row.checkOutTime, timeFormat),
      },
      {
        id: "hours",
        header: "Hours",
        cell: (row) => <HoursPill value={row.workingHours} />,
      },
      {
        id: "late",
        header: "Late",
        cellClassName: (row) => {
          const late = Number(row.lateMinutes) || 0;
          return `whitespace-nowrap tabular-nums ${
            late > 0
              ? "font-semibold text-[var(--warning)]"
              : "text-[var(--muted)]"
          }`;
        },
        cell: (row) => {
          const late = Number(row.lateMinutes) || 0;
          if (late <= 0) return "—";
          return late < 60
            ? `${late}m`
            : `${Math.floor(late / 60)}h ${late % 60}m`;
        },
      },
      {
        id: "break",
        header: "Break",
        cellClassName: "whitespace-nowrap",
        cell: (row) => {
          const breakMins = breakTimes(row).minutes;
          if (breakMins != null && breakMins > 0) {
            return (
              <span className="text-[12px] font-medium text-[var(--text)]">
                {Math.round(breakMins)} min
              </span>
            );
          }
          return (
            <span className="text-[12px] font-medium text-[var(--info)]">
              No break
            </span>
          );
        },
      },
    ];

    if (breakEnabled) {
      cols.push(
        {
          id: "breakOut",
          header: "Break Out",
          cellClassName: "whitespace-nowrap text-[var(--muted)]",
          cell: (row) => formatTime(breakTimes(row).breakOut, timeFormat),
        },
        {
          id: "breakIn",
          header: "Break In",
          cellClassName: "whitespace-nowrap text-[var(--muted)]",
          cell: (row) => formatTime(breakTimes(row).breakIn, timeFormat),
        },
        {
          id: "breakMin",
          header: "Break Min",
          cellClassName: "whitespace-nowrap text-[var(--muted)]",
          cell: (row) => {
            const breakMins = breakTimes(row).minutes;
            return breakMins != null ? `${Math.round(breakMins)}` : "—";
          },
        }
      );
    }

    if (canRequestChange) {
      cols.push({
        id: "action",
        header: "Action",
        cell: (row) => <HistoryRowActions logId={row.logId} />,
      });
    }

    return cols;
  }, [
    employee,
    displayName,
    empCode,
    dateFormat,
    timeFormat,
    attendanceTypes,
    breakEnabled,
    canRequestChange,
  ]);

  if (loading && historyLoading && !history.length) {
    return (
      <PageLoader
        label="Loading attendance"
        hint="Fetching attendance logs…"
      />
    );
  }

  return (
    <PortalPage
      fill
      title="Attendance"
      subtitle="Your monthly summary and attendance logs"
      error={error}
      actions={
        <>
          <DateRangeBadge
            from={range.from}
            to={range.to}
            dateFormat={dateFormat}
          />
          <Button
            type="button"
            variant="outline"
            className="h-10 rounded-xl"
            onClick={refetch}
            disabled={historyLoading || summaryLoading}
          >
            Refresh
          </Button>
        </>
      }
    >
      <CollapsibleSection
        title={`Monthly Summary (${formatMonthYear(summaryYear, summaryMonth)})`}
      >
        {summaryLoading && !summary ? (
          <p className="text-sm text-[var(--muted)]">Loading summary…</p>
        ) : (
          <div className={SUMMARY_GRID_CLASS}>
            <SoftStat label="Total Days" value={summary?.totalDays ?? 0} />
            <SoftStat
              label="Present"
              value={summary?.presentCount ?? summary?.present ?? 0}
              color={getAttendanceTypeColor("P", attendanceTypes, "#22c55e")}
            />
            {summary?.absentCount != null || summary?.absent != null ? (
              <SoftStat
                label="Absent"
                value={summary?.absentCount ?? summary?.absent}
                color={getAttendanceTypeColor("A", attendanceTypes, "#ef4444")}
              />
            ) : null}
            {summary?.leaveCount != null || summary?.leave != null ? (
              <SoftStat
                label="Leave"
                value={summary?.leaveCount ?? summary?.leave}
                color={getAttendanceTypeColor("CL", attendanceTypes, "#7b39ec")}
              />
            ) : null}
            {summary?.holidayCount != null || summary?.holiday != null ? (
              <SoftStat
                label="Holiday"
                value={summary?.holidayCount ?? summary?.holiday}
                color={getAttendanceTypeColor("H", attendanceTypes, "#a0dab5")}
              />
            ) : null}
            {summary?.halfDayCount != null || summary?.halfDay != null ? (
              <SoftStat
                label="Half Day"
                value={summary?.halfDayCount ?? summary?.halfDay}
                color={getAttendanceTypeColor("HD", attendanceTypes, "#f97316")}
              />
            ) : null}
            <SoftStat
              label="Late Minutes"
              value={summary?.totalLateMinutes ?? 0}
            />
            <SoftStat
              label="Working Hours"
              value={formatHoursMinutes(summary?.totalWorkingHours)}
            />
          </div>
        )}
      </CollapsibleSection>

      <TablePanel
        title="Attendance Logs"
        headerExtra={
          <DateRangeBadge
            from={range.from}
            to={range.to}
            dateFormat={dateFormat}
          />
        }
        collapsible
        collapsed={logsCollapsed}
        onCollapsedChange={setLogsCollapsed}
        tabs={RANGE_TABS.map((t) => ({ value: t.key, label: t.label }))}
        tab={rangePreset === "custom" ? "" : rangePreset}
        onTabChange={setPreset}
        recordCount={total}
        search={historyQuery}
        onSearchChange={onSearchChange}
        searchPlaceholder="Search logs…"
        filterActive={activeFilterCount >= 1}
        activeFilterCount={activeFilterCount}
        filterTitle="Filters"
        filterSubtitle="Status and custom date range"
        drawerFields={
          <div className="space-y-5">
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
              title="Custom date range"
              hint="Apply uses these dates for attendance logs."
            />
          </div>
        }
        onApplyFilters={applyFilters}
        onResetFilters={resetFilters}
        onExport={handleExportCsv}
        exporting={exporting}
        onRefresh={refetch}
        columns={columns}
        rows={displayRows}
        getRowKey={(row) => row.logId || row.attendanceDate}
        minWidth="1100px"
        loading={listLoading}
        loadingLabel="Loading attendance"
        loadingHint="Fetching attendance logs…"
        error={filterError}
        emptyTitle="No attendance logs for this period."
        page={currentPage}
        pageSize={pageLimit}
        total={total}
        totalPages={totalPages}
        onPageChange={setPage}
        onPageSizeChange={setPageSize}
      />
    </PortalPage>
  );
}
