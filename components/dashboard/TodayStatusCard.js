import { ClipboardList } from "lucide-react";
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

  return (
    <Card title="Today's Status" className="h-full">
      {!hasPunches ? (
        <div className="flex h-full min-h-[140px] flex-col items-center justify-center text-center">
          <ClipboardList
            className="h-11 w-11 text-[var(--muted)]"
            strokeWidth={1.3}
          />
          <p className="mt-3 text-[13px] font-semibold text-[var(--muted)]">
            No punches yet.
          </p>
          <p className="mt-1 text-[12px] text-[var(--muted)]">
            {emptyMessage || "You haven't punched in today."}
          </p>
        </div>
      ) : (
        <div className="space-y-3 text-[13px]">
          {status ? (
            <p className="font-semibold text-[var(--text)]">{status}</p>
          ) : null}
          {today?.shiftName ? (
            <p className="text-[var(--muted)]">
              Shift:{" "}
              <span className="font-medium text-[var(--text)]">
                {today.shiftName}
              </span>
            </p>
          ) : null}
          {inTime ? (
            <p className="text-[var(--muted)]">
              In:{" "}
              <span className="font-medium text-[var(--text)]">
                {formatTime(inTime, timeFormat)}
              </span>
            </p>
          ) : null}
          {outTime ? (
            <p className="text-[var(--muted)]">
              Out:{" "}
              <span className="font-medium text-[var(--text)]">
                {formatTime(outTime, timeFormat)}
              </span>
            </p>
          ) : null}
          {today?.lateMinutes != null ? (
            <p className="text-[var(--muted)]">
              Late:{" "}
              <span className="font-medium text-[var(--text)]">
                {today.lateMinutes} min
              </span>
            </p>
          ) : null}
        </div>
      )}
    </Card>
  );
}
