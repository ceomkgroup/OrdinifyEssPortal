"use client";

import { useMemo, useState } from "react";
import {
  CheckCircle2,
  Inbox,
  RefreshCw,
  ShieldAlert,
  ShieldCheck,
} from "lucide-react";
import { Button } from "@/components/ui/Button";
import { FlashBanner } from "@/components/ui/FlashBanner";
import { CollapsibleSection } from "@/components/ui/CollapsibleSection";
import { SoftStat } from "@/components/ui/SoftStat";
import { PortalPage } from "@/components/ui/PortalPage";
import { SlideOver } from "@/components/ui/SlideOver";
import { TablePanel } from "@/components/ui/TablePanel";
import { ComingSoon } from "@/components/ui/ComingSoon";
import { PageLoader } from "@/components/ui/Spinner";
import { useModules } from "@/components/modules/ModulesProvider";
import {
  confirmVerification,
  disputeVerification,
  useAssetVerifications,
} from "@/hooks/useAssets";
import {
  readQueryInt,
  readQueryString,
  usePersistListQuery,
  usePortalQuery,
} from "@/hooks/usePortalQuery";
import { getApiErrorMessage } from "@/lib/api-error";
import { formatDateTime, rowSerial } from "@/lib/format";

const fieldClass =
  "mt-1.5 h-11 w-full rounded-xl border border-[var(--border)] bg-[var(--surface)] px-3 text-[13px] text-[var(--text)] outline-none transition focus:border-[var(--violet)] focus:ring-2 focus:ring-[var(--lavender-soft)]";

function statusTone(status) {
  const s = String(status || "").toLowerCase();
  if (s === "confirmed" || s === "approved") {
    return "border-[var(--success)]/25 bg-[var(--success-soft)] text-[var(--success)]";
  }
  if (s === "disputed" || s === "rejected") {
    return "border-[var(--danger)]/25 bg-[var(--danger-soft)] text-[var(--danger)]";
  }
  return "border-[var(--warning)]/30 bg-[var(--warning-soft)] text-[var(--warning)]";
}

