"use client";

import { useMemo, useState } from "react";
import Link from "next/link";
import { ArrowLeft, FileBadge, Printer, RefreshCw } from "lucide-react";
import { getTaxCertificatePrintHtml } from "@/api/payslips";
import { Button } from "@/components/ui/Button";
import { CollapsibleSection } from "@/components/ui/CollapsibleSection";
import { FlashBanner } from "@/components/ui/FlashBanner";
import { PortalPage } from "@/components/ui/PortalPage";
import { SoftStat, SUMMARY_GRID_CLASS } from "@/components/ui/SoftStat";
import { TablePanel } from "@/components/ui/TablePanel";
import { useCompanySettings } from "@/hooks/useCompanySettings";
import { useTaxCertificate } from "@/hooks/usePayslips";
import { getApiErrorMessage } from "@/lib/api-error";
import { formatDate, rowSerial } from "@/lib/format";
import { formatPayslipMoney, openPrintHtml } from "@/lib/print-html";

function yearOptions(currentYear) {
  const y = Number(currentYear) || new Date().getFullYear();
  const years = [];
  for (let i = 0; i < 6; i += 1) years.push(y - i);
  return years;
}

function yearFromIso(value) {
  const match = String(value || "").match(/^(\d{4})/);
  return match ? Number(match[1]) : null;
}

