"use client";

import Link from "next/link";
import { ArrowLeft, Printer, RefreshCw } from "lucide-react";
import { useCallback, useState } from "react";
import { getPayslipPrintHtml } from "@/api/payslips";
import { Avatar } from "@/components/ui/Avatar";
import { Button } from "@/components/ui/Button";
import { CollapsibleSection } from "@/components/ui/CollapsibleSection";
import { FlashBanner } from "@/components/ui/FlashBanner";
import { PortalPage } from "@/components/ui/PortalPage";
import { SoftStat, SUMMARY_GRID_CLASS } from "@/components/ui/SoftStat";
import { PageLoader } from "@/components/ui/Spinner";
import { useCompanySettings } from "@/hooks/useCompanySettings";
import { usePayslipDetail } from "@/hooks/usePayslips";
import { getApiErrorMessage } from "@/lib/api-error";
import { formatDate } from "@/lib/format";
import { formatCompanyAddress, formatPayslipMoney, openPrintHtml } from "@/lib/print-html";

function statusTone(status) {
  const s = String(status || "").toLowerCase();
  if (s === "paid" || s === "processed" || s === "posted") {
    return "border-[var(--success)]/20 bg-[var(--success-soft)] text-[var(--success)]";
  }
  if (s === "draft" || s === "pending") {
    return "border-[var(--warning)]/20 bg-[var(--warning-soft)] text-[var(--warning)]";
  }
  return "border-[var(--border)] bg-[var(--panel-soft)] text-[var(--muted)]";
}

function AmountTable({ rows, currency, empty }) {
  if (!rows.length) {
    return <p className="px-1 py-2 text-[12px] text-[var(--muted)]">{empty}</p>;
  }
  return (
    <table className="w-full border-collapse text-left text-[13px]">
      <tbody>
        {rows.map((row, index) => {
          const label = row.label || row.ruleName || "—";
          const amount = row.amount;
          const hint = row.reasonText;
          return (
            <tr key={`${label}-${index}`} className="border-b border-[var(--border)] last:border-0">
              <td className="py-2 pr-3 align-top">
                <p className="font-medium text-[var(--text)]">{label}</p>
                {hint ? (
                  <p className="mt-0.5 text-[11px] leading-snug text-[var(--muted)]">
                    {hint}
                  </p>
                ) : null}
              </td>
              <td className="whitespace-nowrap py-2 text-right tabular-nums font-semibold text-[var(--text)]">
                {formatPayslipMoney(amount, currency)}
              </td>
            </tr>
          );
        })}
      </tbody>
    </table>
  );
}

function MetaItem({ label, value }) {
  return (
    <div className="min-w-0">
      <p className="text-[10px] font-semibold uppercase tracking-wide text-[var(--muted)]">
        {label}
      </p>
      <p className="mt-0.5 truncate text-[13px] font-semibold text-[var(--text)]" title={value || undefined}>
        {value || "—"}
      </p>
    </div>
  );
}

