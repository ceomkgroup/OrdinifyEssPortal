"use client";

import { useEffect, useState } from "react";
import { BarChart3, MonitorSmartphone } from "lucide-react";
import { listTeamMembers } from "@/api/team";
import {
  downloadTeamReport,
  getTeamTaskReport,
  getTeamTimesheet,
  listProjects,
} from "@/api/tasks";
import { Badge } from "@/components/ui/Badge";
import { FilterDate, FilterSelect } from "@/components/ui/ListFilters";
import { PortalPage } from "@/components/ui/PortalPage";
import { TablePanel } from "@/components/ui/TablePanel";
import { formatDate } from "@/lib/format";
import { formatTracked, priorityLabel, statusMeta } from "@/lib/task-labels";

const TABS = [
  { value: "timesheet", label: "Timesheet" },
  { value: "tasks", label: "Assigned tasks" },
  { value: "presence", label: "Desktop presence" },
];

const CATEGORIES = [
  { value: "open", label: "Open", key: "open" },
  { value: "not_started", label: "Not started", key: "not_started" },
  { value: "overdue", label: "Overdue", key: "overdue" },
  { value: "completed", label: "Completed", key: "completed" },
];

const EMPTY = { memberId: "all", projectId: "all", from: "", to: "" };

export function TaskReportsView() {
  const [tab, setTab] = useState("timesheet");
  const [category, setCategory] = useState("");
  const [draft, setDraft] = useState(EMPTY);
  const [applied, setApplied] = useState(EMPTY);
  const [members, setMembers] = useState([]);
  const [projects, setProjects] = useState([]);
  const [rows, setRows] = useState([]);
  const [summary, setSummary] = useState({});
  const [loading, setLoading] = useState(false);
  const [exporting, setExporting] = useState(false);
  const [error, setError] = useState("");
  const [reloadKey, setReloadKey] = useState(0);

  useEffect(() => {
    listTeamMembers()
      .then((result) => setMembers(result.rows || []))
      .catch(() => setMembers([]));
    listProjects()
      .then((result) => setProjects(result.rows))
      .catch(() => setProjects([]));
  }, []);

  useEffect(() => {
    if (tab === "presence") return undefined;
    let alive = true;
    setLoading(true);
    setError("");
    const query = {
      employeeId: applied.memberId,
      projectId: applied.projectId,
      from: applied.from,
      to: applied.to,
      ...(tab === "tasks" && category ? { category } : {}),
    };
    const loader = tab === "timesheet" ? getTeamTimesheet(query) : getTeamTaskReport(query);
    Promise.resolve(loader)
      .then((result) => {
        if (!alive) return;
        if (tab === "timesheet") {
          setRows(result);
          setSummary({});
        } else {
          setRows(result.rows);
          setSummary(result.summary || {});
        }
      })
      .catch((err) => {
        if (!alive) return;
        setError(err.message || "Failed to load the report");
        setRows([]);
      })
      .finally(() => {
        if (alive) setLoading(false);
      });
    return () => {
      alive = false;
    };
  }, [tab, category, applied, reloadKey]);

  const filterCount = ["memberId", "projectId", "from", "to"].filter((key) => {
    const value = applied[key];
    return value && value !== "all";
  }).length;

  async function exportCsv() {
    setExporting(true);
    try {
      await downloadTeamReport(
        tab === "timesheet" ? "timesheet" : "tasks",
        {
          employeeId: applied.memberId,
          projectId: applied.projectId,
          from: applied.from,
          to: applied.to,
          ...(tab === "tasks" && category ? { category } : {}),
        },
        tab === "timesheet" ? "timesheet.csv" : "tasks-report.csv"
      );
    } catch (err) {
      setError(err.message || "Failed to export");
    } finally {
      setExporting(false);
    }
  }

  const timesheetColumns = [
    { id: "date", header: "Date", cell: (row) => formatDate(row.date) },
    { id: "employee", header: "Employee", cell: (row) => row.employeeName || "—" },
    { id: "project", header: "Project", cell: (row) => row.projectName || "—" },
    { id: "tracked", header: "Tracked", cell: (row) => formatTracked(row.trackedSeconds) },
    { id: "idle", header: "Idle", cell: (row) => formatTracked(row.idleSeconds) },
    { id: "active", header: "Active", cell: (row) => formatTracked(row.activeSeconds) },
  ];

  const taskColumns = [
    { id: "task", header: "Task", cell: (row) => row.title || "—" },
    { id: "assignee", header: "Assigned to", cell: (row) => row.employeeName || "—" },
    {
      id: "status",
      header: "Status",
      cell: (row) => <Badge variant="primary">{statusMeta(row.status).label}</Badge>,
    },
    { id: "due", header: "Due", cell: (row) => formatDate(row.dueDate) },
    { id: "estimated", header: "Estimated", cell: (row) => (row.estimatedHours != null ? `${row.estimatedHours}h` : "—") },
    { id: "tracked", header: "Tracked", cell: (row) => formatTracked(row.trackedSeconds) },
    { id: "priority", header: "Priority", cell: (row) => priorityLabel(row.priority) },
  ];

  return (
    <PortalPage
      fill
      title="Team task reports"
      subtitle="Timesheet and assigned-task totals for people who report to you."
      error={error}
    >
      {tab === "presence" ? (
        <section className="flex min-h-[280px] flex-1 flex-col overflow-hidden rounded-2xl border border-[var(--border)] bg-[var(--surface)]">
          <div className="border-b border-[var(--border)] px-3 py-2">
            <div className="mb-2 flex gap-1">
              {TABS.map((item) => (
                <button
                  key={item.value}
                  type="button"
                  onClick={() => setTab(item.value)}
                  className={`rounded-md border px-2.5 py-1 text-[12px] font-medium ${
                    tab === item.value
                      ? "border-[var(--violet)] bg-[var(--lavender-soft)] text-[var(--violet)]"
                      : "border-[var(--border)] text-[var(--muted)]"
                  }`}
                >
                  {item.label}
                </button>
              ))}
            </div>
            <p className="text-[12px] text-[var(--muted)]">
              Desktop verified means the person was checked in and the desktop app was running. This report is informational and does not change official attendance. The desktop presence endpoint is not in the task API yet.
            </p>
          </div>
          <div className="flex flex-1 flex-col items-center justify-center gap-2 text-center">
            <MonitorSmartphone className="h-8 w-8 text-[var(--violet)]" />
            <p className="text-[14px] font-semibold text-[var(--text)]">No desktop presence data yet</p>
          </div>
        </section>
      ) : (
        <TablePanel
          title={tab === "timesheet" ? "Timesheet" : "Assigned tasks"}
          tabs={TABS}
          tab={tab}
          onTabChange={setTab}
          headerExtra={
            tab === "tasks" ? (
              <div className="flex flex-wrap gap-1">
                {CATEGORIES.map((item) => (
                  <button
                    key={item.value}
                    type="button"
                    onClick={() => setCategory((current) => (current === item.value ? "" : item.value))}
                    className={`rounded-full border px-2 py-0.5 text-[11px] font-semibold ${
                      category === item.value
                        ? "border-[var(--violet)] bg-[var(--lavender-soft)] text-[var(--violet)]"
                        : "border-[var(--border)] text-[var(--muted)]"
                    }`}
                  >
                    {item.label} · {summary[item.key] ?? 0}
                  </button>
                ))}
              </div>
            ) : null
          }
          filterTitle="Report filters"
          filterSubtitle="Member, project and dates"
          filterActive={filterCount > 0}
          activeFilterCount={filterCount}
          drawerFields={
            <div className="space-y-3">
              <FilterSelect
                label="Member"
                value={draft.memberId}
                onChange={(value) => setDraft((prev) => ({ ...prev, memberId: value }))}
                options={[
                  { value: "all", label: "All members" },
                  ...members.map((member) => ({
                    value: member.employeeId,
                    label: member.name || member.employeeName,
                  })),
                ]}
              />
              <FilterSelect
                label="Project"
                value={draft.projectId}
                onChange={(value) => setDraft((prev) => ({ ...prev, projectId: value }))}
                options={[
                  { value: "all", label: "All projects" },
                  ...projects.map((project) => ({
                    value: project.projectId,
                    label: project.projectName,
                  })),
                ]}
              />
              <FilterDate label="From" value={draft.from} clearable onChange={(value) => setDraft((prev) => ({ ...prev, from: value }))} />
              <FilterDate label="To" value={draft.to} clearable onChange={(value) => setDraft((prev) => ({ ...prev, to: value }))} />
            </div>
          }
          onApplyFilters={() => setApplied(draft)}
          onResetFilters={() => {
            setDraft(EMPTY);
            setApplied(EMPTY);
            setCategory("");
          }}
          onRefresh={() => setReloadKey((value) => value + 1)}
          onExport={exportCsv}
          exporting={exporting}
          columns={tab === "timesheet" ? timesheetColumns : taskColumns}
          rows={rows}
          getRowKey={(row, index) => row.taskId || `${row.employeeId}-${row.date}-${row.projectId}-${index}`}
          loading={loading}
          loadingLabel="Loading report"
          emptyIcon={BarChart3}
          emptyTitle="No data for these filters"
          showPagination={false}
          minWidth="860px"
        />
      )}
    </PortalPage>
  );
}