export function TaxCertificateView() {
  const { settings } = useCompanySettings();
  const dateFormat = settings.dateFormat || "DD/MM/YYYY";
  const defaultYear = new Date().getFullYear();
  const [year, setYear] = useState(defaultYear);
  const [printError, setPrintError] = useState("");
  const [printing, setPrinting] = useState(false);

  const { data, loading, error, refetch } = useTaxCertificate(year);
  const currency = data?.currency || "PKR";
  const years = useMemo(
    () => yearOptions(yearFromIso(data?.fiscalYearStart) || year),
    [data?.fiscalYearStart, year]
  );

  async function handlePrint() {
    setPrintError("");
    setPrinting(true);
    try {
      const html = await getTaxCertificatePrintHtml({ fiscalYearStart: year });
      openPrintHtml(html);
    } catch (err) {
      setPrintError(
        getApiErrorMessage(err, "Could not open tax certificate print.")
      );
    } finally {
      setPrinting(false);
    }
  }

  const columns = useMemo(
    () => [
      {
        id: "serial",
        header: "#",
        headerClassName: "w-12",
        cellClassName: "whitespace-nowrap tabular-nums text-[var(--muted)]",
        cell: (_row, { index }) => rowSerial(index, 1, 0),
      },
      {
        id: "period",
        header: "Pay period",
        cellClassName: "whitespace-nowrap font-semibold text-[var(--text)]",
        cell: (row) => {
          if (row.payPeriodLabel) return row.payPeriodLabel;
          if (row.payPeriodStart || row.payPeriodEnd) {
            return `${formatDate(row.payPeriodStart, dateFormat)} – ${formatDate(row.payPeriodEnd, dateFormat)}`;
          }
          return "—";
        },
      },
      {
        id: "gross",
        header: "Gross salary",
        cellClassName: "whitespace-nowrap tabular-nums text-[var(--text)]",
        cell: (row) => formatPayslipMoney(row.grossSalary, currency),
      },
      {
        id: "taxable",
        header: "Taxable income",
        cellClassName: "whitespace-nowrap tabular-nums text-[var(--text)]",
        cell: (row) => formatPayslipMoney(row.taxableIncome, currency),
      },
      {
        id: "tax",
        header: "Tax deducted",
        cellClassName: "whitespace-nowrap tabular-nums font-semibold text-[var(--danger)]",
        cell: (row) => formatPayslipMoney(row.taxDeducted, currency),
      },
    ],
    [currency, dateFormat]
  );

  const fyLabel =
    data?.fiscalYearStart && data?.fiscalYearEnd
      ? `${formatDate(data.fiscalYearStart, dateFormat)} – ${formatDate(data.fiscalYearEnd, dateFormat)}`
      : String(year);

  return (
    <PortalPage
      fill
      title="Tax Certificate"
      subtitle="Income-tax deduction certificate issued by your employer for the selected tax year."
      error={error}
      actions={
        <>
          <Link
            href="/payslip"
            className="inline-flex h-8 items-center gap-1.5 rounded-lg border border-[var(--border)] px-3 text-[12.5px] font-semibold text-[var(--text)] hover:bg-[var(--panel-soft)]"
          >
            <ArrowLeft className="h-4 w-4" />
            Payslips
          </Link>
          <label className="inline-flex h-8 items-center gap-1.5 rounded-lg border border-[var(--border)] bg-[var(--surface)] px-2 text-[12px] text-[var(--muted)]">
            Fiscal year
            <select
              value={year}
              onChange={(e) => setYear(Number(e.target.value))}
              className="h-7 border-0 bg-transparent text-[12.5px] font-semibold text-[var(--text)] outline-none"
            >
              {years.map((y) => (
                <option key={y} value={y}>
                  {y}
                </option>
              ))}
            </select>
          </label>
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
            disabled={printing || loading}
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

      <CollapsibleSection title="Certificate summary">
        <div className="mb-2 grid grid-cols-2 gap-2 sm:grid-cols-3 lg:grid-cols-4">
          <p className="text-[12px] text-[var(--muted)]">
            Employee{" "}
            <span className="font-semibold text-[var(--text)]">
              {data?.employee?.fullName || "—"}
            </span>
            {data?.employee?.employeeCode
              ? ` · ${data.employee.employeeCode}`
              : ""}
          </p>
          <p className="text-[12px] text-[var(--muted)]">
            Employer{" "}
            <span className="font-semibold text-[var(--text)]">
              {data?.companyName || "—"}
            </span>
          </p>
          <p className="text-[12px] text-[var(--muted)]">
            Tax year{" "}
            <span className="font-semibold text-[var(--text)]">
              {data?.taxYear ?? "—"}
            </span>
          </p>
          <p className="text-[12px] text-[var(--muted)]">
            CNIC / National ID{" "}
            <span className="font-semibold text-[var(--text)]">
              {data?.employee?.nationalId || "—"}
            </span>
          </p>
          <p className="text-[12px] text-[var(--muted)]">
            Period{" "}
            <span className="font-semibold text-[var(--text)]">{fyLabel}</span>
          </p>
        </div>
        <p className="mb-2.5 text-[12px] text-[var(--muted)]">
          {data?.taxConfigName || data?.countryName || ""}
        </p>
        <div className={SUMMARY_GRID_CLASS}>
          <SoftStat
            label="Total gross"
            value={
              loading
                ? "…"
                : formatPayslipMoney(data?.totalGrossSalary, currency)
            }
          />
          <SoftStat
            label="Taxable income"
            value={
              loading
                ? "…"
                : formatPayslipMoney(data?.totalTaxableIncome, currency)
            }
          />
          <SoftStat
            label="Tax deducted"
            value={
              loading
                ? "…"
                : formatPayslipMoney(data?.totalTaxDeducted, currency)
            }
            color="#ef4444"
          />
          <SoftStat
            label="Months"
            value={loading ? "…" : data?.monthly?.length ?? 0}
            color="#7b39ec"
          />
        </div>
      </CollapsibleSection>

      <TablePanel
        title="Monthly deduction breakdown"
        titleCount={data?.monthly?.length ?? 0}
        titleCountLabel="Periods"
        onRefresh={refetch}
        columns={columns}
        rows={data?.monthly || []}
        getRowKey={(row) => row.id}
        minWidth="760px"
        loading={loading}
        loadingLabel="Loading tax certificate"
        loadingHint="Fetching withholding totals for this year…"
        emptyIcon={FileBadge}
        emptyTitle="No payroll periods in this tax year yet"
        emptyHint="When payslips are processed in this fiscal year, monthly tax deductions will list here."
        showPagination={false}
      />
    </PortalPage>
  );
}
