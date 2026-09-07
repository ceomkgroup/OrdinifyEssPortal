"use client";

import { useMemo, useState } from "react";
import {
  CheckCircle2,
  Eye,
  History,
  Inbox,
  Laptop,
  RefreshCw,
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
  acknowledgeAssignment,
  useAssetHistory,
  useMyAssets,
} from "@/hooks/useAssets";
import {
  readQueryInt,
  readQueryString,
  usePersistListQuery,
  usePortalQuery,
} from "@/hooks/usePortalQuery";
import { getApiErrorMessage } from "@/lib/api-error";
import { formatDate, formatDateTime, rowSerial } from "@/lib/format";

function titleCase(value) {
  if (!value) return "—";
  return String(value)
    .replace(/_/g, " ")
    .replace(/\b\w/g, (c) => c.toUpperCase());
}

function statusTone(status) {
  const s = String(status || "").toLowerCase();
  if (s === "active" || s === "assigned") {
    return "border-[var(--success)]/25 bg-[var(--success-soft)] text-[var(--success)]";
  }
  if (s === "returned" || s === "closed") {
    return "border-[var(--border)] bg-[var(--panel-soft)] text-[var(--muted)]";
  }
  return "border-[var(--violet)]/20 bg-[var(--lavender-soft)] text-[var(--violet)]";
}

function actionLabel(action) {
  const map = {
    created: "Created",
    assigned: "Assigned",
    verified: "Verified",
    incident_reported: "Incident reported",
    acknowledged: "Acknowledged",
    returned: "Returned",
    disputed: "Disputed",
  };
  return map[String(action || "").toLowerCase()] || titleCase(action);
}

function DetailField({ label, children }) {
  return (
    <div className="min-w-0">
      <dt className="text-[11px] font-semibold uppercase tracking-wide text-[var(--muted)]">
        {label}
      </dt>
      <dd className="mt-1.5 text-[13px] font-medium text-[var(--text)]">
        {children || "—"}
      </dd>
    </div>
  );
}

