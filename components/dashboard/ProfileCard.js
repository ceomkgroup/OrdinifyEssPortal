import {
  Briefcase,
  Building2,
  CalendarDays,
  IdCard,
  Mail,
  UserRound,
} from "lucide-react";
import { Avatar } from "@/components/ui/Avatar";
import { Badge } from "@/components/ui/Badge";
import { Card } from "@/components/ui/Card";
import { formatDate } from "@/lib/format";

function Detail({ icon: Icon, value }) {
  if (!value) return null;
  return (
    <div className="flex items-center gap-2.5 text-[13px] text-[var(--text)]">
      <Icon className="h-4 w-4 shrink-0 text-[var(--muted)]" strokeWidth={1.75} />
      <span className="truncate">{value}</span>
    </div>
  );
}

export function ProfileCard({ employee, dateFormat }) {
  if (!employee) return null;

  return (
    <Card className="h-full" bodyClassName="flex flex-col justify-center">
      <div className="flex gap-4 sm:gap-5">
        <Avatar
          name={employee.fullName}
          src={employee.photoUrl || employee.avatarUrl || employee.profilePhoto}
          size={96}
          className="shrink-0 ring-4 ring-[var(--background)]"
        />

        <div className="min-w-0 flex-1">
          <div className="flex flex-wrap items-center gap-2">
            <h2 className="font-[family-name:var(--font-heading)] text-[20px] font-semibold leading-tight text-[var(--text)]">
              {employee.fullName}
            </h2>
            <Badge variant="success" className="rounded-full px-2.5">
              Active
            </Badge>
          </div>

          <div className="mt-1.5 flex items-center gap-1.5 text-[13px] font-medium text-[var(--violet)]">
            <IdCard className="h-3.5 w-3.5" strokeWidth={1.8} />
            <span>{employee.employeeCode}</span>
          </div>

          <div className="mt-4 grid gap-2.5 sm:grid-cols-2 sm:gap-x-4 sm:gap-y-2.5">
            <Detail icon={Briefcase} value={employee.departmentName} />
            <Detail icon={UserRound} value={employee.designationName} />
            <Detail icon={Building2} value={employee.branchName} />
            <Detail icon={UserRound} value={employee.managerName} />
            <Detail
              icon={CalendarDays}
              value={formatDate(employee.joinDate, dateFormat)}
            />
            <Detail icon={Mail} value={employee.email} />
          </div>
        </div>
      </div>
    </Card>
  );
}
