import { Eye, WalletCards } from "lucide-react";
import { Button } from "@/components/ui/Button";
import { Card } from "@/components/ui/Card";
import { formatCurrency, formatDate } from "@/lib/format";

function Field({ label, value, valueClass = "text-[var(--text)]" }) {
  return (
    <div className="min-w-0 max-w-full sm:max-w-[11rem]">
      <p className="text-[11px] text-[var(--muted)]">{label}</p>
      <p
        className={`mt-0.5 break-words text-[13px] font-semibold leading-snug ${valueClass}`}
      >
        {value}
      </p>
    </div>
  );
}

export function LastPayslipBar({ lastPayslip, dateFormat }) {
  if (!lastPayslip) return null;

  const currency = lastPayslip.currency || "PKR";

  return (
    <Card className="h-full" bodyClassName="flex items-center">
      <div className="flex w-full min-w-0 flex-col gap-4 lg:flex-row lg:items-center lg:justify-between">
        <div className="flex min-w-0 flex-col gap-4 sm:flex-row sm:items-center">
          <span className="flex h-12 w-12 shrink-0 items-center justify-center rounded-xl bg-[var(--success-soft)] text-[var(--success)]">
            <WalletCards className="h-6 w-6" />
          </span>

          <div className="flex min-w-0 flex-wrap gap-x-6 gap-y-3 sm:gap-x-8">
            <Field
              label="Net Salary"
              value={formatCurrency(lastPayslip.netSalary, currency)}
              valueClass="text-[16px] font-bold text-[var(--success)]"
            />
            <Field
              label="Gross Salary"
              value={formatCurrency(lastPayslip.grossSalary, currency)}
            />
            <Field
              label="Pay Period"
              value={`${formatDate(lastPayslip.payPeriodStart, dateFormat)} - ${formatDate(lastPayslip.payPeriodEnd, dateFormat)}`}
            />
            <Field
              label="Payment Date"
              value={formatDate(lastPayslip.paymentDate, dateFormat)}
            />
            <Field label="Currency" value={currency} />
          </div>
        </div>

        <Button
          variant="outline"
          className="h-10 w-full shrink-0 rounded-lg px-4 sm:w-auto"
        >
          <Eye className="h-4 w-4" />
          View Payslip
        </Button>
      </div>
    </Card>
  );
}
