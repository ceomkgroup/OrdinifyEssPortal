"use client";

import { Card } from "@/components/ui/Card";
import { useModules } from "@/components/modules/ModulesProvider";
import { useAttendanceTypes } from "@/hooks/useAttendanceTypes";
import { getAttendanceTypeColor } from "@/lib/attendance-history";
import { formatHoursMinutes, formatMonthYear } from "@/lib/format";

function Stat({
  label,
  value,
  valueClass = "text-[var(--text)]",
  boxClass = "bg-[var(--panel-soft)]",
  style,
}) {
  return (
    <div
      className={`rounded-lg px-2 py-2.5 text-center ${boxClass}`}
      style={style}
    >
      <p className={`text-[16px] font-bold leading-none ${valueClass}`}>
        {value}
      </p>
      <p className="mt-1.5 text-[10px] leading-tight text-[var(--muted)]">
        {label}
      </p>
    </div>
  );
}

function TypeStat({ label, value, code, types, fallbackColor }) {
  const color =
    getAttendanceTypeColor(code, types) ||
    getAttendanceTypeColor(label, types) ||
    fallbackColor;
  if (!color) {
    return <Stat label={label} value={value} />;
  }
  return (
    <Stat
      label={label}
      value={value}
      valueClass=""
      boxClass=""
      style={{
        backgroundColor: `${color}18`,
        color,
      }}
    />
  );
}

/** Normalize dashboard.month OR monthly-summary API payload */
function normalizeMonth(attendance) {
  if (!attendance) return null;
  if (attendance.month && typeof attendance.month === "object") {
    return attendance.month;
  }
  if (attendance.year && attendance.month) {
    return {
      year: attendance.year,
      month: attendance.month,
      totalDays: attendance.totalDays ?? 0,
      present: attendance.presentCount ?? attendance.present ?? 0,
      absent: attendance.absentCount ?? attendance.absent ?? "—",
      leave: attendance.leaveCount ?? attendance.leave ?? "—",
      holiday: attendance.holidayCount ?? attendance.holiday ?? "—",
      halfDay: attendance.halfDayCount ?? attendance.halfDay ?? "—",
      late: attendance.lateCount ?? attendance.late ?? 0,
      totalWorkingHours: attendance.totalWorkingHours ?? 0,
      totalOvertimeHours: attendance.totalOvertimeHours ?? 0,
      totalLateMinutes: attendance.totalLateMinutes,
      totalBreakMinutes: attendance.totalBreakMinutes,
      graceUsedMinutes: attendance.graceUsedMinutes,
    };
  }
  return null;
}

export function AttendanceMonthCard({ attendance }) {
  const { hasFlag } = useModules();
  const { types } = useAttendanceTypes();
  const breakEnabled = hasFlag("breakManagement");
  const month = normalizeMonth(attendance);
  if (!month) return null;

  const hasLegacyBreakdown =
    month.absent !== "—" || month.leave !== "—" || month.holiday !== "—";

  return (
    <Card
      title={`Attendance This Month (${formatMonthYear(month.year, month.month)})`}
      className="h-full"
    >
      {hasLegacyBreakdown ? (
        <>
          <div className="grid grid-cols-3 gap-2 sm:grid-cols-6">
            <Stat label="Total Days" value={month.totalDays} />
            <TypeStat
              label="Present"
              value={month.present}
              code="P"
              types={types}
              fallbackColor="#22c55e"
            />
            <TypeStat
              label="Absent"
              value={month.absent}
              code="A"
              types={types}
              fallbackColor="#ef4444"
            />
            <TypeStat
              label="Leave"
              value={month.leave}
              code="CL"
              types={types}
              fallbackColor="#7b39ec"
            />
            <TypeStat
              label="Holiday"
              value={month.holiday}
              code="H"
              types={types}
              fallbackColor="#a0dab5"
            />
            <TypeStat
              label="Half Day"
              value={month.halfDay}
              code="HD"
              types={types}
              fallbackColor="#f97316"
            />
          </div>
          <div className="mt-2 grid grid-cols-1 gap-2 sm:grid-cols-3">
            <TypeStat
              label="Late"
              value={month.late}
              code="LP"
              types={types}
              fallbackColor="#f59e0b"
            />
            <Stat
              label="Total Working Hours"
              value={formatHoursMinutes(month.totalWorkingHours)}
            />
            <Stat
              label="Overtime Hours"
              value={formatHoursMinutes(month.totalOvertimeHours)}
            />
          </div>
          {breakEnabled ? (
            <div className="mt-2">
              <Stat label="Break Min" value={month.totalBreakMinutes ?? 0} />
            </div>
          ) : null}
        </>
      ) : (
        <div className="grid grid-cols-2 gap-2 sm:grid-cols-4">
          <Stat label="Total Days" value={month.totalDays} />
          <TypeStat
            label="Present"
            value={month.present}
            code="P"
            types={types}
            fallbackColor="#22c55e"
          />
          <TypeStat
            label="Late Days"
            value={month.late}
            code="LP"
            types={types}
            fallbackColor="#f59e0b"
          />
          <Stat label="Late Minutes" value={month.totalLateMinutes ?? 0} />
          <Stat
            label="Working Hours"
            value={formatHoursMinutes(month.totalWorkingHours)}
          />
          <Stat
            label="Overtime"
            value={formatHoursMinutes(month.totalOvertimeHours)}
          />
          {breakEnabled ? (
            <Stat label="Break Min" value={month.totalBreakMinutes ?? 0} />
          ) : null}
          <Stat label="Grace Used" value={month.graceUsedMinutes ?? 0} />
        </div>
      )}
    </Card>
  );
}
