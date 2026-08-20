import {
  CalendarClock,
  ClipboardList,
  Clock3,
  LogIn,
  LogOut,
  Timer,
} from "lucide-react";
import { Card } from "@/components/ui/Card";
import { formatTime } from "@/lib/format";

/**
 * Supports:
 * - dashboard `today` shape: { status, punchInAt, punchOutAt }
 * - attendance API today: { attTypeName, checkInTime, checkOutTime, isCheckedIn, lateMinutes, shiftName }
 * - null / empty → not checked in
 */
export function TodayStatusCard({ today, timeFormat = "12h", emptyMessage }) {
  const hasPunches = Boolean(
    today &&
      (today.punchInAt ||
        today.checkInTime ||
        today.isCheckedIn ||
        today.status ||
        today.attTypeName)
  );

  const status =
    today?.attTypeName ||
    today?.status ||
    (today?.isCheckedIn ? "Checked In" : null);
  const inTime = today?.checkInTime || today?.punchInAt;
  const outTime = today?.checkOutTime || today?.punchOutAt;
  const late = today?.lateMinutes;
  const isLate = Number(late) > 0;

  return (
    <Card
      title="Today's Status"
      className="h-full"
      bodyClassName="flex h-full flex-col"
    >
      {!hasPunches ? (
        <div className="flex flex-1 flex-col items-center justify-center rounded-xl border border-dashed border-[var(--border)] bg-[var(--panel-soft)] px-3 py-6 text-center">
          <ClipboardList
            className="h-10 w-10 text-[var(--muted)]"
            strokeWidth={1.3}
          />
          <p className="mt-3 text-[13px] font-semibold text-[var(--muted)]">
            No punches yet
          </p>
          <p className="mt-1 text-[12px] text-[var(--muted)]">
            {emptyMessage || "You haven't punched in today."}
          </p>
        </div>
      ) : (
        <div className="flex flex-1 flex-col gap-2.5">
          <div
            className={`rounded-xl border px-3 py-2.5 ${
              isLate
                ? "border-[var(--warning)]/25 bg-[var(--warning-soft)]"
                : "border-[var(--success)]/20 bg-[var(--success-soft)]"
            }`}
          >
            <p className="text-[10px] font-semibold uppercase tracking-wide text-[var(--muted)]">
              Attendance
            </p>
            <p className="mt-0.5 text-[15px] font-semibold text-[var(--text)]">
              {status || "Present"}
            </p>
          </div>

          {today?.shiftName ? (
            <div className="rounded-xl border border-[var(--border)] bg-[var(--panel-soft)] px-3 py-2.5">
              <div className="flex items-center gap-1.5 text-[10px] font-semibold uppercase tracking-wide text-[var(--muted)]">
                <CalendarClock className="h-3 w-3 text-[var(--violet)]" />
                Shift
              </div>
              <p className="mt-1 truncate text-[12px] font-semibold text-[var(--text)]">
                {today.shiftName}
              </p>
            </div>
          ) : null}

          <div className="grid flex-1 grid-cols-2 gap-2">
            <div className="rounded-xl border border-[var(--border)] bg-[var(--panel-soft)] px-3 py-2.5">
              <div className="flex items-center gap-1.5 text-[10px] font-semibold uppercase tracking-wide text-[var(--muted)]">
                <LogIn className="h-3 w-3 text-[var(--success)]" />
                In
              </div>
              <p className="mt-1 text-[13px] font-bold tabular-nums text-[var(--text)]">
                {inTime ? formatTime(inTime, timeFormat) : "—"}
              </p>
            </div>
            <div className="rounded-xl border border-[var(--border)] bg-[var(--panel-soft)] px-3 py-2.5">
              <div className="flex items-center gap-1.5 text-[10px] font-semibold uppercase tracking-wide text-[var(--muted)]">
                <LogOut className="h-3 w-3 text-[var(--violet)]" />
                Out
              </div>
              <p className="mt-1 text-[13px] font-bold tabular-nums text-[var(--text)]">
                {outTime ? formatTime(outTime, timeFormat) : "—"}
              </p>
            </div>
          </div>

          {late != null ? (
            <div
              className={`mt-auto flex items-center justify-between rounded-xl border px-3 py-2 ${
                isLate
                  ? "border-[var(--warning)]/25 bg-[var(--warning-soft)]"
                  : "border-[var(--border)] bg-[var(--panel-soft)]"
              }`}
            >
              <span className="inline-flex items-center gap-1.5 text-[11px] font-medium text-[var(--muted)]">
                <Timer className="h-3.5 w-3.5" />
                Late
              </span>
              <span
                className={`text-[12px] font-semibold tabular-nums ${
                  isLate ? "text-[var(--warning)]" : "text-[var(--text)]"
                }`}
              >
                {isLate ? `${late} min` : "On time"}
              </span>
            </div>
          ) : (
            <div className="mt-auto flex items-center gap-1.5 rounded-xl border border-[var(--border)] bg-[var(--panel-soft)] px-3 py-2 text-[11px] text-[var(--muted)]">
              <Clock3 className="h-3.5 w-3.5" />
              Live attendance snapshot
            </div>
          )}
        </div>
      )}
    </Card>
  );
}
