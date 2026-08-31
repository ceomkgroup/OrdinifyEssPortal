"use client";

import {
  BadgeCheck,
  CalendarDays,
  CheckCircle2,
  Clock3,
  Database,
  IdCard,
  Info,
  Plus,
  RefreshCcw,
  RefreshCw,
  ShieldCheck,
  UserRound,
} from "lucide-react";
import Link from "next/link";
import { useModules } from "@/components/modules/ModulesProvider";
import { Button } from "@/components/ui/Button";
import { PortalPage } from "@/components/ui/PortalPage";
import { PageLoader } from "@/components/ui/Spinner";
import { useCompanySettings } from "@/hooks/useCompanySettings";
import { useMyShift } from "@/hooks/useMyShift";
import { formatDate, formatTime } from "@/lib/format";

function parseMins(time24) {
  if (!time24) return null;
  const match = String(time24).trim().match(/^(\d{1,2}):(\d{2})/);
  if (!match) return null;
  return Number(match[1]) * 60 + Number(match[2]);
}

function addMinutesLabel(time24, delta, timeFormat) {
  const mins = parseMins(time24);
  if (mins == null) return null;
  let total = mins + delta;
  if (total < 0) total += 24 * 60;
  total %= 24 * 60;
  const h = Math.floor(total / 60);
  const m = total % 60;
  const clock = `${String(h).padStart(2, "0")}:${String(m).padStart(2, "0")}`;
  return formatTime(clock, timeFormat);
}

function DetailCell({ icon: Icon, label, value, valueNode }) {
  return (
    <div className="flex min-w-0 items-start gap-2.5 py-3.5">
      <span className="mt-0.5 inline-flex h-8 w-8 shrink-0 items-center justify-center rounded-lg bg-[var(--panel-soft)] text-[var(--muted)]">
        <Icon className="h-4 w-4" />
      </span>
      <div className="min-w-0">
        <p className="text-[12px] text-[var(--muted)]">{label}</p>
        {valueNode ? (
          valueNode
        ) : (
          <p className="mt-0.5 break-all text-[13px] font-semibold text-[var(--text)]">
            {value ?? "—"}
          </p>
        )}
      </div>
    </div>
  );
}

