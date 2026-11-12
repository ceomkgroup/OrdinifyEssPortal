"use client";

import { useEffect, useState } from "react";
import { Clock3, Eye } from "lucide-react";
import { decideTimeCorrection, listTeamTimeCorrections } from "@/api/tasks";
import { TeamRowMenu } from "@/components/team/TeamRowMenu";
import { Badge } from "@/components/ui/Badge";
import { Button } from "@/components/ui/Button";
import { PortalPage } from "@/components/ui/PortalPage";
import { SlideOver } from "@/components/ui/SlideOver";
import { TablePanel } from "@/components/ui/TablePanel";
import { FilterSelect } from "@/components/ui/ListFilters";
import { TABLE_PAGE_SIZE } from "@/components/ui/TablePagination";
import { formatDateTime } from "@/lib/format";
import { personName } from "@/lib/task-labels";

const STATUSES = [
  { value: "pending", label: "Pending" },
  { value: "approved", label: "Approved" },
  { value: "rejected", label: "Rejected" },
  { value: "cancelled", label: "Cancelled" },
];

export function TimeCorrectionsView() {
  const [status, setStatus] = useState("pending");
  const [draftStatus, setDraftStatus] = useState("pending");
  const [rows, setRows] = useState([]);
  const [meta, setMeta] = useState(null);
  const [page, setPage] = useState(1);
  const [pageSize, setPageSize] = useState(TABLE_PAGE_SIZE);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [flash, setFlash] = useState("");
  const [decision, setDecision] = useState(null);
  const [note, setNote] = useState("");
  const [saving, setSaving] = useState(false);
  const [reloadKey, setReloadKey] = useState(0);

  useEffect(() => {
    let alive = true;
    setLoading(true);
    listTeamTimeCorrections({ status, page, limit: pageSize })
      .then((result) => {
        if (!alive) return;
        setRows(result.rows);
        setMeta(result.meta);
      })
      .catch((err) => {
        if (!alive) return;
        setError(err.message || "Failed to load corrections");
        setRows([]);
      })
      .finally(() => {
        if (alive) setLoading(false);
      });
    return () => {
      alive = false;
    };
  }, [status, page, pageSize, reloadKey]);

  async function submitDecision(kind) {
    if (!decision) return;
    if (kind === "reject" && !note.trim()) {
      setError("Please give a reason for rejecting.");
      return;
    }
    setSaving(true);
    setError("");
    try {
      await decideTimeCorrection(decision.correctionId, {
        decision: kind,
        note: note.trim() || undefined,
      });
      setFlash(kind === "approve" ? "Correction approved." : "Correction rejected.");
      setDecision(null);
      setNote("");
      setReloadKey((value) => value + 1);
    } catch (err) {
      setError(err.message || "Failed to record the decision");
    } finally {
      setSaving(false);
    }
  }

  return (
    <PortalPage
      fill
      title="Time corrections"
      subtitle="Requests from your team to add or edit time logged on a task."
      error={error}
    >
      {flash ? <p className="text-[12px] font-medium text-[var(--success)]">{flash}</p> : null}
      <TablePanel
        title="Time corrections"
        titleCount={meta?.total ?? rows.length}
        titleCountLabel="Requests"
        tabs={STATUSES}
        tab={status}
        onTabChange={(value) => {
          setStatus(value);
          setDraftStatus(value);
          setPage(1);
        }}
        filterTitle="Status"
        filterSubtitle="Correction requests"
        filterActive={status !== "pending"}
        activeFilterCount={status !== "pending" ? 1 : 0}
        drawerFields={
          <FilterSelect
            label="Status"
            value={draftStatus}
            onChange={setDraftStatus}
            options={STATUSES}
          />
        }
        onApplyFilters={() => {
          setStatus(draftStatus);
          setPage(1);
        }}
        onResetFilters={() => {
          setDraftStatus("pending");
          setStatus("pending");
          setPage(1);
        }}
        onRefresh={() => setReloadKey((value) => value + 1)}
        columns={[
          { id: "employee", header: "Employee", cell: (row) => personName(row.employee) },
          { id: "task", header: "Task", cell: (row) => row.task?.title || "—" },
          { id: "type", header: "Type", cell: (row) => (row.type === "edit" ? "Edit" : "Add") },
          {
            id: "time",
            header: "Requested time",
            cell: (row) =>
              `${formatDateTime(row.requestedStartedAt)} – ${formatDateTime(row.requestedEndedAt)}`,
          },
          { id: "reason", header: "Reason", cell: (row) => row.reason || "—" },
          {
            id: "status",
            header: "Status",
            cell: (row) => (
              <Badge variant={row.status === "approved" ? "success" : row.status === "rejected" ? "danger" : "primary"}>
                {row.status || "pending"}
              </Badge>
            ),
          },
          {
            id: "actions",
            header: "Actions",
            cell: (row) =>
              row.status === "pending" ? (
                <TeamRowMenu
                  menuId={row.correctionId}
                  items={[
                    {
                      label: "Review",
                      icon: <Eye className="h-4 w-4 text-[var(--violet)]" />,
                      onClick: () => {
                        setDecision(row);
                        setNote("");
                      },
                    },
                  ]}
                />
              ) : (
                "—"
              ),
          },
        ]}
        rows={rows}
        getRowKey={(row) => row.correctionId}
        loading={loading}
        loadingLabel="Loading corrections"
        emptyIcon={Clock3}
        emptyTitle={status === "pending" ? "No corrections waiting for your approval" : "No corrections for this status"}
        page={page}
        pageSize={pageSize}
        total={meta?.total ?? rows.length}
        onPageChange={setPage}
        onPageSizeChange={(size) => {
          setPageSize(size);
          setPage(1);
        }}
        minWidth="980px"
      />

      <SlideOver
        open={Boolean(decision)}
        title="Review correction"
        subtitle={decision?.task?.title || ""}
        onClose={() => setDecision(null)}
        footer={
          <div className="flex justify-end gap-2">
            <Button type="button" variant="outline" disabled={saving} onClick={() => submitDecision("reject")}>
              Reject
            </Button>
            <Button type="button" disabled={saving} onClick={() => submitDecision("approve")}>
              {saving ? "Saving…" : "Approve"}
            </Button>
          </div>
        }
      >
        {decision ? (
          <div className="space-y-3 text-[13px] text-[var(--text)]">
            <p>{personName(decision.employee)} asked to {decision.type === "edit" ? "edit" : "add"} time.</p>
            <p>
              {formatDateTime(decision.requestedStartedAt)} – {formatDateTime(decision.requestedEndedAt)}
            </p>
            <p className="text-[var(--muted)]">{decision.reason}</p>
            <label className="flex flex-col gap-1">
              <span className="text-[11px] font-semibold uppercase tracking-wide text-[var(--muted)]">
                Note
              </span>
              <textarea
                className="min-h-24 rounded-xl border border-[var(--border)] bg-[var(--surface)] px-3 py-2 text-[13px] outline-none focus:border-[var(--violet)]"
                value={note}
                placeholder="Required when rejecting"
                onChange={(e) => setNote(e.target.value)}
              />
            </label>
          </div>
        ) : null}
      </SlideOver>
    </PortalPage>
  );
}
