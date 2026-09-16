"use client";

import {
  CheckCircle2,
  Download,
  Eye,
  ExternalLink,
  FileText,
  Inbox,
  MoreVertical,
  RefreshCw,
} from "lucide-react";
import { useEffect, useMemo, useRef, useState } from "react";
import { createPortal } from "react-dom";
import { Button } from "@/components/ui/Button";
import { FlashBanner } from "@/components/ui/FlashBanner";
import { PortalPage } from "@/components/ui/PortalPage";
import { SlideOver } from "@/components/ui/SlideOver";
import { TablePanel } from "@/components/ui/TablePanel";
import { ComingSoon } from "@/components/ui/ComingSoon";
import { PageLoader } from "@/components/ui/Spinner";
import { FilterDrawerDateRange } from "@/components/ui/FilterDrawerDateRange";
import { SearchableFilter } from "@/components/attendance/AttendanceStatusFilter";
import { useModules } from "@/components/modules/ModulesProvider";
import {
  acknowledgeOrgDoc,
  downloadOrgDoc,
  fetchOrgDocumentDetail,
  useOrgDocumentCategories,
  useOrgDocumentsList,
} from "@/hooks/useOrgDocuments";
import {
  readQueryInt,
  readQueryString,
  usePersistListQuery,
  usePortalQuery,
} from "@/hooks/usePortalQuery";
import { getApiErrorMessage } from "@/lib/api-error";
import { formatDate, formatDateTime, rowSerial } from "@/lib/format";
import {
  countActiveDateFilters,
  dateInRange,
} from "@/lib/request-date-filter";

function formatBytes(bytes) {
  const n = Number(bytes);
  if (!Number.isFinite(n) || n < 0) return "—";
  if (n < 1024) return `${n} B`;
  if (n < 1024 * 1024) return `${(n / 1024).toFixed(1)} KB`;
  return `${(n / (1024 * 1024)).toFixed(1)} MB`;
}

function statusTone(status) {
  const s = String(status || "").toLowerCase();
  if (s === "published" || s === "approved") {
    return "border-[var(--success)]/25 bg-[var(--success-soft)] text-[var(--success)]";
  }
  if (s === "rejected" || s === "expired") {
    return "border-[var(--danger)]/25 bg-[var(--danger-soft)] text-[var(--danger)]";
  }
  return "border-[var(--border)] bg-[var(--panel-soft)] text-[var(--muted)]";
}

async function triggerBrowserDownload(url, fileName) {
  if (!url) return;
  try {
    const res = await fetch(url);
    const blob = await res.blob();
    const objectUrl = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = objectUrl;
    a.download = fileName || "document";
    document.body.appendChild(a);
    a.click();
    a.remove();
    URL.revokeObjectURL(objectUrl);
  } catch {
    window.open(url, "_blank", "noopener,noreferrer");
  }
}

