"use client";

import { useEffect, useState } from "react";
import { Clock3, LogIn, LogOut } from "lucide-react";
import {
  listTeamAttendanceAll,
  markTeamAttendance,
  regularizeTeamAttendance,
} from "@/api/team";
import { Avatar } from "@/components/ui/Avatar";
import { Button } from "@/components/ui/Button";
import { MuiDateField } from "@/components/ui/MuiDateField";
import { SlideOver } from "@/components/ui/SlideOver";
import { FieldBlock, HintBanner } from "@/components/team/TeamDrawer";
import { useModules } from "@/components/modules/ModulesProvider";
import { useCompanySettings } from "@/hooks/useCompanySettings";
import { useTeam } from "@/components/team/TeamCapabilitiesProvider";
import { getApiErrorMessage } from "@/lib/api-error";
import { formatDate, formatTime } from "@/lib/format";

const fieldClass =
  "h-11 w-full rounded-xl border border-[var(--border)] bg-[var(--surface)] px-3 text-[13px] text-[var(--text)] outline-none transition focus:border-[var(--violet)] focus:ring-2 focus:ring-[var(--lavender-soft)]";

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

function emptyForm(employeeId = "") {
  return {
    employeeId,
    attendanceDate: ymdToday(),
    checkInTime: "",
    checkOutTime: "",
    breakOutTime: "",
    breakInTime: "",
    reason: "",
    logId: "",
  };
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
        className={`mt-1.5 ${fieldClass} ${locked ? "cursor-not-allowed opacity-60" : ""}`}
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

export function TeamPunchDrawer({
  open,
  mode = "mark",
  member = null,
  log = null,
  members = [],
  onClose,
  onSuccess,
}) {
  const isMark = mode === "mark";
  const { capabilities } = useTeam();
  const attendanceCap = capabilities?.attendance || {};
  const markDays = attendanceCap.markAttendanceWindowDays;
  const correctionDays = attendanceCap.correctionWindowDays;
  const { settings } = useCompanySettings();
  const { hasFlag } = useModules();
  const breakEnabled = hasFlag("breakManagement");
  const dateFormat = settings.dateFormat || "DD/MM/YYYY";
  const timeFormat = settings.timeFormat || "12h";

  const [form, setForm] = useState(() => emptyForm());
  const [saving, setSaving] = useState(false);
  const [formError, setFormError] = useState("");
  const [dayLog, setDayLog] = useState(null);
  const [dayLoading, setDayLoading] = useState(false);
  const firstMemberId = members[0]?.employeeId || "";
  const lockedMemberId = member?.employeeId || "";

  useEffect(() => {
    if (!open) return undefined;
    let alive = true;
    queueMicrotask(() => {
      if (!alive) return;
      setFormError("");
      setDayLog(null);
      if (log) {
        setForm({
          employeeId: log.employeeId || lockedMemberId || "",
          attendanceDate: toDateInputValue(log.attendanceDate),
          checkInTime: toTimeInputValue(log.checkInTime),
          checkOutTime: toTimeInputValue(log.checkOutTime),
          breakOutTime: toTimeInputValue(log.breakOutTime),
          breakInTime: toTimeInputValue(log.breakInTime),
          reason: "",
          logId: log.logId || "",
        });
        return;
      }
      setForm(emptyForm(lockedMemberId || firstMemberId));
    });
    return () => {
      alive = false;
    };
  }, [open, mode, log, lockedMemberId, firstMemberId]);

  useEffect(() => {
    if (!open || log || !form.employeeId || !form.attendanceDate) {
      return undefined;
    }
    let alive = true;
    queueMicrotask(() => {
      if (alive) setDayLoading(true);
    });
    (async () => {
      try {
        const res = await listTeamAttendanceAll({
          from: form.attendanceDate,
          to: form.attendanceDate,
        });
        if (!alive) return;
        const match =
          (res.rows || []).find(
            (row) => row.employeeId === form.employeeId
          ) || null;
        setDayLog(match);
        setForm((prev) => ({
          ...prev,
          logId: match?.logId || "",
          checkInTime: toTimeInputValue(match?.checkInTime),
          checkOutTime: toTimeInputValue(match?.checkOutTime),
          breakOutTime: toTimeInputValue(match?.breakOutTime),
          breakInTime: toTimeInputValue(match?.breakInTime),
        }));
      } catch {
        if (!alive) return;
        setDayLog(null);
      } finally {
        if (alive) setDayLoading(false);
      }
    })();
    return () => {
      alive = false;
    };
  }, [open, log, form.employeeId, form.attendanceDate]);

  const lockedPerson =
    member ||
    (log
      ? members.find((m) => m.employeeId === log.employeeId) || log
      : null);
  const formMember =
    lockedPerson || members.find((m) => m.employeeId === form.employeeId);
  const effectiveLog = log || dayLog;
  const lockIn = isMark && Boolean(effectiveLog?.checkInTime);
  const lockOut = isMark && Boolean(effectiveLog?.checkOutTime);
  const lockBreakOut = isMark && Boolean(effectiveLog?.breakOutTime);
  const lockBreakIn = isMark && Boolean(effectiveLog?.breakInTime);
  const windowDays = isMark ? markDays : correctionDays;
  const bothPunched = Boolean(
    isMark && effectiveLog?.checkInTime && effectiveLog?.checkOutTime
  );

  const title = isMark
    ? effectiveLog
      ? "Fill missing punch"
      : "Mark punch"
    : "Request correction";

  async function submitForm() {
    setFormError("");
    if (!form.employeeId || !form.attendanceDate) {
      setFormError("Employee and date are required.");
      return;
    }
    if (!isMark && !form.reason.trim()) {
      setFormError("Add a reason for this correction.");
      return;
    }
    const checkInTime = toIsoFromLocal(form.attendanceDate, form.checkInTime);
    const checkOutTime = toIsoFromLocal(form.attendanceDate, form.checkOutTime);
    if (!checkInTime && !checkOutTime) {
      setFormError("Enter at least check-in or check-out time.");
      return;
    }
    if (isMark && bothPunched) {
      setFormError(
        "Both punches are already filled. Use Request correction instead."
      );
      return;
    }
    setSaving(true);
    try {
      if (isMark) {
        const payload = { attendanceDate: form.attendanceDate };
        if (!effectiveLog?.checkInTime && checkInTime) payload.checkInTime = checkInTime;
        if (!effectiveLog?.checkOutTime && checkOutTime) {
          payload.checkOutTime = checkOutTime;
        }
        if (breakEnabled) {
          if (!effectiveLog?.breakOutTime && form.breakOutTime) {
            payload.breakOutTime = toIsoFromLocal(
              form.attendanceDate,
              form.breakOutTime
            );
          }
          if (!effectiveLog?.breakInTime && form.breakInTime) {
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
        onSuccess?.("Missing punch filled for this team member.");
      } else {
        await regularizeTeamAttendance(form.employeeId, {
          logId: form.logId || effectiveLog?.logId || undefined,
          attendanceDate:
            effectiveLog?.attendanceDate || form.attendanceDate,
          checkInTime,
          checkOutTime,
          reason: form.reason.trim(),
        });
        onSuccess?.(
          "Correction submitted. Track it under Team → Corrections while it waits for approval."
        );
      }
      onClose?.();
    } catch (err) {
      setFormError(getApiErrorMessage(err, "Could not save attendance."));
    } finally {
      setSaving(false);
    }
  }

  return (
    <SlideOver
      open={open}
      onClose={onClose}
      wide
      title={title}
      subtitle={
        formMember?.employeeName ||
        (isMark ? "Choose a team member and the missing times" : "")
      }
      footer={
        <div className="flex justify-end gap-2">
          <Button
            type="button"
            variant="outline"
            className="h-11 min-w-[100px] rounded-xl"
            onClick={onClose}
            disabled={saving}
          >
            Cancel
          </Button>
          <Button
            type="button"
            className="h-11 min-w-[150px] rounded-xl"
            onClick={submitForm}
            disabled={saving || bothPunched}
          >
            {saving
              ? "Saving…"
              : isMark
                ? "Save punch"
                : "Submit correction"}
          </Button>
        </div>
      }
    >
      {formError ? (
        <p className="mb-3 rounded-xl border border-[var(--danger)]/20 bg-[var(--danger-soft)] px-3 py-2 text-[13px] text-[var(--danger)]">
          {formError}
        </p>
      ) : null}

      <div className="space-y-4">
        <HintBanner icon={Clock3}>
          {isMark ? (
            <span>
              Mark punch only fills missing times. Punched times stay locked.
              To change a time that already exists, use Request correction.
              Pick the employee and the date — you do not need to open that
              day’s log first.
            </span>
          ) : (
            <span>
              This sends a correction for approval. Pick the employee and the
              date, then set the correct in/out times. Track it later under
              Team → Corrections.
            </span>
          )}
        </HintBanner>

        {lockedPerson ? (
          <MemberCard person={lockedPerson} />
        ) : (
          <div className="space-y-2">
            <MemberCard
              person={members.find((m) => m.employeeId === form.employeeId)}
            />
            <label className="block text-[12px] font-semibold text-[var(--text)]">
              Team member
              <select
                className={`mt-1.5 ${fieldClass}`}
                value={form.employeeId}
                onChange={(e) =>
                  setForm((prev) => ({ ...prev, employeeId: e.target.value }))
                }
              >
                {!form.employeeId ? (
                  <option value="">Select a team member</option>
                ) : null}
                {members.map((item) => (
                  <option key={item.employeeId} value={item.employeeId}>
                    {item.employeeName} ({item.employeeCode})
                  </option>
                ))}
              </select>
            </label>
          </div>
        )}

        {log ? (
          <div className="rounded-2xl border border-[var(--border)] bg-[var(--panel-soft)] px-3 py-3">
            <p className="text-[11px] font-semibold uppercase tracking-wide text-[var(--muted)]">
              Date
            </p>
            <p className="mt-1 text-[14px] font-semibold text-[var(--text)]">
              {formatDate(log.attendanceDate, dateFormat)}
            </p>
          </div>
        ) : (
          <MuiDateField
            label="Attendance date"
            required
            dateFormat={dateFormat}
            value={form.attendanceDate}
            min={
              windowDays != null ? ymdDaysAgo(windowDays) : undefined
            }
            max={ymdToday()}
            onChange={(next) =>
              setForm((prev) => ({ ...prev, attendanceDate: next }))
            }
          />
        )}

        {dayLoading && !log ? (
          <p className="text-[12px] text-[var(--muted)]">
            Loading that day’s punches…
          </p>
        ) : null}

        {bothPunched ? (
          <p className="rounded-xl border border-[var(--violet)]/20 bg-[var(--lavender-soft)] px-3 py-2 text-[13px] text-[var(--violet)]">
            Both punches are already filled for this date. Use Request
            correction to change a time.
          </p>
        ) : null}

        <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
          <TimeCard
            label="Check in"
            icon={LogIn}
            value={form.checkInTime}
            onChange={(checkInTime) =>
              setForm((prev) => ({ ...prev, checkInTime }))
            }
            currentIso={effectiveLog?.checkInTime}
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
            currentIso={effectiveLog?.checkOutTime}
            timeFormat={timeFormat}
            locked={lockOut}
            emptyHint="Not punched yet"
          />
        </div>

        {isMark && breakEnabled ? (
          <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
            <TimeCard
              label="Break out"
              icon={Clock3}
              value={form.breakOutTime}
              onChange={(breakOutTime) =>
                setForm((prev) => ({ ...prev, breakOutTime }))
              }
              currentIso={effectiveLog?.breakOutTime}
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
              currentIso={effectiveLog?.breakInTime}
              timeFormat={timeFormat}
              locked={lockBreakIn}
              emptyHint="Optional"
            />
          </div>
        ) : null}

        {!isMark ? (
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
    </SlideOver>
  );
}
