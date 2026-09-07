"use client";

import { useMemo, useState } from "react";
import {
  AlertTriangle,
  Inbox,
  Plus,
  RefreshCw,
  Send,
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
  submitAssetIncident,
  useAssetIncidents,
  useMyAssets,
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

const INCIDENT_TYPES = [
  { value: "lost", label: "Lost" },
  { value: "damaged", label: "Damaged" },
];

function emptyForm() {
  return {
    assetId: "",
    incidentType: "damaged",
    description: "",
    policeReportNumber: "",
  };
}

function statusTone(status) {
  const s = String(status || "").toLowerCase();
  if (s === "approved" || s === "resolved" || s === "closed") {
    return "border-[var(--success)]/25 bg-[var(--success-soft)] text-[var(--success)]";
  }
  if (s === "rejected" || s === "cancelled") {
    return "border-[var(--danger)]/25 bg-[var(--danger-soft)] text-[var(--danger)]";
  }
  return "border-[var(--warning)]/30 bg-[var(--warning-soft)] text-[var(--warning)]";
}

function typeTone(type) {
  const t = String(type || "").toLowerCase();
  if (t === "lost") {
    return "border-[var(--danger)]/25 bg-[var(--danger-soft)] text-[var(--danger)]";
  }
  return "border-[var(--warning)]/30 bg-[var(--warning-soft)] text-[var(--warning)]";
}

export function AssetIncidentsView({
  dateFormat = "DD/MM/YYYY",
  timeFormat = "12h",
}) {
  const { canAccessRoute, loading: modulesLoading } = useModules();
  const moduleEnabled = canAccessRoute("/assets/incidents");

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

  const [showForm, setShowForm] = useState(false);
  const [form, setForm] = useState(emptyForm);
  const [submitting, setSubmitting] = useState(false);
  const [formError, setFormError] = useState("");
  const [flash, setFlash] = useState("");
  const [flashTone, setFlashTone] = useState("success");

  const { rows, meta, loading, error, refetch } = useAssetIncidents({
    page,
    limit,
    enabled: moduleEnabled && !modulesLoading,
  });
  const { rows: myAssets } = useMyAssets({
    enabled: moduleEnabled && !modulesLoading && showForm,
  });

  const filteredRows = useMemo(() => {
    const q = listQuery.trim().toLowerCase();
    return rows.filter((row) => {
      if (statusTab !== "all" && row.status !== statusTab) return false;
      if (!q) return true;
      const hay = [
        row.assetTag,
        row.assetName,
        row.incidentType,
        row.description,
        row.status,
        row.policeReportNumber,
      ]
        .filter(Boolean)
        .join(" ")
        .toLowerCase();
      return hay.includes(q);
    });
  }, [rows, listQuery, statusTab]);

  const stats = useMemo(() => {
    const reported = rows.filter((r) => r.status === "reported").length;
    const lost = rows.filter((r) => r.incidentType === "lost").length;
    const damaged = rows.filter((r) => r.incidentType === "damaged").length;
    return {
      total: Number(meta?.total) || rows.length,
      reported,
      lost,
      damaged,
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
        id: "type",
        header: "Type",
        cell: (row) => (
          <span
            className={`inline-flex rounded-full border px-2.5 py-0.5 text-[11px] font-semibold capitalize ${typeTone(row.incidentType)}`}
          >
            {row.incidentType || "—"}
          </span>
        ),
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
        id: "description",
        header: "Description",
        cellClassName: "max-w-[240px] truncate text-[var(--muted)]",
        cell: (row) => row.description || "—",
      },
      {
        id: "reported",
        header: "Reported",
        cellClassName: "whitespace-nowrap text-[var(--muted)]",
        cell: (row) =>
          row.reportedAt
            ? formatDateTime(row.reportedAt, dateFormat, timeFormat)
            : "—",
      },
    ],
    [currentPage, limit, dateFormat, timeFormat]
  );

  async function handleSubmit(e) {
    e.preventDefault();
    setFormError("");
    if (!form.assetId) {
      setFormError("Select an asset.");
      return;
    }
    if (!form.description.trim()) {
      setFormError("Description is required.");
      return;
    }
    setSubmitting(true);
    try {
      const res = await submitAssetIncident({
        assetId: form.assetId,
        incidentType: form.incidentType,
        description: form.description.trim(),
        policeReportNumber: form.policeReportNumber.trim() || undefined,
      });
      setShowForm(false);
      setForm(emptyForm());
      setFlashTone("success");
      setFlash(res?.message || "Incident reported successfully.");
      setPage(1);
      refetch();
    } catch (err) {
      setFormError(getApiErrorMessage(err, "Failed to report incident."));
    } finally {
      setSubmitting(false);
    }
  }

  if (modulesLoading) {
    return <PageLoader label="Loading" hint="Checking incidents access…" />;
  }

  if (!moduleEnabled) {
    return (
      <ComingSoon
        title="Asset Incidents"
        description="This module is not enabled for your company."
      />
    );
  }

  return (
    <PortalPage
      fill
      title="Asset Incidents"
      subtitle="Report lost or damaged assets and track your incident reports."
      actions={
        <>
          <Button
            type="button"
            variant="outline"
            className="h-10 rounded-xl"
            onClick={refetch}
          >
            <RefreshCw className="h-4 w-4" />
            Refresh
          </Button>
          <Button
            type="button"
            className="h-10 rounded-xl"
            onClick={() => {
              setShowForm(true);
              setFormError("");
            }}
          >
            <Plus className="h-4 w-4" />
            Report incident
          </Button>
        </>
      }
    >
      <CollapsibleSection title="Summary">
        <div className="grid grid-cols-2 gap-2.5 sm:grid-cols-4">
          <SoftStat label="Total" value={stats.total} />
          <SoftStat label="Reported" value={stats.reported} color="#f59e0b" />
          <SoftStat label="Lost" value={stats.lost} color="#ef4444" />
          <SoftStat label="Damaged" value={stats.damaged} color="#f97316" />
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
        title="Incident reports"
        titleCount={total}
        titleCountLabel="Total incidents"
        tabs={[
          { value: "all", label: "All" },
          { value: "reported", label: "Reported" },
          { value: "approved", label: "Approved" },
          { value: "rejected", label: "Rejected" },
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
        searchPlaceholder="Search incidents…"
        onRefresh={refetch}
        columns={columns}
        rows={
          listQuery.trim() || statusTab !== "all" ? filteredRows : rows
        }
        getRowKey={(row) => row.incidentId}
        minWidth="860px"
        loading={loading}
        loadingLabel="Loading incidents"
        loadingHint="Fetching your incident reports…"
        error={error}
        emptyIcon={Inbox}
        emptyTitle="No incidents"
        emptyHint="Report a lost or damaged asset if something goes wrong."
        emptyAction={
          <Button
            type="button"
            className="h-10 rounded-xl"
            onClick={() => setShowForm(true)}
          >
            <Plus className="h-4 w-4" />
            Report incident
          </Button>
        }
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
        open={showForm}
        onClose={() => {
          setShowForm(false);
          setFormError("");
        }}
        title="Report incident"
        subtitle="Lost or damaged assigned asset"
        wide
      >
        <form className="flex min-h-full flex-col pb-6" onSubmit={handleSubmit}>
          <div className="flex-1 space-y-5">
            <div className="flex items-center gap-3">
              <span className="inline-flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-[var(--warning-soft)] text-[var(--warning)]">
                <AlertTriangle className="h-4 w-4" />
              </span>
              <div className="min-w-0">
                <h3 className="text-[15px] font-semibold text-[var(--text)]">
                  Incident details
                </h3>
                <p className="mt-0.5 text-[12px] text-[var(--muted)]">
                  Select your assigned asset and describe what happened
                </p>
              </div>
            </div>

            <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
              <div className="min-w-0 sm:col-span-2">
                <label className="block text-[12px] font-semibold text-[var(--text)]">
                  Asset <span className="text-[var(--danger)]">*</span>
                </label>
                <select
                  required
                  className={fieldClass}
                  value={form.assetId}
                  onChange={(e) =>
                    setForm((prev) => ({ ...prev, assetId: e.target.value }))
                  }
                >
                  <option value="">Select asset</option>
                  {myAssets.map((row) => (
                    <option key={row.assetId} value={row.assetId}>
                      {row.asset?.assetTag || "Asset"} —{" "}
                      {row.asset?.name || "Untitled"}
                    </option>
                  ))}
                </select>
              </div>

              <div className="min-w-0">
                <label className="block text-[12px] font-semibold text-[var(--text)]">
                  Incident type <span className="text-[var(--danger)]">*</span>
                </label>
                <select
                  required
                  className={fieldClass}
                  value={form.incidentType}
                  onChange={(e) =>
                    setForm((prev) => ({
                      ...prev,
                      incidentType: e.target.value,
                    }))
                  }
                >
                  {INCIDENT_TYPES.map((opt) => (
                    <option key={opt.value} value={opt.value}>
                      {opt.label}
                    </option>
                  ))}
                </select>
              </div>

              <div className="min-w-0">
                <label className="block text-[12px] font-semibold text-[var(--text)]">
                  Police report no.
                </label>
                <input
                  type="text"
                  className={fieldClass}
                  placeholder="Optional"
                  value={form.policeReportNumber}
                  onChange={(e) =>
                    setForm((prev) => ({
                      ...prev,
                      policeReportNumber: e.target.value,
                    }))
                  }
                />
              </div>

              <div className="min-w-0 sm:col-span-2">
                <label className="block text-[12px] font-semibold text-[var(--text)]">
                  Description <span className="text-[var(--danger)]">*</span>
                </label>
                <textarea
                  required
                  rows={4}
                  className={`${fieldClass} h-auto py-2.5`}
                  placeholder="What happened?"
                  value={form.description}
                  onChange={(e) =>
                    setForm((prev) => ({
                      ...prev,
                      description: e.target.value,
                    }))
                  }
                />
              </div>
            </div>

            {formError ? (
              <FlashBanner
                message={formError}
                tone="danger"
                compact
                duration={5000}
                onDismiss={() => setFormError("")}
              />
            ) : null}
          </div>

          <div className="sticky bottom-0 -mx-5 mt-6 border-t border-[var(--border)] bg-[var(--surface)] px-5 pt-4">
            <div className="flex justify-end gap-2">
              <Button
                type="button"
                variant="outline"
                className="h-11 rounded-xl"
                onClick={() => {
                  setShowForm(false);
                  setForm(emptyForm());
                  setFormError("");
                }}
              >
                Cancel
              </Button>
              <Button
                type="submit"
                className="h-11 min-w-[160px] rounded-xl"
                disabled={submitting}
              >
                <Send className="h-4 w-4" />
                {submitting ? "Submitting…" : "Submit report"}
              </Button>
            </div>
          </div>
        </form>
      </SlideOver>
    </PortalPage>
  );
}