export function AssetVerificationsView({
  dateFormat = "DD/MM/YYYY",
  timeFormat = "12h",
}) {
  const { canAccessRoute, loading: modulesLoading } = useModules();
  const moduleEnabled = canAccessRoute("/assets/verifications");

  const { searchParams } = usePortalQuery();
  const [page, setPage] = useState(() => readQueryInt(searchParams, "page", 1));
  const [limit, setLimit] = useState(() =>
    readQueryInt(searchParams, "limit", 20)
  );
  const [listQuery, setListQuery] = useState(() =>
    readQueryString(searchParams, "q", "")
  );
  const [statusTab, setStatusTab] = useState(() =>
    readQueryString(searchParams, "status", "all")
  );

  usePersistListQuery(
    { page, limit, q: listQuery, status: statusTab },
    { page: "1", limit: "20", q: "", status: "all" },
    [page, limit, listQuery, statusTab]
  );

  const [selected, setSelected] = useState(null);
  const [disputeOpen, setDisputeOpen] = useState(false);
  const [remarks, setRemarks] = useState("");
  const [busyId, setBusyId] = useState(null);
  const [flash, setFlash] = useState("");
  const [flashTone, setFlashTone] = useState("success");

  const { rows, meta, loading, error, refetch } = useAssetVerifications({
    page,
    limit,
    enabled: moduleEnabled && !modulesLoading,
  });

  const filteredRows = useMemo(() => {
    const q = listQuery.trim().toLowerCase();
    return rows.filter((row) => {
      if (statusTab === "pending" && !row.canAction) return false;
      if (statusTab === "confirmed" && row.status !== "confirmed") return false;
      if (statusTab === "disputed" && row.status !== "disputed") return false;
      if (!q) return true;
      const hay = [row.assetTag, row.assetName, row.cycleLabel, row.status]
        .filter(Boolean)
        .join(" ")
        .toLowerCase();
      return hay.includes(q);
    });
  }, [rows, listQuery, statusTab]);

  const stats = useMemo(() => {
    const pending = rows.filter((r) => r.canAction).length;
    const confirmed = rows.filter((r) => r.status === "confirmed").length;
    const disputed = rows.filter((r) => r.status === "disputed").length;
    return {
      total: Number(meta?.total) || rows.length,
      pending,
      confirmed,
      disputed,
    };
  }, [rows, meta]);

  const total = Number(meta?.total) || 0;
  const currentPage = Number(meta?.page) || page;
  const totalPages = Math.max(1, Number(meta?.totalPages) || 1);

  const columns = useMemo(
    () => [
      {
        id: "serial",
        header: "#",
        headerClassName: "w-12",
        cellClassName: "tabular-nums text-[var(--muted)]",
        cell: (_row, { index }) => rowSerial(index, currentPage, limit),
      },
      {
        id: "asset",
        header: "Asset",
        cellClassName: "font-semibold text-[var(--text)]",
        cell: (row) => (
          <div className="min-w-0">
            <p className="truncate">{row.assetName || "—"}</p>
            <p className="text-[11px] font-medium text-[var(--muted)]">
              {row.assetTag || "—"}
            </p>
          </div>
        ),
      },
      {
        id: "cycle",
        header: "Cycle",
        cellClassName: "whitespace-nowrap text-[var(--muted)]",
        cell: (row) => row.cycleLabel || "—",
      },
      {
        id: "status",
        header: "Status",
        cell: (row) => (
          <span
            className={`inline-flex rounded-full border px-2.5 py-0.5 text-[11px] font-semibold capitalize ${statusTone(row.status)}`}
          >
            {row.status || "—"}
          </span>
        ),
      },
      {
        id: "confirmed",
        header: "Confirmed",
        cellClassName: "whitespace-nowrap text-[var(--muted)]",
        cell: (row) =>
          row.confirmedAt
            ? formatDateTime(row.confirmedAt, dateFormat, timeFormat)
            : "—",
      },
      {
        id: "action",
        header: "Action",
        cell: (row) => {
          if (row.canAction) {
            return (
              <div className="flex flex-wrap items-center gap-1.5">
                <button
                  type="button"
                  className="inline-flex h-8 items-center gap-1 rounded-lg border border-[var(--success)]/30 bg-[var(--success-soft)] px-2 text-[11px] font-semibold text-[var(--success)]"
                  disabled={busyId === row.verificationId}
                  onClick={(e) => {
                    e.stopPropagation();
                    handleConfirm(row);
                  }}
                >
                  <CheckCircle2 className="h-3.5 w-3.5" />
                  Confirm
                </button>
                <button
                  type="button"
                  className="inline-flex h-8 items-center gap-1 rounded-lg border border-[var(--danger)]/30 bg-[var(--danger-soft)] px-2 text-[11px] font-semibold text-[var(--danger)]"
                  disabled={busyId === row.verificationId}
                  onClick={(e) => {
                    e.stopPropagation();
                    setSelected(row);
                    setRemarks("");
                    setDisputeOpen(true);
                  }}
                >
                  <ShieldAlert className="h-3.5 w-3.5" />
                  Dispute
                </button>
              </div>
            );
          }

          const s = String(row.status || "").toLowerCase();
          if (s === "confirmed" || s === "approved") {
            return (
              <span className="inline-flex items-center gap-1 rounded-full border border-[var(--success)]/25 bg-[var(--success-soft)] px-2.5 py-1 text-[11px] font-semibold text-[var(--success)]">
                <CheckCircle2 className="h-3.5 w-3.5" />
                Completed
              </span>
            );
          }
          if (s === "disputed" || s === "rejected") {
            return (
              <span className="inline-flex items-center gap-1 rounded-full border border-[var(--danger)]/25 bg-[var(--danger-soft)] px-2.5 py-1 text-[11px] font-semibold text-[var(--danger)]">
                <ShieldAlert className="h-3.5 w-3.5" />
                Closed
              </span>
            );
          }
          return (
            <span className="inline-flex rounded-full border border-[var(--border)] bg-[var(--panel-soft)] px-2.5 py-1 text-[11px] font-semibold text-[var(--muted)]">
              No action needed
            </span>
          );
        },
      },
    ],
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [currentPage, limit, dateFormat, timeFormat, busyId]
  );

  async function handleConfirm(row) {
    if (!row?.verificationId) return;
    if (
      !window.confirm(
        `Confirm you still have "${row.assetName || row.assetTag}"?`
      )
    ) {
      return;
    }
    setBusyId(row.verificationId);
    try {
      const res = await confirmVerification(row.verificationId);
      setFlashTone("success");
      setFlash(res?.message || "Verification confirmed.");
      refetch();
    } catch (err) {
      setFlashTone("danger");
      setFlash(getApiErrorMessage(err, "Failed to confirm verification."));
    } finally {
      setBusyId(null);
    }
  }

  async function handleDispute(e) {
    e.preventDefault();
    if (!selected?.verificationId) return;
    if (!remarks.trim()) {
      setFlashTone("danger");
      setFlash("Please enter remarks for the dispute.");
      return;
    }
    setBusyId(selected.verificationId);
    try {
      const res = await disputeVerification(selected.verificationId, {
        remarks: remarks.trim(),
      });
      setFlashTone("success");
      setFlash(res?.message || "Verification disputed.");
      setDisputeOpen(false);
      setSelected(null);
      setRemarks("");
      refetch();
    } catch (err) {
      setFlashTone("danger");
      setFlash(getApiErrorMessage(err, "Failed to dispute verification."));
    } finally {
      setBusyId(null);
    }
  }

  if (modulesLoading) {
    return (
      <PageLoader label="Loading" hint="Checking verifications access…" />
    );
  }

  if (!moduleEnabled) {
    return (
      <ComingSoon
        title="Asset Verifications"
        description="This module is not enabled for your company."
      />
    );
  }

  return (
    <PortalPage
      fill
      title="Asset Verifications"
      subtitle="Confirm you still have assigned assets, or dispute if something is wrong."
      actions={
        <Button
          type="button"
          variant="outline"
          className="h-10 rounded-xl"
          onClick={refetch}
        >
          <RefreshCw className="h-4 w-4" />
          Refresh
        </Button>
      }
    >
      <CollapsibleSection title="Summary">
        <div className="grid grid-cols-2 gap-2.5 sm:grid-cols-4">
          <SoftStat label="Total" value={stats.total} />
          <SoftStat label="Pending" value={stats.pending} color="#f59e0b" />
          <SoftStat label="Confirmed" value={stats.confirmed} color="#22c55e" />
          <SoftStat label="Disputed" value={stats.disputed} color="#ef4444" />
        </div>
      </CollapsibleSection>

      {flash ? (
        <FlashBanner
          message={flash}
          tone={flashTone}
          duration={4000}
          onDismiss={() => setFlash("")}
        />
      ) : null}

      <TablePanel
        fill
        title="Verification cycles"
        titleCount={total}
        titleCountLabel="Total verifications"
        tabs={[
          { value: "all", label: "All" },
          { value: "pending", label: "Pending" },
          { value: "confirmed", label: "Confirmed" },
          { value: "disputed", label: "Disputed" },
        ]}
        tab={statusTab}
        onTabChange={(next) => {
          setStatusTab(next);
          setPage(1);
        }}
        recordCount={
          listQuery.trim() || statusTab !== "all"
            ? filteredRows.length
            : total
        }
        search={listQuery}
        onSearchChange={setListQuery}
        searchPlaceholder="Search by asset, cycle…"
        onRefresh={refetch}
        columns={columns}
        rows={
          listQuery.trim() || statusTab !== "all" ? filteredRows : rows
        }
        getRowKey={(row) => row.verificationId}
        minWidth="860px"
        loading={loading}
        loadingLabel="Loading verifications"
        loadingHint="Fetching verification cycles…"
        error={error}
        emptyIcon={ShieldCheck}
        emptyTitle="No verifications"
        emptyHint="When a verification cycle is opened, it will appear here."
        page={currentPage}
        pageSize={limit}
        total={
          listQuery.trim() || statusTab !== "all"
            ? filteredRows.length
            : total
        }
        totalPages={
          listQuery.trim() || statusTab !== "all" ? 1 : totalPages
        }
        onPageChange={setPage}
        onPageSizeChange={(n) => {
          setLimit(n);
          setPage(1);
        }}
      />

      <SlideOver
        open={disputeOpen}
        onClose={() => {
          setDisputeOpen(false);
          setRemarks("");
        }}
        title="Dispute verification"
        subtitle={
          selected
            ? `${selected.assetName || ""} · ${selected.assetTag || ""}`
            : undefined
        }
      >
        <form className="flex min-h-full flex-col pb-6" onSubmit={handleDispute}>
          <div className="flex-1 space-y-4">
            <p className="text-[13px] text-[var(--muted)]">
              Use dispute if you no longer have this asset or the record is
              incorrect.
            </p>
            <div>
              <label className="block text-[12px] font-semibold text-[var(--text)]">
                Remarks <span className="text-[var(--danger)]">*</span>
              </label>
              <textarea
                required
                rows={4}
                className={`${fieldClass} h-auto py-2.5`}
                placeholder="Explain why you are disputing…"
                value={remarks}
                onChange={(e) => setRemarks(e.target.value)}
              />
            </div>
          </div>
          <div className="sticky bottom-0 -mx-5 mt-6 border-t border-[var(--border)] bg-[var(--surface)] px-5 pt-4">
            <div className="flex justify-end gap-2">
              <Button
                type="button"
                variant="outline"
                className="h-11 rounded-xl"
                onClick={() => {
                  setDisputeOpen(false);
                  setRemarks("");
                }}
              >
                Cancel
              </Button>
              <Button
                type="submit"
                className="h-11 rounded-xl"
                disabled={busyId === selected?.verificationId}
              >
                <ShieldAlert className="h-4 w-4" />
                {busyId === selected?.verificationId
                  ? "Submitting…"
                  : "Submit dispute"}
              </Button>
            </div>
          </div>
        </form>
      </SlideOver>
    </PortalPage>
  );
}
