import Link from "next/link";
import { ArrowUpRight, Users } from "lucide-react";
import { Avatar } from "@/components/ui/Avatar";
import { Card } from "@/components/ui/Card";
import { EmptyState } from "@/components/ui/EmptyState";
import { getDisplayName } from "@/lib/format";

const MAX_VISIBLE = 5;

function memberKey(member, index) {
  return member.employeeId || member.id || `member-${member.employeeCode || index}`;
}

function memberName(member) {
  return (
    member.fullName ||
    getDisplayName(member) ||
    [member.firstName, member.lastName].filter(Boolean).join(" ") ||
    "Employee"
  );
}

export function TeamMembersCard({ teamMembers = [] }) {
  const list = Array.isArray(teamMembers) ? teamMembers.filter(Boolean) : [];
  const visible = list.slice(0, MAX_VISIBLE);
  const hasMore = list.length > MAX_VISIBLE;

  return (
    <Card
      title={`Team Members (${list.length})`}
      className="h-full"
      bodyClassName="flex flex-col"
      action={
        list.length > 0 ? (
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
      {visible.length === 0 ? (
        <EmptyState icon={Users} title="No team members" />
      ) : (
        <ul className="flex flex-1 flex-col justify-between gap-2">
          {visible.map((member, index) => {
            const name = memberName(member);
            const code = member.employeeCode || member.code || "—";
            const designation =
              member.designationName ||
              member.designation ||
              member.jobTitle ||
              "—";

            return (
              <li
                key={memberKey(member, index)}
                className="grid grid-cols-[auto_minmax(0,1fr)_minmax(7.5rem,0.9fr)] items-center gap-3 rounded-xl border border-[var(--border)] bg-[var(--panel-soft)] px-3 py-2.5 transition hover:border-[var(--lavender)] hover:bg-[var(--surface)]"
              >
                <Avatar
                  name={name}
                  src={member.photoUrl}
                  size={42}
                  className="ring-2 ring-white"
                />

                <div className="min-w-0">
                  <p
                    className="truncate text-[13px] font-semibold text-[var(--text)]"
                    title={name}
                  >
                    {name}
                  </p>
                  <p className="mt-0.5 text-[11px] text-[var(--muted)]">
                    Employee Code{" "}
                    <span className="font-semibold tabular-nums text-[var(--text)]">
                      {code}
                    </span>
                  </p>
                </div>

                <div className="min-w-0 text-right">
                  <p className="text-[10px] font-medium uppercase tracking-wide text-[var(--muted)]">
                    Designation
                  </p>
                  <p
                    className="mt-0.5 truncate text-[12px] font-semibold text-[var(--violet)]"
                    title={designation}
                  >
                    {designation}
                  </p>
                </div>
              </li>
            );
          })}

          {hasMore ? (
            <li className="pt-0.5 text-center text-[11px] text-[var(--muted)]">
              +{list.length - MAX_VISIBLE} more on team page
            </li>
          ) : null}
        </ul>
      )}
    </Card>
  );
}
