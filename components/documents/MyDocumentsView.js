"use client";

import {
  Eye,
  ExternalLink,
  FileText,
  Inbox,
  MoreVertical,
  Plus,
  RefreshCw,
  Send,
  Trash2,
  Upload,
  X,
} from "lucide-react";
import { useEffect, useMemo, useRef, useState } from "react";
import { createPortal } from "react-dom";
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
  removeDocument,
  submitDocument,
  useDocumentTypes,
  useMyDocumentsList,
  useMyDocumentsStats,
} from "@/hooks/useDocuments";
import {
  readQueryInt,
  readQueryString,
  usePersistListQuery,
  usePortalQuery,
} from "@/hooks/usePortalQuery";
import { getApiErrorMessage } from "@/lib/api-error";
import { formatDate, formatDateTime, rowSerial } from "@/lib/format";

const fieldClass =
  "mt-1.5 h-11 w-full rounded-xl border border-[var(--border)] bg-[var(--surface)] px-3 text-[13px] text-[var(--text)] outline-none transition focus:border-[var(--violet)] focus:ring-2 focus:ring-[var(--lavender-soft)]";

function emptyForm() {
  return {
    docTypeId: "",
    documentNumber: "",
    issuedBy: "",
    issueDate: "",
    startDate: "",
    expiryDate: "",
    file: null,
  };
}

function verificationTone(status) {
  const s = String(status || "").toLowerCase();
  if (s === "verified" || s === "approved") {
    return "border-[var(--success)]/25 bg-[var(--success-soft)] text-[var(--success)]";
  }
  if (s === "rejected") {
    return "border-[var(--danger)]/25 bg-[var(--danger-soft)] text-[var(--danger)]";
  }
  return "border-[var(--warning)]/30 bg-[var(--warning-soft)] text-[var(--warning)]";
}

function RowActions({ docId, onView, onDelete }) {
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
        event.target.closest?.(`[data-my-doc-menu="${docId}"]`)
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
  }, [open, docId]);

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
              data-my-doc-menu={docId}
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
                className="flex w-full items-center gap-2 px-3 py-2.5 text-left text-[13px] font-semibold text-[var(--danger)] hover:bg-[var(--danger-soft)]"
                onClick={() => {
                  setOpen(false);
                  onDelete?.();
                }}
              >
                <Trash2 className="h-4 w-4" />
                Delete
              </button>
            </div>,
            document.body
          )
        : null}
    </>
  );
}

function DetailField({ label, children }) {
  return (
    <div className="min-w-0">
      <dt className="text-[11px] font-semibold uppercase tracking-wide text-[var(--muted)]">
        {label}
      </dt>
      <dd className="mt-1.5 text-[13px] font-medium text-[var(--text)]">
        {children}
      </dd>
    </div>
  );
}

