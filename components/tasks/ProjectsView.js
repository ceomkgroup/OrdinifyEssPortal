"use client";

import { useEffect, useMemo, useState } from "react";
import { FolderKanban, Pencil, Plus } from "lucide-react";
import { listTeamMembers } from "@/api/team";
import { listProjects } from "@/api/tasks";
import { ProjectDrawer } from "@/components/tasks/ProjectDrawer";
import { TeamRowMenu } from "@/components/team/TeamRowMenu";
import { Badge } from "@/components/ui/Badge";
import { Button } from "@/components/ui/Button";
import { CollapsibleSection } from "@/components/ui/CollapsibleSection";
import { PortalPage } from "@/components/ui/PortalPage";
import { SoftStat, SUMMARY_GRID_CLASS } from "@/components/ui/SoftStat";
import { TablePanel } from "@/components/ui/TablePanel";
import { TABLE_PAGE_SIZE } from "@/components/ui/TablePagination";
import { formatDate } from "@/lib/format";
import { PROJECT_STATUSES } from "@/lib/task-labels";

export function ProjectsView() {
  const [rows, setRows] = useState([]);
  const [members, setMembers] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [search, setSearch] = useState("");
  const [status, setStatus] = useState("all");
  const [page, setPage] = useState(1);
  const [pageSize, setPageSize] = useState(TABLE_PAGE_SIZE);
  const [drawerOpen, setDrawerOpen] = useState(false);
  const [editing, setEditing] = useState(null);
  const [reloadKey, setReloadKey] = useState(0);

  useEffect(() => {
    let alive = true;
    setLoading(true);
    listProjects()
      .then((result) => {
        if (alive) setRows(result.rows);
      })
      .catch((err) => {
        if (!alive) return;
        setError(err.message || "Failed to load projects");
        setRows([]);
      })
      .finally(() => {
        if (alive) setLoading(false);
      });
    listTeamMembers()
      .then((result) => {
        if (alive) setMembers(result.rows || []);
      })
      .catch(() => {
        if (alive) setMembers([]);
      });
    return () => {
      alive = false;
    };
  }, [reloadKey]);

  const stats = useMemo(() => {
    return rows.reduce(
      (acc, row) => {
        acc.total += 1;
        acc[row.bucket] += 1;
        return acc;
      },
      { total: 0, active: 0, completed: 0, archived: 0 }
    );
  }, [rows]);

  const filtered = useMemo(() => {
    const query = search.trim().toLowerCase();
    return rows.filter((row) => {
      if (status !== "all" && row.bucket !== status) return false;
      if (!query) return true;
      return (
        row.projectName.toLowerCase().includes(query) ||
        row.description.toLowerCase().includes(query)
      );
    });
  }, [rows, search, status]);

  const pageRows = filtered.slice((page - 1) * pageSize, page * pageSize);

  function openCreate() {
    setEditing(null);
    setDrawerOpen(true);
  }

  function openEdit(project) {
    setEditing(project);
    setDrawerOpen(true);
  }

  return (
    <PortalPage
      fill
      title="My projects"
      subtitle="Projects you belong to. Create one, then add tasks and your team."
      error={error}
      actions={
        <Button type="button" onClick={openCreate}>
          <Plus className="h-4 w-4" />
          New project
        </Button>
      }
    >
      <CollapsibleSection title="Overview">
        <div className={SUMMARY_GRID_CLASS}>
          <button type="button" className="text-left" onClick={() => { setStatus("all"); setPage(1); }}>
            <SoftStat label="My projects" value={stats.total} color="#7b39ec" />
          </button>
          <button type="button" className="text-left" onClick={() => { setStatus("active"); setPage(1); }}>
            <SoftStat label="Active" value={stats.active} color="#16a34a" />
          </button>
          <button type="button" className="text-left" onClick={() => { setStatus("completed"); setPage(1); }}>
            <SoftStat label="Completed" value={stats.completed} color="#7b39ec" />
          </button>
          <button type="button" className="text-left" onClick={() => { setStatus("archived"); setPage(1); }}>
            <SoftStat label="Archived" value={stats.archived} color="#d97706" />
          </button>
        </div>
      </CollapsibleSection>

      <TablePanel
        title="Project list"
        titleCount={filtered.length}
        titleCountLabel="Projects"
        search={search}
        onSearchChange={(value) => {
          setSearch(value);
          setPage(1);
        }}
        searchPlaceholder="Search projects"
        onRefresh={() => setReloadKey((value) => value + 1)}
        columns={[
          {
            id: "project",
            header: "Project",
            cell: (row) => (
              <button type="button" className="text-left" onClick={() => openEdit(row)}>
                <span className="block font-semibold text-[var(--text)]">{row.projectName}</span>
                {row.description ? (
                  <span className="block max-w-sm truncate text-[11px] text-[var(--muted)]">{row.description}</span>
                ) : null}
              </button>
            ),
          },
          {
            id: "status",
            header: "Status",
            cell: (row) => (
              <Badge variant={row.bucket === "archived" ? "muted" : row.bucket === "completed" ? "success" : "violet"}>
                {PROJECT_STATUSES.find((item) => item.value === row.bucket)?.label || row.status}
              </Badge>
            ),
          },
          { id: "tasks", header: "Tasks", cell: (row) => row.taskCount },
          { id: "members", header: "Members", cell: (row) => row.memberCount || "—" },
          { id: "created", header: "Created", cell: (row) => formatDate(row.createdAt) },
          {
            id: "actions",
            header: "Actions",
            cell: (row) => (
              <TeamRowMenu
                menuId={row.projectId}
                items={[
                  {
                    label: "Edit",
                    icon: <Pencil className="h-4 w-4 text-[var(--violet)]" />,
                    onClick: () => openEdit(row),
                  },
                ]}
              />
            ),
          },
        ]}
        rows={pageRows}
        getRowKey={(row) => row.projectId}
        loading={loading}
        loadingLabel="Loading projects"
        emptyIcon={FolderKanban}
        emptyTitle={search.trim() || status !== "all" ? "No projects match these filters" : "You aren't a member of any project yet"}
        emptyHint="Create a project to start assigning tasks."
        page={page}
        pageSize={pageSize}
        total={filtered.length}
        onPageChange={setPage}
        onPageSizeChange={(size) => {
          setPageSize(size);
          setPage(1);
        }}
      />

      <ProjectDrawer
        open={drawerOpen}
        project={editing}
        members={members}
        onClose={() => setDrawerOpen(false)}
        onSaved={() => setReloadKey((value) => value + 1)}
      />
    </PortalPage>
  );
}
