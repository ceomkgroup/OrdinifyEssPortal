import {
  Briefcase,
  Building2,
  CalendarDays,
  Hash,
  Mail,
  UserRound,
} from "lucide-react";
import { Avatar } from "@/components/ui/Avatar";
import { Badge } from "@/components/ui/Badge";
import { Card } from "@/components/ui/Card";
import { formatDate, getDisplayName } from "@/lib/format";

function MetaTile({ icon: Icon, label, value, className = "" }) {
  if (!value) return null;
  return (
    <div
      className={`min-w-0 rounded-xl border border-[var(--border)] bg-[var(--panel-soft)] px-3 py-2.5 ${className}`}
    >
      <div className="flex items-center gap-1.5 text-[10px] font-semibold uppercase tracking-wide text-[var(--muted)]">
        <Icon className="h-3 w-3 shrink-0 text-[var(--violet)]" strokeWidth={2} />
        {label}
      </div>
      <p
        className="mt-1 line-clamp-2 break-words text-[12px] font-semibold leading-snug text-[var(--text)]"
        title={String(value)}
      >
        {value}
      </p>
    </div>
  );
}

export function ProfileCard({ employee, dateFormat }) {
  if (!employee) return null;

  const name =
    employee.fullName ||
    getDisplayName(employee) ||
    [employee.firstName, employee.lastName].filter(Boolean).join(" ") ||
    "Employee";

  return (
    <Card className="h-full overflow-hidden" bodyClassName="flex h-full flex-col">
      <div className="flex items-start gap-3.5 sm:gap-4">
        <Avatar
          name={name}
          src={employee.photoUrl || employee.avatarUrl || employee.profilePhoto}
          size={78}
          className="shrink-0 ring-4 ring-[var(--lavender-soft)]"
        />

        <div className="min-w-0 flex-1">
          <div className="flex flex-wrap items-center gap-2">
            <h2 className="heading-section">
              {name}
            </h2>
            <Badge variant="success" className="rounded-full px-2.5">
              Active
            </Badge>
          </div>

          <div className="mt-2 inline-flex items-center gap-1.5 rounded-full bg-[var(--lavender-soft)] px-2.5 py-1 text-[11px] font-semibold text-[var(--violet)]">
            <Hash className="h-3 w-3" />
            Employee Code · {employee.employeeCode || "—"}
          </div>

          {employee.designationName ? (
            <p
              className="mt-2 line-clamp-2 text-[13px] font-medium leading-snug text-[var(--text)]"
              title={
                employee.departmentName
                  ? `${employee.designationName} · ${employee.departmentName}`
                  : employee.designationName
              }
            >
              {employee.designationName}
              {employee.departmentName ? (
                <span className="font-normal text-[var(--muted)]">
                  {" "}
                  · {employee.departmentName}
                </span>
              ) : null}
            </p>
          ) : null}
        </div>
      </div>

      <div className="mt-4 grid flex-1 grid-cols-1 content-start gap-2 sm:grid-cols-2">
        <MetaTile
          icon={Hash}
          label="Employee Code"
          value={employee.employeeCode}
        />
        <MetaTile
          icon={UserRound}
          label="Designation"
          value={employee.designationName}
        />
        <MetaTile
          icon={Briefcase}
          label="Department"
          value={employee.departmentName}
        />
        <MetaTile
          icon={CalendarDays}
          label="Join Date"
          value={formatDate(employee.joinDate, dateFormat)}
        />
        <MetaTile
          icon={Building2}
          label="Branch"
          value={employee.branchName}
        />
        <MetaTile icon={Mail} label="Email" value={employee.email} />
        {employee.managerName ? (
          <MetaTile
            icon={UserRound}
            label="Manager"
            value={employee.managerName}
            className="sm:col-span-2"
          />
        ) : null}
      </div>
    </Card>
  );
}