export function MyShiftView() {
  const { shift, loading, error, refetch } = useMyShift();
  const { settings } = useCompanySettings();
  const { canShowRequestTile } = useModules();
  const canRequestChange = canShowRequestTile("shiftChange");

  const timeFormat = settings.timeFormat || "12h";
  const dateFormat = settings.dateFormat || "DD/MM/YYYY";

  if (loading && !shift) {
    return (
      <PageLoader
        label="Loading my shift"
        hint="Fetching your current assignment…"
      />
    );
  }

  const hasShift = Boolean(shift?.hasShift);
  const lateLimit = hasShift
    ? addMinutesLabel(
        shift.startTime,
        shift.lateInGracePeriodMinutes || 0,
        timeFormat
      )
    : null;
  const earlyLimit = hasShift
    ? addMinutesLabel(
        shift.endTime,
        -(shift.earlyOutGracePeriodMinutes || 0),
        timeFormat
      )
    : null;

  return (
    <PortalPage
      title="My Shift"
      subtitle="View your current shift details and timings."
      error={error}
      actions={
        <>
          <Button
            type="button"
            variant="outline"
            className="h-10 rounded-xl"
            onClick={refetch}
          >
            <RefreshCw className="h-4 w-4" />
            Refresh
          </Button>
          {canRequestChange ? (
            <Link
              href="/requests/shift-change?new=1"
              className="inline-flex h-10 items-center justify-center gap-2 rounded-xl bg-[var(--violet)] px-4 text-[13px] font-semibold !text-white no-underline transition hover:opacity-95 hover:!text-white"
            >
              <Plus className="h-4 w-4 text-white" />
              Request shift change
            </Link>
          ) : null}
        </>
      }
    >
      {!hasShift ? (
        <div className="rounded-2xl border border-dashed border-[var(--border)] bg-[var(--surface)] px-6 py-12 text-center shadow-[var(--card-shadow)]">
          <span className="inline-flex h-12 w-12 items-center justify-center rounded-2xl bg-[var(--lavender-soft)] text-[var(--violet)]">
            <BadgeCheck className="h-6 w-6" />
          </span>
          <p className="mt-3 text-[14px] font-semibold text-[var(--text)]">
            No current assignment
          </p>
          <p className="mt-1 text-[12px] text-[var(--muted)]">
            When HR assigns a shift, details will appear here.
          </p>
        </div>
      ) : (
        <>
          <div className="relative overflow-hidden rounded-[10px] border border-[var(--border)] bg-[var(--surface)] shadow-[var(--card-shadow)]">
            <div
              className="pointer-events-none absolute right-3 top-1/2 hidden -translate-y-1/2 sm:block"
              aria-hidden
            >
              <div className="relative h-[72px] w-[78px] text-[var(--lavender)] opacity-45">
                <CalendarDays
                  className="absolute left-0 top-0 h-[58px] w-[58px]"
                  strokeWidth={1.25}
                />
                <span className="absolute bottom-0 right-0 flex h-9 w-9 items-center justify-center rounded-full bg-[var(--surface)]">
                  <Clock3
                    className="h-7 w-7 text-[var(--lavender)]"
                    strokeWidth={1.35}
                  />
                </span>
              </div>
            </div>

            <div className="relative flex items-center gap-4 px-5 py-4 pr-6 sm:pr-28">
              <span className="inline-flex h-12 w-12 shrink-0 items-center justify-center rounded-full bg-[var(--success-soft)] text-[var(--success)]">
                <CalendarDays className="h-[22px] w-[22px]" strokeWidth={2} />
              </span>

              <div className="min-w-0">
                <div className="flex flex-wrap items-center gap-2">
                  <p className="text-[15px] font-bold leading-snug text-[var(--text)]">
                    You have an assigned shift
                  </p>
                  <span className="inline-flex rounded-full bg-[var(--success-soft)] px-2.5 py-[3px] text-[11px] font-semibold leading-none text-[var(--success)]">
                    Active
                  </span>
                </div>
                <p className="mt-1 text-[13px] leading-snug text-[var(--muted)]">
                  Here are your current shift details.
                </p>
              </div>
            </div>
          </div>

          <div className="flex items-center gap-2">
            <CalendarDays className="h-4 w-4 text-[var(--violet)]" />
            <h2 className="heading-section">
              Shift Information
            </h2>
          </div>

          <div className="grid gap-4 xl:grid-cols-[minmax(0,1.6fr)_minmax(280px,1fr)]">
            <section className="rounded-2xl border border-[var(--border)] bg-[var(--surface)] p-5 shadow-[var(--card-shadow)]">
              <div className="flex flex-wrap items-center gap-2 border-b border-[var(--border)] pb-4">
                <h3 className="text-[17px] font-bold capitalize text-[var(--text)]">
                  {shift.shiftName}
                </h3>
                <span className="rounded-md bg-[var(--lavender-soft)] px-2 py-0.5 text-[10px] font-bold uppercase tracking-wide text-[var(--violet)]">
                  {shift.shiftTypeRaw || shift.shiftType || "SHIFT"}
                </span>
              </div>

              <div className="grid grid-cols-1 divide-y divide-[var(--border)] sm:grid-cols-2 sm:gap-x-6 sm:divide-y-0">
                <div className="sm:border-b sm:border-[var(--border)]">
                  <DetailCell
                    icon={IdCard}
                    label="Employee Code"
                    value={shift.employeeCode || "—"}
                  />
                </div>
                <div className="sm:border-b sm:border-[var(--border)]">
                  <DetailCell
                    icon={UserRound}
                    label="Employee ID"
                    value={shift.employeeId || "—"}
                  />
                </div>
                <div className="sm:border-b sm:border-[var(--border)]">
                  <DetailCell
                    icon={ShieldCheck}
                    label="Shift ID"
                    value={shift.shiftId || "—"}
                  />
                </div>
                <div className="sm:border-b sm:border-[var(--border)]">
                  <DetailCell
                    icon={RefreshCcw}
                    label="Shift Type"
                    value={shift.shiftTypeRaw || shift.shiftType || "—"}
                  />
                </div>
                <div>
                  <DetailCell
                    icon={Database}
                    label="Source"
                    value={shift.source || "—"}
                  />
                </div>
                <div>
                  <DetailCell
                    icon={CheckCircle2}
                    label="Has Shift"
                    valueNode={
                      <span className="mt-0.5 inline-flex rounded-full bg-[var(--success-soft)] px-2.5 py-0.5 text-[11px] font-semibold text-[var(--success)]">
                        Yes
                      </span>
                    }
                  />
                </div>
                <div>
                  <DetailCell
                    icon={CalendarDays}
                    label="Effective From"
                    value={
                      shift.effectiveFrom
                        ? formatDate(shift.effectiveFrom, dateFormat)
                        : "—"
                    }
                  />
                </div>
                <div>
                  <DetailCell
                    icon={CalendarDays}
                    label="Effective To"
                    value={
                      shift.effectiveTo
                        ? formatDate(shift.effectiveTo, dateFormat)
                        : "—"
                    }
                  />
                </div>
              </div>
            </section>

            <section className="rounded-2xl border border-[var(--border)] bg-[var(--surface)] p-5 shadow-[var(--card-shadow)]">
              <div className="mb-4 flex items-center gap-2">
                <Clock3 className="h-4 w-4 text-[var(--violet)]" />
                <h3 className="heading-card">
                  Shift Timings
                </h3>
              </div>

              <div className="grid grid-cols-2 gap-3 rounded-xl border border-[var(--violet)]/15 bg-[var(--lavender-soft)]/70 px-4 py-4">
                <div className="border-r border-[var(--violet)]/20 pr-3">
                  <p className="text-[22px] font-bold tabular-nums text-[var(--violet)]">
                    {formatTime(shift.startTime, timeFormat)}
                  </p>
                  <p className="mt-0.5 text-[12px] text-[var(--muted)]">
                    Start Time
                  </p>
                </div>
                <div className="pl-1">
                  <p className="text-[22px] font-bold tabular-nums text-[var(--violet)]">
                    {formatTime(shift.endTime, timeFormat)}
                  </p>
                  <p className="mt-0.5 text-[12px] text-[var(--muted)]">
                    End Time
                  </p>
                </div>
              </div>

              <div className="mt-4 space-y-0 divide-y divide-[var(--border)]">
                <div className="flex items-center justify-between gap-3 py-3">
                  <span className="inline-flex items-center gap-2 text-[13px] text-[var(--muted)]">
                    <Clock3 className="h-4 w-4 text-[var(--warning)]" />
                    Late In Grace Period
                  </span>
                  <span className="text-[13px] font-bold text-[var(--text)]">
                    {shift.lateInGracePeriodMinutes || 0} minutes
                  </span>
                </div>
                <div className="flex items-center justify-between gap-3 py-3">
                  <span className="inline-flex items-center gap-2 text-[13px] text-[var(--muted)]">
                    <Clock3 className="h-4 w-4 text-[var(--warning)]" />
                    Early Out Grace Period
                  </span>
                  <span className="text-[13px] font-bold text-[var(--text)]">
                    {shift.earlyOutGracePeriodMinutes || 0} minutes
                  </span>
                </div>
              </div>
            </section>
          </div>

          {(lateLimit || earlyLimit) && (
            <div className="flex items-start gap-3 rounded-2xl border border-[var(--info)]/25 bg-[var(--info-soft)] px-4 py-3.5">
              <span className="mt-0.5 inline-flex h-7 w-7 shrink-0 items-center justify-center rounded-full bg-[var(--info)]/15 text-[var(--info)]">
                <Info className="h-4 w-4" />
              </span>
              <div className="min-w-0 text-[13px]">
                {lateLimit ? (
                  <p className="font-semibold text-[var(--text)]">
                    Please make sure to punch in at or before {lateLimit} to
                    avoid being marked late.
                  </p>
                ) : null}
                {earlyLimit ? (
                  <p className="mt-0.5 text-[var(--muted)]">
                    Early out before {earlyLimit} will be considered early
                    departure.
                  </p>
                ) : null}
              </div>
            </div>
          )}
        </>
      )}
    </PortalPage>
  );
}
