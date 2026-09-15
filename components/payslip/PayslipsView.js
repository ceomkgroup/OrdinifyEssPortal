"use client";

import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { createPortal } from "react-dom";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { Eye, MoreVertical, Printer, RefreshCw, WalletCards } from "lucide-react";
import { getPayslipPrintHtml } from "@/api/payslips";
import { Button } from "@/components/ui/Button";
import { CollapsibleSection } from "@/components/ui/CollapsibleSection";
import { FlashBanner } from "@/components/ui/FlashBanner";
import { SoftStat, SUMMARY_GRID_CLASS } from "@/components/ui/SoftStat";
import { PortalPage } from "@/components/ui/PortalPage";
import { TablePanel } from "@/components/ui/TablePanel";
import { useCompanySettings } from "@/hooks/useCompanySettings";
import { usePayslipList } from "@/hooks/usePayslips";
import {
  readQueryInt,
  REQUEST_LIST_QUERY_DEFAULTS,
  usePersistListQuery,
  usePortalQuery,
} from "@/hooks/usePortalQuery";
import { formatDate, rowSerial } from "@/lib/format";
import { getApiErrorMessage } from "@/lib/api-error";
import { formatPayslipMoney, openPrintHtml } from "@/lib/print-html";

function PayslipRowActions({ payslipId, printing, onView, onPrint }) {
  const [open, setOpen] = useState(false);
  const [coords, setCoords] = useState({ top: 0, left: 0 });
  const buttonRef = useRef(null);

  useEffect(() => {
    if (!open) return undefined;

    function placeMenu() {
      const rect = buttonRef.current?.getBoundingClientRect();
      if (!rect) return;
      const menuWidth = 176;
      const left = Math.min(
        Math.max(8, rect.right - menuWidth),
        window.innerWidth - menuWidth - 8
      );
      setCoords({ top: rect.bottom + 6, left });
    }

    placeMenu();

    function onDocClick(event) {
      if (
        buttonRef.current?.contains(event.target) ||
        event.target.closest?.(`[data-payslip-menu="${payslipId}"]`)
      ) {
        return;
      }
      setOpen(false);
    }

    document.addEventListener("mousedown", onDocClick);
    window.addEventListener("resize", placeMenu);
    window.addEventListener("scroll", placeMenu, true);
    return () => {
      document.removeEventListener("mousedown", onDocClick);
      window.removeEventListener("resize", placeMenu);
      window.removeEventListener("scroll", placeMenu, true);
    };
  }, [open, payslipId]);

  return (
    <>
      <button
        ref={buttonRef}
        type="button"
        className="inline-flex h-8 w-8 items-center justify-center rounded-lg border border-[var(--border)] bg-[var(--surface)] text-[var(--muted)] transition hover:bg-[var(--panel-soft)] hover:text-[var(--text)]"
        aria-label="Row actions"
        aria-expanded={open}
        onClick={(event) => {
          event.stopPropagation();
          setOpen((v) => !v);
        }}
      >
        <MoreVertical className="h-4 w-4" />
      </button>
      {open && typeof document !== "undefined"
        ? createPortal(
            <div
              data-payslip-menu={payslipId}
              className="fixed z-[9999] w-44 overflow-hidden rounded-xl border border-[var(--border)] bg-[var(--surface)] shadow-[0_12px_32px_rgba(15,23,42,0.18)]"
              style={{ top: coords.top, left: coords.left }}
            >
              <button
                type="button"
                className="flex w-full items-center gap-2 px-3 py-2.5 text-left text-[13px] font-semibold text-[var(--text)] hover:bg-[var(--panel-soft)]"
                onClick={() => {
                  setOpen(false);
                  onView?.();
                }}
              >
                <Eye className="h-4 w-4 text-[var(--violet)]" />
                View
              </button>
              <button
                type="button"
                disabled={printing}
                className="flex w-full items-center gap-2 px-3 py-2.5 text-left text-[13px] font-semibold text-[var(--text)] hover:bg-[var(--panel-soft)] disabled:opacity-50"
                onClick={() => {
                  setOpen(false);
                  onPrint?.();
                }}
              >
                <Printer className="h-4 w-4 text-[var(--violet)]" />
                {printing ? "Opening…" : "Print"}
              </button>
            </div>,
            document.body
          )
        : null}
    </>
  );
}

function statusTone(status) {
  const s = String(status || "").toLowerCase();
  if (s === "paid" || s === "processed" || s === "posted") {
    return "border-[var(--success)]/20 bg-[var(--success-soft)] text-[var(--success)]";
  }
  if (s === "draft" || s === "pending") {
    return "border-[var(--warning)]/20 bg-[var(--warning-soft)] text-[var(--warning)]";
  }
  if (s === "failed" || s === "cancelled" || s === "canceled") {
    return "border-[var(--danger)]/20 bg-[var(--danger-soft)] text-[var(--danger)]";
  }
  return "border-[var(--border)] bg-[var(--panel-soft)] text-[var(--muted)]";
}

