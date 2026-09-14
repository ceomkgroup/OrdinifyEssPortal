import Image from "next/image";
import { ArrowRight, Clock3, Moon, Sun, Timer } from "lucide-react";
import { Badge } from "@/components/ui/Badge";
import { Card } from "@/components/ui/Card";
import { formatTime } from "@/lib/format";
import { resolveMediaUrl } from "@/lib/media";

function parseShiftMinutes(time24) {
  if (!time24) return null;
  const raw = String(time24).trim();

  if (raw.includes("T") || raw.endsWith("Z")) {
    const date = new Date(raw);
    if (!Number.isNaN(date.getTime())) {
      return date.getHours() * 60 + date.getMinutes();
    }
  }

  const match = raw.match(/^(\d{1,2}):(\d{2})/);
  if (!match) return null;
  return Number(match[1]) * 60 + Number(match[2]);
}

function getShiftDurationLabel(shift) {
  const start = parseShiftMinutes(shift?.startTime);
  const end = parseShiftMinutes(shift?.endTime);
  if (start == null || end == null) return null;
  let mins = end - start;
  if (mins <= 0) mins += 24 * 60;
  const h = Math.floor(mins / 60);
  const m = mins % 60;
  if (h && m) return `${h}h ${m}m`;
  if (h) return `${h}h`;
  return `${m}m`;
}

function isDayShift(shift) {
  const mins = parseShiftMinutes(shift?.startTime);
  if (mins == null) return true;
  const hour = Math.floor(mins / 60);
  return hour >= 6 && hour < 18;
}

function isFlexibleShift(shift) {
  const type = String(shift?.shiftType || "").toUpperCase();
  return type.includes("FLEX");
}

export function ShiftCard({ shift, company, timeFormat = "12h" }) {
  if (!shift) {
    return (
      <Card title="Current Shift" className="h-full">
        <p className="heading-sub">No shift assigned</p>
      </Card>
    );
  }

  const logo = resolveMediaUrl(company?.logoUrl);
  const dayShift = isDayShift(shift);
  const ShiftIcon = dayShift ? Sun : Moon;
  const duration = getShiftDurationLabel(shift);
  const flexible = isFlexibleShift(shift);
  const hasTimes =
    parseShiftMinutes(shift.startTime) != null &&
    parseShiftMinutes(shift.endTime) != null;
  const typeLabel = shift.shiftType
    ? String(shift.shiftType).replace(/_/g, " ")
    : null;

  return (
    <Card
      className="h-full"
      bodyClassName="flex h-full min-h-0 flex-col gap-3"
    >
      <div className="flex shrink-0 min-w-0 flex-col gap-2 sm:flex-row sm:items-center sm:justify-between">
        <div className="flex min-w-0 items-center gap-2.5">
          {logo ? (
            <Image
              src={logo}
              alt={company?.companyName || "Company"}
              width={40}
              height={40}
              className="rounded-xl object-contain ring-1 ring-[var(--border)]"
              unoptimized
            />
          ) : (
            <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-[var(--lavender-soft)] text-sm font-bold text-[var(--violet)]">
              {(company?.companyName || "C").slice(0, 1)}
            </div>
          )}
          <div className="min-w-0">
            <p
              className="truncate text-[13px] font-semibold text-[var(--text)]"
              title={company?.companyName || "Company"}
            >
              {company?.companyName || "Company"}
            </p>
            <p className="text-[11px] text-[var(--muted)]">Current shift</p>
          </div>
        </div>
        {typeLabel ? (
          <Badge
            variant="violet"
            className="w-fit max-w-full shrink-0 truncate rounded-full text-[10px]"
            title={typeLabel}
          >
            {typeLabel}
          </Badge>
        ) : null}
      </div>

      {/* Grows with stretched grid height so tablet 2-col doesn't leave a dead gap */}
      <div className="flex min-h-0 flex-1 flex-col justify-center gap-4 rounded-2xl border border-[var(--lavender)]/70 bg-gradient-to-br from-[var(--lavender-soft)] via-[var(--surface)] to-[var(--panel-soft)] px-3.5 py-4">
        <div className="flex items-center gap-2.5">
          <span className="inline-flex h-9 w-9 shrink-0 items-center justify-center rounded-xl bg-[var(--surface)] shadow-sm">
            <ShiftIcon
              className={`h-4 w-4 ${
                dayShift ? "text-[var(--warning)]" : "text-[var(--violet)]"
              }`}
              fill="currentColor"
            />
          </span>
          <div className="min-w-0">
            <p className="text-[10px] font-semibold uppercase tracking-wide text-[var(--muted)]">
              {dayShift ? "Day shift" : "Night shift"}
              {flexible ? " · Flexible" : ""}
            </p>
            <p
              className="truncate text-[15px] font-semibold text-[var(--violet)]"
              title={shift.shiftName}
            >
              {shift.shiftName || "Shift"}
            </p>
          </div>
        </div>

        {hasTimes ? (
          <div className="flex min-w-0 items-center gap-2">
            <div className="min-w-0 flex-1 rounded-xl bg-[var(--surface)] px-2.5 py-3 ring-1 ring-[var(--border)] sm:px-3">
              <div className="flex items-center gap-1 text-[10px] font-semibold uppercase tracking-wide text-[var(--muted)]">
                <Clock3 className="h-3 w-3 shrink-0 text-[var(--violet)]" />
                Start
              </div>
              <p className="mt-1.5 truncate text-[14px] font-bold tabular-nums leading-none text-[var(--text)] sm:text-[16px]">
                {formatTime(shift.startTime, timeFormat)}
              </p>
            </div>

            <span className="inline-flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-[var(--violet)] text-white shadow-sm">
              <ArrowRight className="h-3.5 w-3.5" />
            </span>

            <div className="min-w-0 flex-1 rounded-xl bg-[var(--surface)] px-2.5 py-3 ring-1 ring-[var(--border)] sm:px-3">
              <div className="flex items-center gap-1 text-[10px] font-semibold uppercase tracking-wide text-[var(--muted)]">
                <Clock3 className="h-3 w-3 shrink-0 text-[var(--violet)]" />
                End
              </div>
              <p className="mt-1.5 truncate text-[14px] font-bold tabular-nums leading-none text-[var(--text)] sm:text-[16px]">
                {formatTime(shift.endTime, timeFormat)}
              </p>
            </div>
          </div>
        ) : (
          <div className="rounded-xl bg-[var(--surface)]/90 px-3 py-3 ring-1 ring-[var(--border)]">
            <p className="text-[12px] font-semibold text-[var(--text)]">
              {flexible ? "Flexible hours" : "No fixed timings"}
            </p>
            <p className="mt-1 text-[11px] leading-snug text-[var(--muted)]">
              {flexible
                ? "Start and end times are not fixed for this shift."
                : "Shift window is not set for today."}
            </p>
          </div>
        )}
      </div>

      {duration ? (
        <div className="flex shrink-0 items-center justify-between rounded-xl border border-[var(--border)] bg-[var(--panel-soft)] px-3 py-2">
          <span className="inline-flex items-center gap-1.5 text-[11px] font-medium text-[var(--muted)]">
            <Timer className="h-3.5 w-3.5 text-[var(--violet)]" />
            Duration
          </span>
          <span className="text-[12px] font-semibold tabular-nums text-[var(--text)]">
            {duration}
          </span>
        </div>
      ) : null}
    </Card>
  );
}
