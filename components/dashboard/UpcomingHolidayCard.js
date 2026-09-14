import Link from "next/link";
import { ArrowUpRight, CalendarDays } from "lucide-react";
import { Card } from "@/components/ui/Card";
import { EmptyState } from "@/components/ui/EmptyState";
import { formatDate } from "@/lib/format";

const MAX_VISIBLE = 4;

function parseHolidayDate(value) {
  if (!value) return null;
  const match = String(value).match(/^(\d{4})-(\d{2})-(\d{2})/);
  if (match) {
    return new Date(
      Number(match[1]),
      Number(match[2]) - 1,
      Number(match[3]),
      0,
      0,
      0,
      0
    );
  }
  const d = new Date(value);
  return Number.isNaN(d.getTime()) ? null : d;
}

function daysUntil(fromDate) {
  const start = parseHolidayDate(fromDate);
  if (!start) return null;
  const today = new Date();
  today.setHours(0, 0, 0, 0);
  const diff = Math.round((start.getTime() - today.getTime()) / 86400000);
  return diff;
}

function formatCountdown(days) {
  if (days == null) return null;
  if (days < 0) return "Passed";
  if (days === 0) return "Today";
  if (days === 1) return "Tomorrow";
  return `In ${days} days`;
}

function holidayKey(holiday, index) {
  return (
    holiday.holidayId ||
    holiday.id ||
    `${holiday.title || "holiday"}-${holiday.fromDate || index}`
  );
}

export function UpcomingHolidayCard({ holidays = [], dateFormat }) {
  const list = Array.isArray(holidays) ? holidays.filter(Boolean) : [];
  const visible = list.slice(0, MAX_VISIBLE);
  const hasMore = list.length > MAX_VISIBLE;

  return (
    <Card
      title={list.length > 1 ? "Upcoming Holidays" : "Upcoming Holiday"}
      className="h-full"
      action={
        list.length > 0 ? (
          <Link
            href="/holidays"
            className="inline-flex items-center gap-1 text-[13px] font-semibold text-[var(--violet)] hover:underline"
          >
            View All
            <ArrowUpRight className="h-3.5 w-3.5" />
          </Link>
        ) : null
      }
    >
      {visible.length === 0 ? (
        <EmptyState icon={CalendarDays} title="No upcoming holidays" />
      ) : (
        <ul className="flex h-full flex-col gap-2">
          {visible.map((holiday, index) => {
            const countdown = formatCountdown(daysUntil(holiday.fromDate));
            const isNext = index === 0;
            const sameDay =
              !holiday.toDate ||
              String(holiday.toDate) === String(holiday.fromDate);
            const dateLabel = sameDay
              ? formatDate(holiday.fromDate, dateFormat)
              : `${formatDate(holiday.fromDate, dateFormat)} – ${formatDate(
                  holiday.toDate,
                  dateFormat
                )}`;

            return (
              <li
                key={holidayKey(holiday, index)}
                className={`flex items-start gap-3 rounded-xl border px-3 py-2.5 ${
                  isNext
                    ? "border-[var(--lavender)] bg-[var(--lavender-soft)]/70"
                    : "border-[var(--border)] bg-[var(--surface)]"
                }`}
              >
                <span
                  className={`mt-0.5 flex h-9 w-9 shrink-0 items-center justify-center rounded-lg ${
                    isNext
                      ? "bg-[var(--surface)] text-[var(--violet)] shadow-sm"
                      : "bg-[var(--panel-soft)] text-[var(--violet)]"
                  }`}
                >
                  <CalendarDays className="h-4 w-4" strokeWidth={1.8} />
                </span>

                <div className="min-w-0 flex-1">
                  <div className="flex min-w-0 items-center gap-1.5">
                    <p
                      className="min-w-0 truncate text-[13px] font-semibold text-[var(--text)]"
                      title={holiday.title || "Holiday"}
                    >
                      {holiday.title || "Holiday"}
                    </p>
                    {isNext ? (
                      <span className="shrink-0 rounded-full bg-[var(--violet)] px-2 py-0.5 text-[9px] font-semibold uppercase tracking-wide text-white">
                        Next
                      </span>
                    ) : null}
                  </div>

                  <div className="mt-1 flex min-w-0 flex-wrap items-center gap-1.5">
                    {holiday.holidayType ? (
                      <span className="rounded-full bg-[var(--muted-bg)] px-2 py-0.5 text-[10px] font-semibold capitalize text-[var(--muted)]">
                        {holiday.holidayType}
                      </span>
                    ) : null}
                    <span className="min-w-0 break-words text-[11px] text-[var(--muted)]">
                      {dateLabel}
                    </span>
                  </div>
                </div>

                {countdown ? (
                  <span
                    className={`shrink-0 rounded-full px-2 py-1 text-[10px] font-semibold tabular-nums ${
                      isNext
                        ? "bg-[var(--surface)] text-[var(--violet)]"
                        : "bg-[var(--panel-soft)] text-[var(--muted)]"
                    }`}
                  >
                    {countdown}
                  </span>
                ) : null}
              </li>
            );
          })}

          {hasMore ? (
            <li className="pt-0.5 text-center text-[11px] text-[var(--muted)]">
              +{list.length - MAX_VISIBLE} more
            </li>
          ) : null}
        </ul>
      )}
    </Card>
  );
}