export function PayslipsView() {
  const router = useRouter();
  const { settings } = useCompanySettings();
  const dateFormat = settings.dateFormat || "DD/MM/YYYY";
  const { searchParams } = usePortalQuery();
  const defaults = REQUEST_LIST_QUERY_DEFAULTS;

  const [page, setPage] = useState(() =>
    readQueryInt(searchParams, "page", Number(defaults.page) || 1)
  );
  const [limit, setLimit] = useState(() =>
    readQueryInt(searchParams, "limit", Number(defaults.limit) || 10)
  );
  const [printError, setPrintError] = useState("");
  const [printingId, setPrintingId] = useState("");

  usePersistListQuery(
    { page, limit },
    { page: defaults.page, limit: defaults.limit },
    [page, limit]
  );

  const { rows, meta, loading, error, refetch } = usePayslipList({
    page,
    limit,
  });

  const latest = rows[0] || null;
  const paidCount = rows.filter((row) => row.runStatus === "paid").length;

  const handlePrint = useCallback(async (payslipId) => {
    if (!payslipId) return;
    setPrintError("");
    setPrintingId(payslipId);
    try {
      const html = await getPayslipPrintHtml(payslipId);
      openPrintHtml(html);
    } catch (err) {
      setPrintError(getApiErrorMessage(err, "Could not open payslip print."));
    } finally {
      setPrintingId("");
    }
  }, []);

  const columns = useMemo(
    () => [
      {
        id: "serial",
        header: "#",
        headerClassName: "w-12",
        cellClassName: "whitespace-nowrap tabular-nums text-[var(--muted)]",
        cell: (_row, { index }) => rowSerial(index, page, limit),
      },
      {
        id: "period",
        header: "Pay period",
        cellClassName: "whitespace-nowrap font-semibold text-[var(--text)]",
        cell: (row) =>
          `${formatDate(row.payPeriodStart, dateFormat)} – ${formatDate(row.payPeriodEnd, dateFormat)}`,
      },
      {
        id: "paymentDate",
        header: "Payment date",
        cellClassName: "whitespace-nowrap text-[var(--muted)]",
        cell: (row) => formatDate(row.paymentDate, dateFormat),
      },
      {
        id: "gross",
        header: "Gross",
        cellClassName: "whitespace-nowrap tabular-nums text-[var(--text)]",
        cell: (row) => formatPayslipMoney(row.grossSalary, row.currency),
      },
      {
        id: "deductions",
        header: "Deductions",
        cellClassName: "whitespace-nowrap tabular-nums text-[var(--danger)]",
        cell: (row) => formatPayslipMoney(row.totalDeductions, row.currency),
      },
      {
        id: "net",
        header: "Net salary",
        cellClassName: "whitespace-nowrap tabular-nums font-semibold text-[var(--success)]",
        cell: (row) => formatPayslipMoney(row.netSalary, row.currency),
      },
      {
        id: "status",
        header: "Status",
        cell: (row) => (
          <span
            className={`inline-flex rounded-full border px-2.5 py-0.5 text-[11px] font-semibold capitalize ${statusTone(row.runStatus)}`}
          >
            {row.runStatus || "—"}
          </span>
        ),
      },
      {
        id: "action",
        header: "Action",
        headerClassName: "w-16 text-right",
        cellClassName: "text-right",
        cell: (row) => (
          <PayslipRowActions
            payslipId={row.payslipId}
            printing={printingId === row.payslipId}
            onView={() => router.push(`/payslip/${row.payslipId}`)}
            onPrint={() => handlePrint(row.payslipId)}
          />
        ),
      },
    ],
    [dateFormat, handlePrint, limit, page, printingId, router]
  );

  return (
    <PortalPage
      fill
      title="My Payslips"
      subtitle="Your monthly salary slips. Open a slip for the full breakdown, or print to PDF."
      error={error}
      actions={
        <>
          <Link
            href="/payslip/tax-certificate"
            className="inline-flex h-8 items-center rounded-lg border border-[var(--btn-outline-border)] bg-[var(--surface)] px-3 text-[12.5px] font-semibold text-[var(--btn-outline-text)] transition hover:bg-[var(--lavender-soft)]"
          >
            Tax certificate
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

      <CollapsibleSection title="Summary">
        <div className={SUMMARY_GRID_CLASS}>
          <SoftStat label="Payslips" value={loading ? "…" : meta.total} />
          <SoftStat
            label="Latest net"
            value={
              loading
                ? "…"
                : latest
                  ? formatPayslipMoney(latest.netSalary, latest.currency)
                  : "—"
            }
            color="#22c55e"
          />
          <SoftStat
            label="Paid (this page)"
            value={loading ? "…" : paidCount}
            color="#7b39ec"
          />
          <SoftStat
            label="Last payment"
            value={
              loading
                ? "…"
                : latest
                  ? formatDate(latest.paymentDate, dateFormat)
                  : "—"
            }
          />
        </div>
      </CollapsibleSection>

      <TablePanel
        title="Payslip logs"
        titleCount={meta.total}
        titleCountLabel="Total payslips"
        onRefresh={refetch}
        columns={columns}
        rows={rows}
        getRowKey={(row) => row.payslipId}
        minWidth="900px"
        loading={loading}
        loadingLabel="Loading payslips"
        loadingHint="Fetching your salary slips…"
        emptyIcon={WalletCards}
        emptyTitle="No payslips yet"
        emptyHint="When payroll is processed, your monthly slips will appear here."
        page={page}
        pageSize={limit}
        total={meta.total}
        totalPages={meta.totalPages}
        onPageChange={setPage}
        onPageSizeChange={(n) => {
          setLimit(n);
          setPage(1);
        }}
      />
    </PortalPage>
  );
}