export function PayslipDetailView({ payslipId }) {
  const { settings } = useCompanySettings();
  const dateFormat = settings.dateFormat || "DD/MM/YYYY";
  const { data, loading, error, refetch } = usePayslipDetail(payslipId);
  const [printError, setPrintError] = useState("");
  const [printing, setPrinting] = useState(false);

  const handlePrint = useCallback(async () => {
    if (!payslipId) return;
    setPrintError("");
    setPrinting(true);
    try {
      const html = await getPayslipPrintHtml(payslipId);
      openPrintHtml(html);
    } catch (err) {
      setPrintError(getApiErrorMessage(err, "Could not open payslip print."));
    } finally {
      setPrinting(false);
    }
  }, [payslipId]);

  if (loading && !data) {
    return (
      <PageLoader label="Loading payslip" hint="Opening your salary breakdown…" />
    );
  }

  if (error && !data) {
    return (
      <PortalPage
        title="Payslip"
        subtitle="Could not load this payslip."
        error={error}
        actions={
          <Link
            href="/payslip"
            className="inline-flex h-8 items-center gap-1.5 rounded-lg border border-[var(--border)] px-3 text-[12.5px] font-semibold text-[var(--text)]"
          >
            <ArrowLeft className="h-4 w-4" />
            Back to payslips
          </Link>
        }
      />
    );
  }

  const currency = data?.currency || "PKR";
  const periodLabel = `${formatDate(data.period.payPeriodStart, dateFormat)} – ${formatDate(data.period.payPeriodEnd, dateFormat)}`;
  const companyAddress = formatCompanyAddress(data.company?.address);
  const calc = data.calculationDetails || {};

  return (
    <PortalPage
      title="Payslip"
      subtitle={`${data.employee?.fullName || "Employee"} · ${periodLabel}`}
      error={error}
      actions={
        <>
          <Link
            href="/payslip"
            className="inline-flex h-8 items-center gap-1.5 rounded-lg border border-[var(--border)] px-3 text-[12.5px] font-semibold text-[var(--text)] hover:bg-[var(--panel-soft)]"
          >
            <ArrowLeft className="h-4 w-4" />
            Back
          </Link>
          <Button
            type="button"
            variant="outline"
            className="h-10 rounded-xl"
            onClick={refetch}
            disabled={loading}
          >
            <RefreshCw className="h-4 w-4" />
            Refresh
          </Button>
          <Button
            type="button"
            className="h-10 rounded-xl"
            onClick={handlePrint}
            disabled={printing}
          >
            <Printer className="h-4 w-4" />
            {printing ? "Opening…" : "Print / PDF"}
          </Button>
        </>
      }
    >
      {printError ? (
        <FlashBanner
          message={printError}
          tone="danger"
          duration={5000}
          onDismiss={() => setPrintError("")}
        />
      ) : null}

      <section className="rounded-xl border border-[var(--border)] bg-[var(--surface)] px-3.5 py-3 shadow-[var(--card-shadow)] sm:px-4">
        <div className="flex flex-wrap items-start justify-between gap-3">
          <div className="flex min-w-0 items-start gap-3">
            <Avatar
              person={data.employee}
              name={data.employee?.fullName}
              size={44}
            />
            <div className="min-w-0">
              <p className="text-[15px] font-semibold text-[var(--text)]">
                {data.company?.companyName || "Payslip"}
              </p>
              <p className="mt-0.5 text-[12px] text-[var(--muted)]">
                {data.employee?.fullName}
                {data.employee?.employeeCode
                  ? ` · ${data.employee.employeeCode}`
                  : ""}
              </p>
              {companyAddress ? (
                <p className="mt-1 max-w-xl text-[11px] leading-snug text-[var(--muted)]">
                  {companyAddress}
                </p>
              ) : null}
            </div>
          </div>
          <span
            className={`inline-flex rounded-full border px-2.5 py-0.5 text-[11px] font-semibold capitalize ${statusTone(data.run?.status)}`}
          >
            {data.run?.status || "—"}
          </span>
        </div>

        <div className="mt-3 grid grid-cols-2 gap-3 border-t border-[var(--border)] pt-3 sm:grid-cols-3 lg:grid-cols-5">
          <MetaItem label="Department" value={data.employee?.departmentName} />
          <MetaItem label="Designation" value={data.employee?.designationName} />
          <MetaItem label="Branch" value={data.employee?.branchName} />
          <MetaItem
            label="Join date"
            value={formatDate(data.employee?.joinDate, dateFormat)}
          />
          <MetaItem
            label="Payment date"
            value={formatDate(data.period.paymentDate, dateFormat)}
          />
          {data.company?.companyEmail ? (
            <MetaItem label="Company email" value={data.company.companyEmail} />
          ) : null}
          {data.company?.phone ? (
            <MetaItem label="Company phone" value={data.company.phone} />
          ) : null}
          {data.company?.trnNtn ? (
            <MetaItem label="TRN / NTN" value={data.company.trnNtn} />
          ) : null}
          {data.salaryStructure?.name || data.salaryStructure?.structureName ? (
            <MetaItem
              label="Salary structure"
              value={
                data.salaryStructure.name || data.salaryStructure.structureName
              }
            />
          ) : null}
        </div>
      </section>

      <div className={SUMMARY_GRID_CLASS}>
        <SoftStat
          label="Gross salary"
          value={formatPayslipMoney(data.amounts.grossSalary, currency)}
        />
        <SoftStat
          label="Deductions"
          value={formatPayslipMoney(data.amounts.totalDeductions, currency)}
          color="#ef4444"
        />
        <SoftStat
          label="Net salary"
          value={formatPayslipMoney(data.amounts.netSalary, currency)}
          color="#22c55e"
        />
        <SoftStat
          label="Present / working"
          value={`${data.attendance.presentDays ?? "—"} / ${data.attendance.workingDays ?? "—"}`}
        />
        <SoftStat
          label="Leave / absent"
          value={`${data.attendance.leaveDays ?? 0} / ${data.attendance.absentDays ?? 0}`}
          color="#f59e0b"
        />
      </div>

      <div className="grid min-h-0 gap-2.5 lg:grid-cols-2">
        <section className="rounded-xl border border-[var(--border)] bg-[var(--surface)] px-3.5 py-3 shadow-[var(--card-shadow)]">
          <h2 className="heading-section">Earnings ({currency})</h2>
          <div className="mt-2">
            <AmountTable
              rows={data.earnings}
              currency={currency}
              empty="No earnings on this slip."
            />
          </div>
          {data.bonusLines.length > 0 ? (
            <div className="mt-3 border-t border-[var(--border)] pt-2">
              <p className="mb-1 text-[11px] font-semibold uppercase tracking-wide text-[var(--muted)]">
                Bonuses
              </p>
              <AmountTable
                rows={data.bonusLines.map((line) => ({
                  label: line.label || line.ruleName || "Bonus",
                  amount: line.amount,
                  reasonText: line.reasonText,
                }))}
                currency={currency}
                empty="No bonuses."
              />
            </div>
          ) : null}
        </section>

        <section className="rounded-xl border border-[var(--border)] bg-[var(--surface)] px-3.5 py-3 shadow-[var(--card-shadow)]">
          <h2 className="heading-section">Deductions ({currency})</h2>
          <div className="mt-2">
            <AmountTable
              rows={data.deductions}
              currency={currency}
              empty="No deductions on this slip."
            />
          </div>
        </section>
      </div>

      <CollapsibleSection title="Attendance impact days">
        {data.dayTimeline.length === 0 ? (
          <p className="text-[12px] text-[var(--muted)]">
            No attendance-impact days on this slip.
          </p>
        ) : (
          <ul className="divide-y divide-[var(--border)]">
            {data.dayTimeline.map((day, index) => (
              <li
                key={`${day.date}-${index}`}
                className="flex items-center justify-between gap-3 py-1.5 text-[13px]"
              >
                <span className="tabular-nums text-[var(--muted)]">
                  {formatDate(day.date, dateFormat)}
                </span>
                <span className="min-w-0 flex-1 truncate font-medium text-[var(--text)]">
                  {day.label || day.kind || "—"}
                </span>
                {day.quantity != null ? (
                  <span className="tabular-nums text-[var(--muted)]">
                    {day.quantity}
                    {day.unit ? ` ${day.unit}` : ""}
                  </span>
                ) : null}
              </li>
            ))}
          </ul>
        )}
      </CollapsibleSection>

      <CollapsibleSection title="Calculation details" defaultCollapsed>
        <div className="grid grid-cols-2 gap-2 sm:grid-cols-3 lg:grid-cols-4">
          <MetaItem
            label="Attendance %"
            value={
              calc.attendancePct != null ? `${calc.attendancePct}%` : "—"
            }
          />
          <MetaItem
            label="Grace period"
            value={
              calc.lateGraceMinutes != null
                ? `${calc.lateGraceMinutes} min`
                : "—"
            }
          />
          <MetaItem
            label="Working hours / day"
            value={
              calc.workingHoursPerDay != null
                ? `${calc.workingHoursPerDay} hours`
                : "—"
            }
          />
          <MetaItem label="LWP days" value={calc.lwpDays ?? "—"} />
          <MetaItem label="Late minutes" value={calc.totalLateMinutes ?? "—"} />
          <MetaItem
            label="Overtime hours"
            value={data.attendance.overtimeHours ?? "—"}
          />
        </div>
      </CollapsibleSection>
    </PortalPage>
  );
}