export function MyAssetsView({ dateFormat = "DD/MM/YYYY", timeFormat = "12h" }) {
  const { canAccessRoute, loading: modulesLoading } = useModules();
  const moduleEnabled = canAccessRoute("/assets/my");

  const { searchParams } = usePortalQuery();
  const [listQuery, setListQuery] = useState(() =>
    readQueryString(searchParams, "q", "")
  );
  const [statusTab, setStatusTab] = useState(() =>
    readQueryString(searchParams, "status", "all")
  );
  const [page, setPage] = useState(() => readQueryInt(searchParams, "page", 1));
  const [limit, setLimit] = useState(() =>
    readQueryInt(searchParams, "limit", 20)
  );

  usePersistListQuery(
    { page, limit, q: listQuery, status: statusTab },
    { page: "1", limit: "20", q: "", status: "all" },
    [page, limit, listQuery, statusTab]
  );

  const [selected, setSelected] = useState(null);
  const [busyId, setBusyId] = useState(null);
  const [flash, setFlash] = useState("");
  const [flashTone, setFlashTone] = useState("success");

  const { rows, loading, error, refetch } = useMyAssets({
    enabled: moduleEnabled && !modulesLoading,
  });
  const {
    rows: historyRows,
    loading: historyLoading,
    error: historyError,
    refetch: refetchHistory,
  } = useAssetHistory(selected?.assetId, {
    enabled: Boolean(selected?.assetId),
  });

  const stats = useMemo(() => {
    const total = rows.length;
    const active = rows.filter((r) => r.status === "active").length;
    const pendingAck = rows.filter((r) => r.needsAcknowledgement).length;
    return { total, active, pendingAck };
  }, [rows]);

  const filteredRows = useMemo(() => {
    const q = listQuery.trim().toLowerCase();
    return rows.filter((row) => {
      if (statusTab === "active" && row.status !== "active") return false;
      if (statusTab === "pending_ack" && !row.needsAcknowledgement) return false;
      if (!q) return true;
      const hay = [
        row.asset?.assetTag,
        row.asset?.name,
        row.asset?.categoryName,
        row.status,
        row.checkoutCondition,
      ]
        .filter(Boolean)
        .join(" ")
        .toLowerCase();
      return hay.includes(q);
    });
  }, [rows, listQuery, statusTab]);

  const pagedRows = useMemo(() => {
    const start = (page - 1) * limit;
    return filteredRows.slice(start, start + limit);
  }, [filteredRows, page, limit]);

  const totalPages = Math.max(1, Math.ceil(filteredRows.length / limit) || 1);

  const columns = useMemo(
    () => [
      {
        id: "serial",
        header: "#",
        headerClassName: "w-12",
        cellClassName: "tabular-nums text-[var(--muted)]",
        cell: (_row, { index }) => rowSerial(index, page, limit),
      },
      {
        id: "tag",
        header: "Asset tag",
        cellClassName: "whitespace-nowrap font-semibold text-[var(--text)]",
        cell: (row) => (
          <span className="inline-flex items-center gap-1.5">
            <Laptop className="h-3.5 w-3.5 text-[var(--violet)]" />
            {row.asset?.assetTag || "—"}
          </span>
        ),
      },
      {
        id: "name",
        header: "Name",
        cellClassName: "font-medium text-[var(--text)]",
        cell: (row) => row.asset?.name || "—",
      },
      {
        id: "category",
        header: "Category",
        cellClassName: "whitespace-nowrap text-[var(--muted)]",
        cell: (row) => row.asset?.categoryName || "—",
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
        id: "assigned",
        header: "Assigned",
        cellClassName: "whitespace-nowrap text-[var(--muted)]",
        cell: (row) =>
          row.assignedDate ? formatDate(row.assignedDate, dateFormat) : "—",
      },
      {
        id: "ack",
        header: "Acknowledgement",
        cell: (row) =>
          row.acknowledgedAt ? (
            <span className="text-[12px] font-semibold text-[var(--success)]">
              Done
            </span>
          ) : (
            <span className="text-[12px] font-semibold text-[var(--warning)]">
              Pending
            </span>
          ),
      },
      {
        id: "action",
        header: "Action",
        cell: (row) => (
          <div className="flex flex-wrap items-center gap-1.5">
            <button
              type="button"
              className="inline-flex h-8 items-center gap-1 rounded-lg border border-[var(--border)] bg-[var(--surface)] px-2 text-[11px] font-semibold hover:bg-[var(--lavender-soft)]"
              onClick={(e) => {
                e.stopPropagation();
                setSelected(row);
              }}
            >
              <Eye className="h-3.5 w-3.5 text-[var(--violet)]" />
              View
            </button>
            {row.needsAcknowledgement ? (
              <button
                type="button"
                className="inline-flex h-8 items-center gap-1 rounded-lg border border-[var(--success)]/30 bg-[var(--success-soft)] px-2 text-[11px] font-semibold text-[var(--success)]"
                disabled={busyId === row.assignmentId}
                onClick={(e) => {
                  e.stopPropagation();
                  handleAcknowledge(row);
                }}
              >
                <CheckCircle2 className="h-3.5 w-3.5" />
                Ack
              </button>
            ) : null}
          </div>
        ),
      },
    ],
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [page, limit, dateFormat, busyId]
  );

  async function handleAcknowledge(row) {
    if (!row?.assignmentId) return;
    setBusyId(row.assignmentId);
    try {
      const res = await acknowledgeAssignment(row.assignmentId);
      setFlashTone("success");
      setFlash(res?.message || "Asset acknowledged successfully.");
      refetch();
      if (selected?.assignmentId === row.assignmentId) {
        setSelected({
          ...row,
          acknowledgedAt: new Date().toISOString(),
          needsAcknowledgement: false,
        });
      }
    } catch (err) {
      setFlashTone("danger");
      setFlash(getApiErrorMessage(err, "Failed to acknowledge asset."));
    } finally {
      setBusyId(null);
    }
  }

  if (modulesLoading) {
    return <PageLoader label="Loading" hint="Checking assets access…" />;
  }

  if (!moduleEnabled) {
    return (
      <ComingSoon
        title="My Assets"
        description="This module is not enabled for your company."
      />
    );
  }

  return (
    <PortalPage
      fill
      title="My Assets"
      subtitle="Assets currently assigned to you — view details, history, and acknowledge receipt."
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
        <div className="grid grid-cols-3 gap-2.5">
          <SoftStat label="Total" value={stats.total} />
          <SoftStat label="Active" value={stats.active} color="#22c55e" />
          <SoftStat
            label="Pending ack"
            value={stats.pendingAck}
            color="#f59e0b"
          />
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
        title="Assigned assets"
        titleCount={filteredRows.length}
        titleCountLabel="Total assets"
        tabs={[
          { value: "all", label: "All" },
          { value: "active", label: "Active" },
          { value: "pending_ack", label: "Pending ack" },
        ]}
        tab={statusTab}
        onTabChange={(next) => {
          setStatusTab(next);
          setPage(1);
        }}
        search={listQuery}
        onSearchChange={(v) => {
          setListQuery(v);
          setPage(1);
        }}
        searchPlaceholder="Search by tag, name…"
        onRefresh={refetch}
        columns={columns}
        rows={pagedRows}
        getRowKey={(row) => row.assignmentId || row.assetId}
        minWidth="920px"
        loading={loading}
        loadingLabel="Loading assets"
        loadingHint="Fetching your assigned assets…"
        error={error}
        emptyIcon={Inbox}
        emptyTitle="No assets assigned"
        emptyHint="When HR assigns a laptop or device, it will appear here."
        page={page}
        pageSize={limit}
        total={filteredRows.length}
        totalPages={totalPages}
        onPageChange={setPage}
        onPageSizeChange={(n) => {
          setLimit(n);
          setPage(1);
        }}
      />

      <SlideOver
        open={Boolean(selected)}
        onClose={() => setSelected(null)}
        title={selected?.asset?.name || "Asset details"}
        subtitle={selected?.asset?.assetTag || undefined}
        wide
      >
        {selected ? (
          <div className="space-y-4 pb-8">
            <div className="flex flex-wrap items-center justify-between gap-3 rounded-2xl border border-[var(--border)] bg-gradient-to-br from-[var(--lavender-soft)]/70 via-[var(--surface)] to-[var(--surface)] px-4 py-3.5">
              <span
                className={`inline-flex rounded-full border px-3 py-1 text-[12px] font-semibold capitalize ${statusTone(selected.status)}`}
              >
                {selected.status || "—"}
              </span>
              <div className="flex flex-wrap gap-2">
                {selected.needsAcknowledgement ? (
                  <Button
                    type="button"
                    className="h-9 rounded-xl"
                    disabled={busyId === selected.assignmentId}
                    onClick={() => handleAcknowledge(selected)}
                  >
                    <CheckCircle2 className="h-4 w-4" />
                    {busyId === selected.assignmentId
                      ? "Acknowledging…"
                      : "Acknowledge"}
                  </Button>
                ) : (
                  <span className="inline-flex items-center gap-1.5 text-[12px] font-semibold text-[var(--success)]">
                    <CheckCircle2 className="h-4 w-4" />
                    Acknowledged
                  </span>
                )}
              </div>
            </div>

            <section className="rounded-2xl border border-[var(--border)] bg-[var(--surface)] p-5 shadow-[var(--card-shadow)]">
              <dl className="grid grid-cols-1 gap-x-6 gap-y-5 sm:grid-cols-2">
                <DetailField label="Asset tag">
                  {selected.asset?.assetTag}
                </DetailField>
                <DetailField label="Category">
                  {selected.asset?.categoryName}
                </DetailField>
                <DetailField label="Serial number">
                  {selected.asset?.serialNumber || "—"}
                </DetailField>
                <DetailField label="Vendor">
                  {selected.asset?.vendor || "—"}
                </DetailField>
                <DetailField label="Checkout condition">
                  {titleCase(selected.checkoutCondition)}
                </DetailField>
                <DetailField label="Assigned date">
                  {selected.assignedDate
                    ? formatDate(selected.assignedDate, dateFormat)
                    : "—"}
                </DetailField>
                <DetailField label="Warranty end">
                  {selected.asset?.warrantyEnd
                    ? formatDate(selected.asset.warrantyEnd, dateFormat)
                    : "—"}
                </DetailField>
                <DetailField label="Acknowledged">
                  {selected.acknowledgedAt
                    ? formatDateTime(
                        selected.acknowledgedAt,
                        dateFormat,
                        timeFormat
                      )
                    : "Not yet"}
                </DetailField>
              </dl>
            </section>

            <section className="rounded-2xl border border-[var(--border)] bg-[var(--surface)] p-5 shadow-[var(--card-shadow)]">
              <div className="mb-4 flex items-center justify-between gap-2">
                <div className="flex items-center gap-2">
                  <History className="h-4 w-4 text-[var(--violet)]" />
                  <h3 className="heading-card">History</h3>
                </div>
                <Button
                  type="button"
                  variant="outline"
                  className="h-8 rounded-lg px-2.5 text-[12px]"
                  onClick={refetchHistory}
                >
                  <RefreshCw className="h-3.5 w-3.5" />
                  Refresh
                </Button>
              </div>
              {historyLoading ? (
                <PageLoader compact label="Loading history" />
              ) : historyError ? (
                <p className="text-[13px] text-[var(--danger)]">{historyError}</p>
              ) : historyRows.length === 0 ? (
                <p className="text-[13px] text-[var(--muted)]">
                  No history events yet.
                </p>
              ) : (
                <ol className="space-y-3">
                  {historyRows.map((item) => (
                    <li
                      key={item.historyId}
                      className="relative rounded-xl border border-[var(--border)] bg-[var(--panel-soft)] px-3.5 py-3"
                    >
                      <div className="flex flex-wrap items-center justify-between gap-2">
                        <p className="text-[13px] font-semibold text-[var(--text)]">
                          {actionLabel(item.action)}
                        </p>
                        <p className="text-[11px] tabular-nums text-[var(--muted)]">
                          {item.createdAt
                            ? formatDateTime(
                                item.createdAt,
                                dateFormat,
                                timeFormat
                              )
                            : "—"}
                        </p>
                      </div>
                      <p className="mt-1 text-[12px] text-[var(--muted)]">
                        By {item.actorName}
                        {item.actorCode ? ` · ${item.actorCode}` : ""}
                      </p>
                      {item.remarks ? (
                        <p className="mt-1.5 text-[12px] text-[var(--text)]">
                          {item.remarks}
                        </p>
                      ) : null}
                    </li>
                  ))}
                </ol>
              )}
            </section>
          </div>
        ) : null}
      </SlideOver>
    </PortalPage>
  );
}