export function MyDocumentsView({ dateFormat = "DD/MM/YYYY", timeFormat = "12h" }) {
  const { canAccessRoute, loading: modulesLoading } = useModules();
  const moduleEnabled = canAccessRoute("/documents/my");

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
  const [selected, setSelected] = useState(null);
  const [form, setForm] = useState(emptyForm);
  const [submitting, setSubmitting] = useState(false);
  const [deletingId, setDeletingId] = useState(null);
  const [formError, setFormError] = useState("");
  const [flash, setFlash] = useState("");
  const [flashTone, setFlashTone] = useState("success");
  const fileInputRef = useRef(null);

  const { rows, meta, loading, error, refetch } = useMyDocumentsList({
    page,
    limit,
    enabled: moduleEnabled && !modulesLoading,
  });
  const { stats, refetch: refetchStats } = useMyDocumentsStats({
    enabled: moduleEnabled && !modulesLoading,
  });
  const { types, loading: typesLoading } = useDocumentTypes({
    enabled: moduleEnabled && !modulesLoading,
  });

  const selectedType = useMemo(
    () => types.find((t) => t.docTypeId === form.docTypeId) || null,
    [types, form.docTypeId]
  );

  const filteredRows = useMemo(() => {
    const q = listQuery.trim().toLowerCase();
    return (rows || []).filter((row) => {
      const vs = String(row.verificationStatus || "").toLowerCase();
      if (statusTab === "verified") {
        if (!(vs === "verified" || vs === "approved")) return false;
      } else if (statusTab === "pending") {
        if (!(vs === "pending" || vs === "submitted")) return false;
      }
      if (!q) return true;
      const hay = [
        row.docTypeName,
        row.documentNumber,
        row.issuedBy,
        row.verificationStatus,
      ]
        .filter(Boolean)
        .join(" ")
        .toLowerCase();
      return hay.includes(q);
    });
  }, [rows, listQuery, statusTab]);

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
        id: "type",
        header: "Type",
        cellClassName: "whitespace-nowrap font-semibold text-[var(--text)]",
        cell: (row) => (
          <span className="inline-flex items-center gap-1.5">
            <FileText className="h-3.5 w-3.5 text-[var(--violet)]" />
            {row.docTypeName || "—"}
          </span>
        ),
      },
      {
        id: "number",
        header: "Document no.",
        cellClassName: "whitespace-nowrap text-[var(--muted)]",
        cell: (row) => row.documentNumber || "—",
      },
      {
        id: "issueDate",
        header: "Issue date",
        cellClassName: "whitespace-nowrap text-[var(--muted)]",
        cell: (row) =>
          row.issueDate ? formatDate(row.issueDate, dateFormat) : "—",
      },
      {
        id: "expiryDate",
        header: "Expiry",
        cellClassName: "whitespace-nowrap text-[var(--muted)]",
        cell: (row) =>
          row.expiryDate ? formatDate(row.expiryDate, dateFormat) : "—",
      },
      {
        id: "file",
        header: "File",
        cellClassName: "whitespace-nowrap",
        cell: (row) =>
          row.fileUrl ? (
            <a
              href={row.fileUrl}
              target="_blank"
              rel="noopener noreferrer"
              className="text-[12px] font-semibold text-[var(--violet)] underline-offset-2 hover:underline"
              onClick={(e) => e.stopPropagation()}
            >
              Open
            </a>
          ) : (
            <span className="text-[var(--muted)]">—</span>
          ),
      },
      {
        id: "status",
        header: "Verification",
        cell: (row) => (
          <span
            className={`inline-flex rounded-full border px-2.5 py-0.5 text-[11px] font-semibold capitalize ${verificationTone(row.verificationStatus)}`}
          >
            {row.verificationStatus || "—"}
          </span>
        ),
      },
      {
        id: "created",
        header: "Uploaded",
        cellClassName: "whitespace-nowrap text-[var(--muted)]",
        cell: (row) =>
          row.createdAt
            ? formatDateTime(row.createdAt, dateFormat, timeFormat)
            : "—",
      },
      {
        id: "action",
        header: "Action",
        cell: (row) => (
          <RowActions
            docId={row.docId}
            onView={() => setSelected(row)}
            onDelete={() => handleDelete(row.docId)}
          />
        ),
      },
    ],
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [currentPage, limit, dateFormat, timeFormat]
  );

  function refreshAll() {
    refetch();
    refetchStats();
  }

  function clearSelectedFile() {
    setForm((prev) => ({ ...prev, file: null }));
    if (fileInputRef.current) fileInputRef.current.value = "";
  }

  function resetForm() {
    setForm(emptyForm());
    setFormError("");
    if (fileInputRef.current) fileInputRef.current.value = "";
  }

  async function handleSubmit(event) {
    event.preventDefault();
    setFormError("");

    if (!moduleEnabled) {
      setFormError("This module is not enabled for your company.");
      return;
    }
    if (!form.docTypeId) {
      setFormError("Select a document type.");
      return;
    }
    if (selectedType?.allowIssueByMandatory && !form.issuedBy.trim()) {
      setFormError("Issued by is required for this document type.");
      return;
    }
    if (selectedType?.allowStartDateMandatory && !form.startDate) {
      setFormError("Start date is required for this document type.");
      return;
    }
    if (selectedType?.allowExpiryDateMandatory && !form.expiryDate) {
      setFormError("Expiry date is required for this document type.");
      return;
    }

    setSubmitting(true);
    try {
      const res = await submitDocument({
        file: form.file || undefined,
        docTypeId: form.docTypeId,
        documentNumber: form.documentNumber.trim() || undefined,
        issuedBy:
          selectedType?.allowIssueBy && form.issuedBy.trim()
            ? form.issuedBy.trim()
            : undefined,
        issueDate: form.issueDate || undefined,
        startDate:
          selectedType?.allowStartDate && form.startDate
            ? form.startDate
            : undefined,
        expiryDate:
          selectedType?.allowExpiryDate && form.expiryDate
            ? form.expiryDate
            : undefined,
      });
      setShowForm(false);
      resetForm();
      setFlashTone("success");
      setFlash(res?.message || "Document uploaded successfully.");
      setPage(1);
      refreshAll();
    } catch (err) {
      setFormError(getApiErrorMessage(err, "Failed to upload document."));
    } finally {
      setSubmitting(false);
    }
  }

  async function handleDelete(docId) {
    if (!docId) return;
    if (!moduleEnabled) {
      setFlashTone("danger");
      setFlash("This module is not enabled for your company.");
      return;
    }
    if (!window.confirm("Delete this document? This cannot be undone.")) {
      return;
    }
    setDeletingId(docId);
    try {
      const res = await removeDocument(docId);
      setFlashTone("success");
      setFlash(res?.message || "Document deleted.");
      if (selected?.docId === docId) setSelected(null);
      refreshAll();
    } catch (err) {
      setFlashTone("danger");
      setFlash(getApiErrorMessage(err, "Failed to delete document."));
    } finally {
      setDeletingId(null);
    }
  }

  if (modulesLoading) {
    return (
      <PageLoader label="Loading" hint="Checking documents access…" />
    );
  }

  if (!moduleEnabled) {
    return (
      <ComingSoon
        title="My Documents"
        description="This module is not enabled for your company."
      />
    );
  }

  return (
    <PortalPage
      fill
      title="My Documents"
      subtitle="Personal HR documents (CNIC, passport, certificates). Profile only — not Company Documents."
      actions={
        <>
          <Button
            type="button"
            variant="outline"
            className="h-9 rounded-xl px-3 sm:h-10 sm:px-4"
            onClick={refreshAll}
          >
            <RefreshCw className="h-4 w-4" />
            Refresh
          </Button>
          <Button
            type="button"
            className="h-9 rounded-xl px-3 sm:h-10 sm:px-4"
            onClick={() => {
              setShowForm(true);
              setFormError("");
            }}
          >
            <Plus className="h-4 w-4" />
            Upload document
          </Button>
        </>
      }
    >
      <CollapsibleSection title="Summary" defaultCollapsed className="shrink-0">
        <div className="grid grid-cols-3 gap-2.5">
          <SoftStat label="Total" value={stats.total} />
          <SoftStat label="Verified" value={stats.verified} color="#22c55e" />
          <SoftStat label="Pending" value={stats.pending} color="#f59e0b" />
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
        title="My Documents"
        titleCount={total}
        titleCountLabel="Total documents"
        tabs={[
          { value: "all", label: "All" },
          { value: "verified", label: "Verified" },
          { value: "pending", label: "Pending" },
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
        searchPlaceholder="Search by type, number…"
        onRefresh={refreshAll}
        columns={columns}
        rows={filteredRows}
        getRowKey={(row) => row.docId}
        minWidth="720px"
        loading={loading}
        loadingLabel="Loading documents"
        loadingHint="Fetching your uploaded documents…"
        error={error}
        emptyIcon={Inbox}
        emptyTitle="No documents found"
        emptyHint="Upload your CNIC, passport, or other HR documents."
        emptyAction={
          <Button
            type="button"
            className="h-10 rounded-xl"
            onClick={() => setShowForm(true)}
          >
            <Plus className="h-4 w-4" />
            Upload document
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
          resetForm();
        }}
        title="Upload document"
        subtitle="Select type and fill required fields"
        wide
      >
        <form className="flex min-h-full flex-col pb-6" onSubmit={handleSubmit}>
          <div className="flex-1 space-y-5">
            <div className="flex items-center gap-3">
              <span className="inline-flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-[var(--lavender-soft)] text-[var(--violet)]">
                <Upload className="h-4 w-4" />
              </span>
              <div className="min-w-0">
                <h3 className="text-[15px] font-semibold text-[var(--text)]">
                  Document details
                </h3>
                <p className="mt-0.5 text-[12px] text-[var(--muted)]">
                  Fields change based on document type policy
                </p>
              </div>
            </div>

            <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
              <div className="min-w-0 sm:col-span-2">
                <label className="block text-[12px] font-semibold text-[var(--text)]">
                  Document type <span className="text-[var(--danger)]">*</span>
                </label>
                <select
                  required
                  className={fieldClass}
                  value={form.docTypeId}
                  disabled={typesLoading}
                  onChange={(e) =>
                    setForm((prev) => ({
                      ...prev,
                      docTypeId: e.target.value,
                      issuedBy: "",
                      startDate: "",
                      expiryDate: "",
                    }))
                  }
                >
                  <option value="">
                    {typesLoading ? "Loading types…" : "Select type"}
                  </option>
                  {types.map((t) => (
                    <option key={t.docTypeId} value={t.docTypeId}>
                      {t.text || t.docType}
                    </option>
                  ))}
                </select>
              </div>

              <div className="min-w-0">
                <label className="block text-[12px] font-semibold text-[var(--text)]">
                  Document number
                </label>
                <input
                  type="text"
                  className={fieldClass}
                  placeholder="Optional"
                  value={form.documentNumber}
                  onChange={(e) =>
                    setForm((prev) => ({
                      ...prev,
                      documentNumber: e.target.value,
                    }))
                  }
                />
              </div>

              <div className="min-w-0">
                <label className="block text-[12px] font-semibold text-[var(--text)]">
                  Issue date
                </label>
                <input
                  type="date"
                  className={fieldClass}
                  value={form.issueDate}
                  onChange={(e) =>
                    setForm((prev) => ({
                      ...prev,
                      issueDate: e.target.value,
                    }))
                  }
                />
              </div>

              {selectedType?.allowIssueBy ? (
                <div className="min-w-0 sm:col-span-2">
                  <label className="block text-[12px] font-semibold text-[var(--text)]">
                    Issued by
                    {selectedType.allowIssueByMandatory ? (
                      <span className="text-[var(--danger)]"> *</span>
                    ) : null}
                  </label>
                  <input
                    type="text"
                    required={selectedType.allowIssueByMandatory}
                    className={fieldClass}
                    placeholder="e.g. NADRA"
                    value={form.issuedBy}
                    onChange={(e) =>
                      setForm((prev) => ({
                        ...prev,
                        issuedBy: e.target.value,
                      }))
                    }
                  />
                </div>
              ) : null}

              {selectedType?.allowStartDate ? (
                <div className="min-w-0">
                  <label className="block text-[12px] font-semibold text-[var(--text)]">
                    Start date
                    {selectedType.allowStartDateMandatory ? (
                      <span className="text-[var(--danger)]"> *</span>
                    ) : null}
                  </label>
                  <input
                    type="date"
                    required={selectedType.allowStartDateMandatory}
                    className={fieldClass}
                    value={form.startDate}
                    onChange={(e) =>
                      setForm((prev) => ({
                        ...prev,
                        startDate: e.target.value,
                      }))
                    }
                  />
                </div>
              ) : null}

              {selectedType?.allowExpiryDate ? (
                <div className="min-w-0">
                  <label className="block text-[12px] font-semibold text-[var(--text)]">
                    Expiry date
                    {selectedType.allowExpiryDateMandatory ? (
                      <span className="text-[var(--danger)]"> *</span>
                    ) : null}
                  </label>
                  <input
                    type="date"
                    required={selectedType.allowExpiryDateMandatory}
                    className={fieldClass}
                    value={form.expiryDate}
                    onChange={(e) =>
                      setForm((prev) => ({
                        ...prev,
                        expiryDate: e.target.value,
                      }))
                    }
                  />
                </div>
              ) : null}

              <div className="min-w-0 sm:col-span-2">
                <label className="block text-[12px] font-semibold text-[var(--text)]">
                  File
                </label>
                <input
                  ref={fileInputRef}
                  type="file"
                  accept="image/*,.pdf,.doc,.docx"
                  className="mt-1.5 block w-full text-[13px] text-[var(--muted)] file:mr-3 file:rounded-lg file:border-0 file:bg-[var(--lavender-soft)] file:px-3 file:py-2 file:text-[12px] file:font-semibold file:text-[var(--violet)]"
                  onChange={(e) =>
                    setForm((prev) => ({
                      ...prev,
                      file: e.target.files?.[0] || null,
                    }))
                  }
                />
                {form.file ? (
                  <div className="mt-2 flex items-center gap-2 rounded-xl border border-[var(--border)] bg-[var(--panel-soft)] px-3 py-2">
                    <FileText className="h-4 w-4 shrink-0 text-[var(--violet)]" />
                    <p className="min-w-0 flex-1 truncate text-[13px] font-medium text-[var(--text)]">
                      {form.file.name}
                    </p>
                    <button
                      type="button"
                      className="inline-flex h-8 shrink-0 items-center gap-1 rounded-lg border border-[var(--border)] bg-[var(--surface)] px-2.5 text-[11px] font-semibold text-[var(--danger)] hover:bg-[var(--danger-soft)]"
                      onClick={clearSelectedFile}
                    >
                      <X className="h-3.5 w-3.5" />
                      Remove
                    </button>
                  </div>
                ) : null}
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
            <div className="flex items-center justify-end gap-2">
              <Button
                type="button"
                variant="outline"
                className="h-11 min-w-[100px] rounded-xl"
                onClick={() => {
                  setShowForm(false);
                  resetForm();
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
                {submitting ? "Uploading…" : "Upload"}
              </Button>
            </div>
          </div>
        </form>
      </SlideOver>

      <SlideOver
        open={Boolean(selected)}
        onClose={() => setSelected(null)}
        title="Document details"
        subtitle={selected?.docTypeName || undefined}
      >
        {selected ? (
          <div className="space-y-4 pb-8">
            <div className="flex flex-wrap items-center justify-between gap-3 rounded-2xl border border-[var(--border)] bg-gradient-to-br from-[var(--lavender-soft)]/70 via-[var(--surface)] to-[var(--surface)] px-4 py-3.5">
              <span
                className={`inline-flex rounded-full border px-3 py-1 text-[12px] font-semibold capitalize ${verificationTone(selected.verificationStatus)}`}
              >
                {selected.verificationStatus || "—"}
              </span>
              <div className="flex flex-wrap gap-2">
                {selected.fileUrl ? (
                  <Button
                    type="button"
                    variant="outline"
                    className="h-9 rounded-xl"
                    onClick={() =>
                      window.open(
                        selected.fileUrl,
                        "_blank",
                        "noopener,noreferrer"
                      )
                    }
                  >
                    <ExternalLink className="h-4 w-4" />
                    View file
                  </Button>
                ) : null}
                <Button
                  type="button"
                  variant="outline"
                  className="h-9 rounded-xl text-[var(--danger)]"
                  disabled={deletingId === selected.docId}
                  onClick={() => handleDelete(selected.docId)}
                >
                  <Trash2 className="h-4 w-4" />
                  {deletingId === selected.docId ? "Deleting…" : "Delete"}
                </Button>
              </div>
            </div>

            <section className="rounded-2xl border border-[var(--border)] bg-[var(--surface)] p-5 shadow-[var(--card-shadow)]">
              <dl className="grid grid-cols-1 gap-x-6 gap-y-5 sm:grid-cols-2">
                <DetailField label="Type">
                  {selected.docTypeName || "—"}
                </DetailField>
                <DetailField label="Document number">
                  {selected.documentNumber || "—"}
                </DetailField>
                <DetailField label="Issued by">
                  {selected.issuedBy || "—"}
                </DetailField>
                <DetailField label="Issue date">
                  {selected.issueDate
                    ? formatDate(selected.issueDate, dateFormat)
                    : "—"}
                </DetailField>
                <DetailField label="Start date">
                  {selected.startDate
                    ? formatDate(selected.startDate, dateFormat)
                    : "—"}
                </DetailField>
                <DetailField label="Expiry date">
                  {selected.expiryDate
                    ? formatDate(selected.expiryDate, dateFormat)
                    : "—"}
                </DetailField>
                <DetailField label="Uploaded">
                  {selected.createdAt
                    ? formatDateTime(
                        selected.createdAt,
                        dateFormat,
                        timeFormat
                      )
                    : "—"}
                </DetailField>
              </dl>
            </section>
          </div>
        ) : null}
      </SlideOver>
    </PortalPage>
  );
}
