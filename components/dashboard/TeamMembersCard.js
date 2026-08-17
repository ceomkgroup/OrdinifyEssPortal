import Link from "next/link";
import { ArrowUpRight, Users } from "lucide-react";
import { Avatar } from "@/components/ui/Avatar";
import { Card } from "@/components/ui/Card";
import { EmptyState } from "@/components/ui/EmptyState";

export function TeamMembersCard({ teamMembers = [] }) {
  return (
    <Card
      title={`Team Members (${teamMembers.length})`}
      className="h-full"
      action={
        teamMembers.length > 0 ? (
          <Link
            href="/team"
            className="inline-flex items-center gap-1 text-[13px] font-semibold text-[var(--violet)] hover:underline"
          >
            View All
            <ArrowUpRight className="h-3.5 w-3.5" />
          </Link>
        ) : null
      }
    >
      {teamMembers.length === 0 ? (
        <EmptyState icon={Users} title="No team members" />
      ) : (
        <div className="grid grid-cols-1 gap-2.5 sm:grid-cols-2">
          {teamMembers.map((member) => (
            <div
              key={member.employeeId}
              className="group flex items-center gap-3 rounded-xl border border-[var(--border)] bg-[var(--panel-soft)] px-3 py-2.5 transition hover:border-[var(--lavender)] hover:bg-[var(--surface)] hover:shadow-[0_6px_16px_rgba(75,29,148,0.08)]"
            >
              <Avatar
                name={member.fullName}
                src={member.photoUrl}
                size={42}
                className="ring-2 ring-white"
              />

              <div className="min-w-0 flex-1">
                <p className="truncate text-[13px] font-semibold text-[var(--text)]">
                  {member.fullName}
                </p>
                <p className="mt-0.5 truncate text-[11px] text-[var(--muted)]">
                  {member.employeeCode}
                </p>
              </div>

              {member.designationName ? (
                <span className="shrink-0 rounded-full bg-[var(--lavender-soft)] px-2.5 py-1 text-[10px] font-semibold text-[var(--violet)]">
                  {member.designationName}
                </span>
              ) : null}
            </div>
          ))}
        </div>
      )}
    </Card>
  );
}
