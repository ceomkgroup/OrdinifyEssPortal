"use client";

import {
  Clock3,
  Coffee,
  Info,
  ShieldCheck,
  Timer,
} from "lucide-react";
import { Card } from "@/components/ui/Card";
import { PageLoader } from "@/components/ui/Spinner";
import { useAttendancePolicy } from "@/hooks/useAttendancePolicy";

function formatMinutes(mins) {
  if (mins == null) return "—";
  const n = Number(mins);
  if (!Number.isFinite(n)) return "—";
  if (n < 60) return `${Math.round(n)} min`;
  const h = Math.floor(n / 60);
  const m = Math.round(n % 60);
  return m > 0 ? `${h}h ${m}m` : `${h}h`;
}

function Rule({ label, value, icon: Icon }) {
  return (
    <div className="rounded-xl border border-[var(--border)] bg-[var(--panel-soft)]/50 px-3 py-2.5">
      <div className="flex items-center gap-1.5 text-[11px] font-semibold uppercase tracking-wide text-[var(--muted)]">
        {Icon ? <Icon className="h-3.5 w-3.5 text-[var(--violet)]" /> : null}
        {label}
      </div>
      <p className="mt-1 text-[13px] font-semibold tabular-nums text-[var(--text)]">
        {value}
      </p>
    </div>
  );
}

function sourceLabel(sources = {}) {
  const parts = [];
  if (sources.company) parts.push("Company");
  if (sources.department) parts.push("Department");
  if (sources.shift) parts.push("Shift");
  if (sources.employee) parts.push("Employee");
  return parts.length ? parts.join(" · ") : "Default";
}

/**
 * Read-only summary of merged attendance policy for the employee.
 */
export function AttendancePolicyCard() {
  const { policy, loading, error } = useAttendancePolicy();

  return (
    <Card
      title="Attendance policy"
      className="h-full"
      action={
        policy ? (
          <span className="inline-flex items-center gap-1 text-[11px] font-semibold text-[var(--muted)]">
            <ShieldCheck className="h-3.5 w-3.5 text-[var(--violet)]" />
            {sourceLabel(policy.sources)}
          </span>
        ) : null
      }
    >
      {loading && !policy ? (
        <PageLoader compact label="Loading policy" hint="Fetching your rules…" />
      ) : error && !policy ? (
        <p className="text-[13px] text-[var(--danger)]">{error}</p>
      ) : !policy ? (
        <p className="text-[13px] text-[var(--muted)]">
          No attendance policy available.
        </p>
      ) : (
        <div className="space-y-3">
          <div className="grid gap-2 sm:grid-cols-2 lg:grid-cols-3">
            <Rule
              icon={Timer}
              label="Grace"
              value={formatMinutes(policy.graceMinutes)}
            />
            <Rule
              icon={Clock3}
              label="Late after"
              value={formatMinutes(policy.lateAfterMinutes)}
            />
            <Rule
              icon={Clock3}
              label="Half day after"
              value={formatMinutes(policy.halfDayAfterMinutes)}
            />
            <Rule
              icon={Timer}
              label="Min. working hours"
              value={
                policy.minimumWorkingHours != null
                  ? `${policy.minimumWorkingHours} hrs`
                  : "—"
              }
            />
            <Rule
              icon={Coffee}
              label="Breaks"
              value={
                policy.allowBreaks
                  ? `${formatMinutes(policy.maxBreakMinutes)} · max ${
                      policy.maxBreakCount ?? "—"
                    }`
                  : "Not allowed"
              }
            />
            <Rule
              icon={Info}
              label="Overtime"
              value={
                policy.overtimeEnabled
                  ? policy.overtimeAfterHours != null
                    ? `After ${policy.overtimeAfterHours} hrs`
                    : "Enabled"
                  : "Disabled"
              }
            />
          </div>

          <div className="flex flex-wrap gap-1.5">
            {policy.paidBreaks && policy.allowBreaks ? (
              <span className="rounded-full bg-[var(--success-soft)] px-2.5 py-1 text-[10px] font-semibold text-[var(--success)]">
                Paid breaks
              </span>
            ) : null}
            {policy.earlyCheckoutPenalty ? (
              <span className="rounded-full bg-[var(--warning-soft)] px-2.5 py-1 text-[10px] font-semibold text-[var(--warning)]">
                Early checkout penalty
              </span>
            ) : null}
            {policy.holidayPolicy?.markHoliday ? (
              <span className="rounded-full bg-[var(--panel-soft)] px-2.5 py-1 text-[10px] font-semibold text-[var(--muted)]">
                Holidays marked
              </span>
            ) : null}
            {policy.weekendPolicy?.markWeekend ? (
              <span className="rounded-full bg-[var(--panel-soft)] px-2.5 py-1 text-[10px] font-semibold text-[var(--muted)]">
                Weekends marked
              </span>
            ) : null}
          </div>

          <p className="text-[11px] leading-relaxed text-[var(--muted)]">
            These rules are resolved for you from company / department / shift /
            employee settings. Punch and break limits follow this policy.
          </p>
        </div>
      )}
    </Card>
  );
}