function RowActions({
  documentId,
  allowDownload,
  requiresAcknowledgement,
  acknowledged,
  onView,
  onDownload,
  onAcknowledge,
}) {
  const [open, setOpen] = useState(false);
  const [coords, setCoords] = useState({ top: 0, left: 0 });
  const buttonRef = useRef(null);

  useEffect(() => {
    if (!open) return undefined;

    function placeMenu() {
      const rect = buttonRef.current?.getBoundingClientRect();
      if (!rect) return;
      const menuWidth = 200;
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
        event.target.closest?.(`[data-org-doc-menu="${documentId}"]`)
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
  }, [open, documentId]);

  return (
    <>
      <button
        ref={buttonRef}
        type="button"
        className="inline-flex h-8 w-8 items-center justify-center rounded-lg border border-[var(--border)] bg-[var(--surface)] text-[var(--muted)] transition hover:bg-[var(--panel-soft)] hover:text-[var(--text)]"
        aria-label="Row actions"
        onClick={(e) => {
          e.stopPropagation();
          setOpen((v) => !v);
        }}
      >
        <MoreVertical className="h-4 w-4" />
      </button>
      {open && typeof document !== "undefined"
        ? createPortal(
            <div
              data-org-doc-menu={documentId}
              className="fixed z-[9999] w-48 overflow-hidden rounded-xl border border-[var(--border)] bg-[var(--surface)] shadow-[0_12px_32px_rgba(15,23,42,0.18)]"
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
              {allowDownload ? (
                <button
                  type="button"
                  className="flex w-full items-center gap-2 px-3 py-2.5 text-left text-[13px] font-semibold text-[var(--text)] hover:bg-[var(--panel-soft)]"
                  onClick={() => {
                    setOpen(false);
                    onDownload?.();
                  }}
                >
                  <Download className="h-4 w-4 text-[var(--violet)]" />
                  Download
                </button>
              ) : null}
              {requiresAcknowledgement && !acknowledged ? (
                <button
                  type="button"
                  className="flex w-full items-center gap-2 px-3 py-2.5 text-left text-[13px] font-semibold text-[var(--success)] hover:bg-[var(--success-soft)]"
                  onClick={() => {
                    setOpen(false);
                    onAcknowledge?.();
                  }}
                >
                  <CheckCircle2 className="h-4 w-4" />
                  Acknowledge
                </button>
              ) : null}
            </div>,
            document.body
          )
        : null}
    </>
  );
}

function DetailField({ label, children, className = "" }) {
  return (
    <div className={`min-w-0 ${className}`}>
      <dt className="text-[11px] font-semibold uppercase tracking-wide text-[var(--muted)]">
        {label}
      </dt>
      <dd className="mt-1.5 text-[13px] font-medium text-[var(--text)]">
        {children}
      </dd>
    </div>
  );
}

export function CompanyDocumentsView({
  dateFormat = "DD/MM/YYYY",
  timeFormat = "12h",
}) {
  const { canAccessRoute, loading: modulesLoading } = useModules();
  const moduleEnabled = canAccessRoute("/documents/company");

  const { searchParams } = usePortalQuery();
  const [page, setPage] = useState(() => readQueryInt(searchParams, "page", 1));
  const [limit, setLimit] = useState(() =>
    readQueryInt(searchParams, "limit", 20)
  );
  const [listQuery, setListQuery] = useState(() =>
    readQueryString(searchParams, "q", "")
  );
  const [categoryId, setCategoryId] = useState(() =>
    readQueryString(searchParams, "categoryId", "")
  );
  const [draftCategoryId, setDraftCategoryId] = useState(categoryId);
  const [dateFrom, setDateFrom] = useState("");
  const [dateTo, setDateTo] = useState("");
  const [draftDateFrom, setDraftDateFrom] = useState("");
  const [draftDateTo, setDraftDateTo] = useState("");
  /** Debounced search sent to API (URL still updates live) */
  const [searchApplied, setSearchApplied] = useState(listQuery);

  usePersistListQuery(
    { page, limit, q: listQuery, categoryId },
    { page: "1", limit: "20", q: "", categoryId: "" },
    [page, limit, listQuery, categoryId]
  );

  useEffect(() => {
    let alive = true;
    queueMicrotask(() => {
      if (!alive) return;
      setDraftCategoryId(categoryId);
    });
    return () => {
      alive = false;
    };
  }, [categoryId]);

  useEffect(() => {
    const t = setTimeout(() => {
      const next = listQuery.trim();
      setSearchApplied((prev) => {
        if (prev !== next) {
          setPage(1);
        }
        return next;
      });
    }, 350);
    return () => clearTimeout(t);
  }, [listQuery]);

  const [selected, setSelected] = useState(null);
  const [detailLoading, setDetailLoading] = useState(false);
  const [busyId, setBusyId] = useState(null);
  const [flash, setFlash] = useState("");
  const [flashTone, setFlashTone] = useState("success");

  const { categories } = useOrgDocumentCategories({
    enabled: moduleEnabled && !modulesLoading,
  });

  const { rows, meta, loading, error, refetch } = useOrgDocumentsList({
    page,
    limit,
    categoryId,
    search: searchApplied,
    enabled: moduleEnabled && !modulesLoading,
  });

  const total = Number(meta?.total) || 0;
  const currentPage = Number(meta?.page) || page;
  const totalPages = Math.max(1, Number(meta?.totalPages) || 1);

  const categoryOptions = useMemo(
    () => [
      { value: "", label: "All categories" },
      ...categories.map((cat) => ({
        value: String(cat.categoryId),
        label: cat.name || "Category",
      })),
    ],
    [categories]
  );

  const categoryLabel = useMemo(() => {
    if (!categoryId) return null;
    return categories.find((c) => c.categoryId === categoryId)?.name || null;
  }, [categories, categoryId]);

  const dateFilterCount = countActiveDateFilters(dateFrom, dateTo);
  const activeFilterCount = (categoryId ? 1 : 0) + dateFilterCount;

  const filteredRows = useMemo(() => {
    if (!dateFrom && !dateTo) return rows;
    return (rows || []).filter((row) =>
      ["expiryDate", "createdAt", "approvedAt", "updatedAt"].some((field) =>
        dateInRange(row?.[field], dateFrom, dateTo)
      )
    );
  }, [rows, dateFrom, dateTo]);

  async function openDetail(row) {
    setSelected(row);
    setDetailLoading(true);
    try {
      const detail = await fetchOrgDocumentDetail(row.documentId);
      setSelected(detail || row);
    } catch (err) {
      setFlashTone("danger");
      setFlash(getApiErrorMessage(err, "Failed to load document."));
    } finally {
      setDetailLoading(false);
    }
  }

  async function handleDownload(documentId) {
    if (!documentId || !moduleEnabled) return;
    setBusyId(documentId);
    try {
      const res = await downloadOrgDoc(documentId);
      if (!res?.url) {
        throw new Error("Download link not available.");
      }
      await triggerBrowserDownload(res.url, res.fileName);
      setFlashTone("success");
      setFlash("Download started.");
    } catch (err) {
      setFlashTone("danger");
      setFlash(getApiErrorMessage(err, "Failed to download document."));
    } finally {
      setBusyId(null);
    }
  }

  async function handleAcknowledge(documentId) {
    if (!documentId || !moduleEnabled) return;
    if (
      !window.confirm(
        "Acknowledge that you have read and accepted this document?"
      )
    ) {
      return;
    }
    setBusyId(documentId);
    try {
      const res = await acknowledgeOrgDoc(documentId, { accepted: true });
      setFlashTone("success");
      setFlash(res?.message || "Document acknowledged.");
      refetch();
      if (selected?.documentId === documentId) {
        const detail = await fetchOrgDocumentDetail(documentId);
        setSelected({ ...(detail || selected), acknowledged: true });
      }
    } catch (err) {
      setFlashTone("danger");
      setFlash(getApiErrorMessage(err, "Failed to acknowledge document."));
    } finally {
      setBusyId(null);
    }
  }

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
        id: "title",
        header: "Title",
        cellClassName: "font-semibold text-[var(--text)]",
        cell: (row) => (
          <button
            type="button"
            className="inline-flex max-w-[280px] items-center gap-1.5 truncate text-left hover:text-[var(--violet)]"
            onClick={() => openDetail(row)}
          >
            <FileText className="h-3.5 w-3.5 shrink-0 text-[var(--violet)]" />
            <span className="truncate">{row.title || "—"}</span>
          </button>
        ),
      },
      {
        id: "category",
        header: "Category",
        cellClassName: "whitespace-nowrap text-[var(--muted)]",
        cell: (row) => row.category?.name || "—",
      },
      {
        id: "file",
        header: "File",
        cellClassName: "max-w-[220px] truncate text-[var(--muted)]",
        cell: (row) => {
          const v = row.currentVersion;
          if (!v?.fileName) return "—";
          return (
            <span title={v.fileName}>
              {v.fileName}
              {v.sizeBytes != null ? ` · ${formatBytes(v.sizeBytes)}` : ""}
            </span>
          );
        },
      },
      {
        id: "status",
        header: "Status",
        cell: (row) => (
          <span
            className={`inline-flex rounded-full border px-2.5 py-0.5 text-[11px] font-semibold capitalize ${statusTone(row.status)}`}
          >
            {row.statusLabel || row.status || "—"}
          </span>
        ),
      },
      {
        id: "updated",
        header: "Updated",
        cellClassName: "whitespace-nowrap text-[var(--muted)]",
        cell: (row) =>
          row.updatedAt || row.approvedAt
            ? formatDateTime(
                row.updatedAt || row.approvedAt,
                dateFormat,
                timeFormat
              )
            : "—",
      },
      {
        id: "action",
        header: "Action",
        cell: (row) => (
          <RowActions
            documentId={row.documentId}
            allowDownload={row.allowDownload}
            requiresAcknowledgement={row.requiresAcknowledgement}
            acknowledged={row.acknowledged}
            onView={() => openDetail(row)}
            onDownload={() => handleDownload(row.documentId)}
            onAcknowledge={() => handleAcknowledge(row.documentId)}
          />
        ),
      },
    ],
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [currentPage, limit, dateFormat, timeFormat]
  );

  if (modulesLoading) {
    return (
      <PageLoader label="Loading" hint="Opening company documents…" />
    );
  }

  if (!moduleEnabled) {
    return (
      <ComingSoon
        title="Company Documents"
        description="This module is not enabled for your company."
      />
    );
  }

  const previewUrl = selected?.currentVersion?.fileUrl || null;

  return (
    <PortalPage
      fill
      title="Company Documents"
      subtitle="Published company policies and files. View or download only — HR manages uploads."
      actions={
        <Button
          type="button"
          variant="outline"
          className="h-9 rounded-xl px-3 sm:h-10 sm:px-4"
          onClick={refetch}
        >
          <RefreshCw className="h-4 w-4" />
          Refresh
        </Button>
      }
    >
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
        title="Library"
        titleCount={total}
        titleCountLabel="Total documents"
        recordCount={dateFilterCount > 0 ? filteredRows.length : total}
        search={listQuery}
        onSearchChange={setListQuery}
        searchPlaceholder="Search by title…"
        filterTitle="Filters"
        filterSubtitle="Category and date range"
        filterActive={activeFilterCount > 0}
        activeFilterCount={activeFilterCount}
        drawerFields={
          <div className="space-y-5">
            <SearchableFilter
              label="Category"
              value={draftCategoryId}
              onChange={setDraftCategoryId}
              options={categoryOptions}
              defaultValue=""
            />
            {categoryLabel ? (
              <p className="-mt-3 text-[11px] text-[var(--muted)]">
                Active: {categoryLabel}
              </p>
            ) : null}
            <FilterDrawerDateRange
              from={draftDateFrom}
              to={draftDateTo}
              onFromChange={setDraftDateFrom}
              onToChange={setDraftDateTo}
              hint="Apply uses published, expiry, or updated date."
            />
          </div>
        }
        onApplyFilters={() => {
          setCategoryId(draftCategoryId);
          setDateFrom(draftDateFrom);
          setDateTo(draftDateTo);
          setPage(1);
        }}
        onResetFilters={() => {
          setDraftCategoryId("");
          setCategoryId("");
          setDraftDateFrom("");
          setDraftDateTo("");
          setDateFrom("");
          setDateTo("");
          setPage(1);
        }}
        onRefresh={refetch}
        columns={columns}
        rows={filteredRows}
        getRowKey={(row) => row.documentId}
        minWidth="760px"
        loading={loading}
        loadingLabel="Loading documents"
        loadingHint="Fetching company documents…"
        error={error}
        emptyIcon={Inbox}
        emptyTitle="No documents found"
        emptyHint={
          categoryId || searchApplied || dateFilterCount > 0
            ? "Try clearing search or filters."
            : "When HR publishes policies, they will appear here."
        }
        page={currentPage}
        pageSize={limit}
        total={dateFilterCount > 0 ? filteredRows.length : total}
        totalPages={dateFilterCount > 0 ? 1 : totalPages}
        onPageChange={setPage}
        onPageSizeChange={(n) => {
          setLimit(n);
          setPage(1);
        }}
      />

      <SlideOver
        open={Boolean(selected)}
        onClose={() => setSelected(null)}
        title="Document details"
        subtitle={selected?.title || undefined}
        wide
      >
        {selected ? (
          <div className="space-y-4 pb-8">
            {detailLoading ? (
              <PageLoader compact label="Loading detail" />
            ) : (
              <>
                <div className="flex flex-wrap items-center justify-between gap-3 rounded-2xl border border-[var(--border)] bg-gradient-to-br from-[var(--lavender-soft)]/70 via-[var(--surface)] to-[var(--surface)] px-4 py-3.5">
                  <div className="flex flex-wrap items-center gap-2">
                    <span
                      className={`inline-flex rounded-full border px-3 py-1 text-[12px] font-semibold capitalize ${statusTone(selected.status)}`}
                    >
                      {selected.statusLabel || selected.status || "—"}
                    </span>
                    {selected.requiresAcknowledgement ? (
                      <span className="rounded-full bg-[var(--warning-soft)] px-2.5 py-1 text-[11px] font-semibold text-[var(--warning)]">
                        {selected.acknowledged
                          ? "Acknowledged"
                          : "Acknowledgement required"}
                      </span>
                    ) : null}
                  </div>
                  <div className="flex flex-wrap gap-2">
                    {previewUrl ? (
                      <Button
                        type="button"
                        variant="outline"
                        className="h-9 rounded-xl"
                        onClick={() =>
                          window.open(previewUrl, "_blank", "noopener,noreferrer")
                        }
                      >
                        <ExternalLink className="h-4 w-4" />
                        View file
                      </Button>
                    ) : null}
                    {selected.allowDownload ? (
                      <Button
                        type="button"
                        variant="outline"
                        className="h-9 rounded-xl"
                        disabled={busyId === selected.documentId}
                        onClick={() => handleDownload(selected.documentId)}
                      >
                        <Download className="h-4 w-4" />
                        Download
                      </Button>
                    ) : null}
                    {selected.requiresAcknowledgement &&
                    !selected.acknowledged ? (
                      <Button
                        type="button"
                        className="h-9 rounded-xl"
                        disabled={busyId === selected.documentId}
                        onClick={() => handleAcknowledge(selected.documentId)}
                      >
                        <CheckCircle2 className="h-4 w-4" />
                        Acknowledge
                      </Button>
                    ) : null}
                  </div>
                </div>

                <section className="rounded-2xl border border-[var(--border)] bg-[var(--surface)] p-5 shadow-[var(--card-shadow)]">
                  <dl className="grid grid-cols-1 gap-x-6 gap-y-5 sm:grid-cols-2">
                    <DetailField label="Title" className="sm:col-span-2">
                      {selected.title || "—"}
                    </DetailField>
                    <DetailField label="Category">
                      {selected.category?.name || "—"}
                    </DetailField>
                    <DetailField label="Visibility">
                      <span className="capitalize">
                        {selected.visibility || "—"}
                      </span>
                    </DetailField>
                    <DetailField label="File name">
                      {selected.currentVersion?.fileName || "—"}
                    </DetailField>
                    <DetailField label="Size">
                      {formatBytes(selected.currentVersion?.sizeBytes)}
                    </DetailField>
                    <DetailField label="Version">
                      {selected.currentVersion?.versionNumber != null
                        ? `v${selected.currentVersion.versionNumber}`
                        : "—"}
                    </DetailField>
                    <DetailField label="Approved">
                      {selected.approvedAt
                        ? formatDateTime(
                            selected.approvedAt,
                            dateFormat,
                            timeFormat
                          )
                        : "—"}
                    </DetailField>
                    <DetailField label="Expiry">
                      {selected.expiryDate
                        ? formatDate(selected.expiryDate, dateFormat)
                        : "—"}
                    </DetailField>
                    {selected.description ? (
                      <DetailField label="Description" className="sm:col-span-2">
                        <p className="whitespace-pre-wrap font-normal leading-relaxed">
                          {selected.description}
                        </p>
                      </DetailField>
                    ) : null}
                  </dl>
                </section>
              </>
            )}
          </div>
        ) : null}
      </SlideOver>
    </PortalPage>
  );
}
