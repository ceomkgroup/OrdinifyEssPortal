"use client";

import Link from "next/link";
import { useState } from "react";
import {
  ArrowRight,
  CalendarRange,
  Eye,
  Printer,
  WalletCards,
} from "lucide-react";
import { getPayslipPrintHtml } from "@/api/payslips";
import { Card } from "@/components/ui/Card";
import { formatCurrency, formatDate, formatMonthYear } from "@/lib/format";
import { getApiErrorMessage } from "@/lib/api-error";
import { openPrintHtml } from "@/lib/print-html";

function Tile({ label, value, valueClass = "text-[var(--text)]" }) {
  return (
    <div className="min-w-0 rounded-lg border border-[var(--border)] bg-[var(--panel-soft)] px-3 py-2.5">
      <p className="text-[11px] text-[var(--muted)]">{label}</p>
      <p
        className={`mt-1 truncate text-[13px] font-semibold leading-snug tabular-nums ${valueClass}`}
        title={typeof value === "string" ? value : undefined}
      >
        {value}
      </p>
    </div>
  );
}

function statusTone(status) {
  const s = String(status || "").toLowerCase();
  if (s === "paid" || s === "processed" || s === "posted") {
    return "bg-[var(--success-soft)] text-[var(--success)]";
  }
  if (s === "draft" || s === "pending") {
    return "bg-[var(--warning-soft)] text-[var(--warning)]";
  }
  if (!s) return "";
  return "bg-[var(--panel-soft)] text-[var(--muted)]";
}

function periodMonthLabel(start) {
  const match = String(start || "").match(/^(\d{4})-(\d{2})/);
  if (!match) return "";
  return formatMonthYear(Number(match[1]), Number(match[2]));
}

export function LastPayslipBar({ lastPayslip, dateFormat }) {
  const [printing, setPrinting] = useState(false);
  const [printError, setPrintError] = useState("");

  if (!lastPayslip) return null;

  const currency = lastPayslip.currency || "PKR";
  const href = lastPayslip.payslipId
    ? `/payslip/${lastPayslip.payslipId}`
    : "/payslip";
  const gross = Number(lastPayslip.grossSalary) || 0;
  const net = Number(lastPayslip.netSalary) || 0;
  const deductionsRaw = Number(lastPayslip.totalDeductions);
  const deductions =
    Number.isFinite(deductionsRaw) && deductionsRaw > 0
      ? deductionsRaw
      : Math.max(gross - net, 0);
  const takeHomePct = gross > 0 ? Math.round((net / gross) * 100) : 0;
  const status = String(lastPayslip.runStatus || lastPayslip.status || "").toLowerCase();
  const monthLabel = periodMonthLabel(lastPayslip.payPeriodStart);
  const periodLabel = `${formatDate(lastPayslip.payPeriodStart, dateFormat)} – ${formatDate(lastPayslip.payPeriodEnd, dateFormat)}`;

  async function handlePrint() {
    if (!lastPayslip.payslipId) return;
    setPrintError("");
    setPrinting(true);
    try {
      const html = await getPayslipPrintHtml(lastPayslip.payslipId);
      openPrintHtml(html);
    } catch (err) {
      setPrintError(getApiErrorMessage(err, "Could not open payslip print."));
    } finally {
      setPrinting(false);
    }
  }

  return (
    <Card
      title="Last Payslip"
      className="h-full"
      action={
        <Link
          href="/payslip"
          className="inline-flex items-center gap-1 text-[12px] font-semibold text-[var(--violet)] hover:underline"
        >
          All payslips
          <ArrowRight className="h-3.5 w-3.5" />
        </Link>
      }
    >
      <div className="flex h-full flex-col gap-3">
        <div className="flex items-start justify-between gap-3 rounded-xl bg-[var(--success-soft)] px-3.5 py-3 sm:px-4">
          <div className="min-w-0">
            <p className="text-[11px] font-medium text-[var(--muted)]">
              Net salary{monthLabel ? ` · ${monthLabel}` : ""}
            </p>
            <p className="mt-1 text-[22px] font-bold leading-none tabular-nums text-[var(--success)]">
              {formatCurrency(net, currency)}
            </p>
            {gross > 0 ? (
              <p className="mt-2 text-[11px] text-[var(--muted)]">
                Take-home {takeHomePct}% of gross
              </p>
            ) : null}
          </div>
          <span className="flex h-11 w-11 shrink-0 items-center justify-center rounded-xl bg-[var(--surface)] text-[var(--success)] shadow-[var(--card-shadow)]">
            <WalletCards className="h-5 w-5" />
          </span>
        </div>

        {gross > 0 ? (
          <div>
            <div className="h-1.5 overflow-hidden rounded-full bg-[var(--progress-track)]">
              <div
                className="h-full rounded-full bg-[var(--success)]"
                style={{ width: `${Math.min(100, Math.max(0, takeHomePct))}%` }}
              />
            </div>
          </div>
        ) : null}

        <div className="grid grid-cols-2 gap-2.5 sm:grid-cols-4">
          <Tile label="Gross" value={formatCurrency(gross, currency)} />
          <Tile
            label="Deductions"
            value={formatCurrency(deductions, currency)}
            valueClass="text-[var(--danger)]"
          />
          <Tile
            label="Pay period"
            value={periodLabel}
            valueClass="text-[var(--text)]"
          />
          <Tile
            label="Payment date"
            value={formatDate(lastPayslip.paymentDate, dateFormat)}
          />
        </div>

        <div className="mt-auto flex flex-wrap items-center justify-between gap-2 border-t border-[var(--border)] pt-3">
          <div className="flex min-w-0 items-center gap-2">
            {status ? (
              <span
                className={`inline-flex rounded-md px-2 py-0.5 text-[11px] font-semibold capitalize ${statusTone(status)}`}
              >
                {status}
              </span>
            ) : (
              <span className="inline-flex items-center gap-1 text-[11px] text-[var(--muted)]">
                <CalendarRange className="h-3.5 w-3.5" />
                Latest processed slip
              </span>
            )}
            {printError ? (
              <span className="truncate text-[11px] text-[var(--danger)]">
                {printError}
              </span>
            ) : null}
          </div>
          <div className="flex shrink-0 items-center gap-2">
            <button
              type="button"
              disabled={printing || !lastPayslip.payslipId}
              onClick={handlePrint}
              className="inline-flex h-9 items-center gap-1.5 rounded-lg border border-[var(--border)] bg-[var(--surface)] px-3 text-[12.5px] font-semibold text-[var(--text)] transition hover:bg-[var(--panel-soft)] disabled:opacity-50"
            >
              <Printer className="h-3.5 w-3.5" />
              {printing ? "Opening…" : "Print"}
            </button>
            <Link
              href={href}
              className="inline-flex h-9 items-center gap-1.5 rounded-lg bg-[var(--btn-primary-bg)] px-3 text-[12.5px] font-semibold !text-white transition hover:brightness-110"
            >
              <Eye className="h-3.5 w-3.5" />
              View payslip
            </Link>
          </div>
        </div>
      </div>
    </Card>
  );
}
