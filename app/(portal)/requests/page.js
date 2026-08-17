"use client";

import Link from "next/link";
import { CalendarClock, ChevronRight, Inbox } from "lucide-react";
import { useModules } from "@/components/modules/ModulesProvider";
import { ComingSoon } from "@/components/ui/ComingSoon";

const REQUEST_TILES = [
  {
    key: "attendanceChange",
    href: "/requests/attendance-change",
    title: "Attendance Change",
    description: "Correct check-in / check-out when a punch went wrong.",
    icon: CalendarClock,
  },
];

export default function RequestsPage() {
  const { canShowRequestTile, loading } = useModules();

  const visible = REQUEST_TILES.filter((tile) =>
    canShowRequestTile(tile.key)
  );

  if (!loading && visible.length === 0) {
    return (
      <ComingSoon
        title="Requests"
        description="No request modules are enabled for your company yet."
      />
    );
  }

  return (
    <div className="space-y-4">
      <div>
        <h1 className="font-[family-name:var(--font-heading)] text-[24px] font-semibold text-[var(--text)]">
          Requests
        </h1>
        <p className="mt-1 text-[13px] text-[var(--muted)]">
          Submit and track your portal requests.
        </p>
      </div>

      <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-3">
        {visible.map((tile) => {
          const Icon = tile.icon || Inbox;
          return (
            <Link
              key={tile.key}
              href={tile.href}
              className="group rounded-[12px] border border-[var(--border)] bg-[var(--surface)] p-4 shadow-[var(--card-shadow)] transition hover:border-[var(--violet)] hover:bg-[var(--panel-soft)]"
            >
              <div className="flex items-start justify-between gap-3">
                <span className="inline-flex h-10 w-10 items-center justify-center rounded-xl bg-[var(--lavender-soft)] text-[var(--violet)]">
                  <Icon className="h-5 w-5" />
                </span>
                <ChevronRight className="mt-1 h-4 w-4 text-[var(--muted)] transition group-hover:text-[var(--violet)]" />
              </div>
              <p className="mt-3 text-[15px] font-semibold text-[var(--text)]">
                {tile.title}
              </p>
              <p className="mt-1 text-[12px] leading-relaxed text-[var(--muted)]">
                {tile.description}
              </p>
            </Link>
          );
        })}
      </div>
    </div>
  );
}
