import Image from "next/image";
import { ArrowRight, Sun } from "lucide-react";
import { Badge } from "@/components/ui/Badge";
import { Card } from "@/components/ui/Card";
import { formatTime } from "@/lib/format";
import { resolveMediaUrl } from "@/lib/media";

export function ShiftCard({ shift, company, timeFormat = "12h" }) {
  if (!shift) {
    return (
      <Card title="Current Shift" className="h-full">
        <p className="text-sm text-[var(--muted)]">No shift assigned</p>
      </Card>
    );
  }

  const logo = resolveMediaUrl(company?.logoUrl);

  return (
    <Card className="h-full" bodyClassName="flex flex-col">
      <div className="flex items-center gap-2.5">
        {logo ? (
          <Image
            src={logo}
            alt={company?.companyName || "Company"}
            width={36}
            height={36}
            className="rounded-md object-contain"
            unoptimized
          />
        ) : (
          <div className="flex h-9 w-9 items-center justify-center rounded-md bg-[var(--lavender-soft)] text-sm font-bold text-[var(--violet)]">
            {(company?.companyName || "C").slice(0, 1)}
          </div>
        )}
        <p className="text-[13px] font-semibold text-[var(--text)]">
          {company?.companyName}
        </p>
      </div>

      <p className="mt-4 text-[12px] font-medium text-[var(--muted)]">
        Current Shift
      </p>

      <div className="mt-1.5 flex flex-wrap items-center gap-2">
        <Sun className="h-4 w-4 text-[var(--warning)]" fill="currentColor" />
        <p className="font-[family-name:var(--font-heading)] text-[17px] font-semibold text-[var(--violet)]">
          {shift.shiftName}
        </p>
        {shift.shiftType ? (
          <Badge variant="violet" className="rounded-full">
            {shift.shiftType}
          </Badge>
        ) : null}
      </div>

      <div className="mt-auto flex items-end gap-3 pt-5">
        <div>
          <p className="text-[15px] font-bold text-[var(--text)]">
            {formatTime(shift.startTime, timeFormat)}
          </p>
          <p className="mt-0.5 text-[11px] text-[var(--muted)]">Start Time</p>
        </div>
        <ArrowRight className="mb-4 h-4 w-4 text-[var(--muted)]" />
        <div>
          <p className="text-[15px] font-bold text-[var(--text)]">
            {formatTime(shift.endTime, timeFormat)}
          </p>
          <p className="mt-0.5 text-[11px] text-[var(--muted)]">End Time</p>
        </div>
      </div>
    </Card>
  );
}
