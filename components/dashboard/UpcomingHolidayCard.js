import { CalendarDays } from "lucide-react";
import { Badge } from "@/components/ui/Badge";
import { Card } from "@/components/ui/Card";
import { EmptyState } from "@/components/ui/EmptyState";
import { formatDate } from "@/lib/format";

export function UpcomingHolidayCard({ holidays = [], dateFormat }) {
  const next = holidays[0];

  return (
    <Card title="Upcoming Holiday" className="h-full">
      {!next ? (
        <EmptyState icon={CalendarDays} title="No upcoming holidays" />
      ) : (
        <div className="flex h-full min-h-[140px] flex-col items-start justify-center">
          <span className="flex h-12 w-12 items-center justify-center rounded-xl bg-[var(--lavender-soft)] text-[var(--violet)]">
            <CalendarDays className="h-6 w-6" strokeWidth={1.7} />
          </span>

          <p className="mt-3 text-[15px] font-semibold text-[var(--text)]">
            {next.title}
          </p>

          <div className="mt-2">
            <Badge variant="muted" className="rounded-full capitalize">
              {next.holidayType || "Holiday"}
            </Badge>
          </div>

          <p className="mt-3 text-[13px] text-[var(--muted)]">
            {formatDate(next.fromDate, dateFormat)} -{" "}
            {formatDate(next.toDate || next.fromDate, dateFormat)}
          </p>
        </div>
      )}
    </Card>
  );
}
