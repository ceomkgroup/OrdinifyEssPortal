"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import { Check, Eye, LayoutGrid, List, MessageSquare, Plus, SearchX, X } from "lucide-react";
import { listTeamMembers } from "@/api/team";
import {
  getMyBoard,
  getMyTaskStats,
  getTeamBoard,
  getTeamTaskStats,
  listMyTasks,
  listProjects,
  listTeamTasks,
  moveTask,
  updateTaskStatus,
} from "@/api/tasks";
import { TeamRowMenu } from "@/components/team/TeamRowMenu";
import { TaskDetailDrawer } from "@/components/tasks/TaskDetailDrawer";
import { TaskFormDrawer } from "@/components/tasks/TaskFormDrawer";
import { Badge } from "@/components/ui/Badge";
import { Button } from "@/components/ui/Button";
import { CollapsibleSection } from "@/components/ui/CollapsibleSection";
import {
  DataTable,
  DataTableEmpty,
  DataTableHead,
  DataTableRow,
  DataTd,
  DataTh,
} from "@/components/ui/DataTable";
import { FilterDate, FilterSelect } from "@/components/ui/ListFilters";
import { ListToolbar } from "@/components/ui/ListToolbar";
import { PortalPage } from "@/components/ui/PortalPage";
import { SoftStat, SUMMARY_GRID_CLASS } from "@/components/ui/SoftStat";
import { TABLE_PAGE_SIZE, TablePagination } from "@/components/ui/TablePagination";
import { formatDate } from "@/lib/format";
import {
  formatTracked,
  isTaskOverdue,
  priorityLabel,
  statusMeta,
  TASK_STATUSES,
} from "@/lib/task-labels";

const EMPTY_FILTERS = {
  status: "all",
  projectId: "all",
  memberId: "all",
  from: "",
  to: "",
  overdue: false,
};

const EMPTY_BOARD = {
  todo: [],
  in_progress: [],
  review: [],
  blocked: [],
  done: [],
};

function placeTask(board, taskId, toStatus, beforeTaskId) {
  let moving = null;
  const next = { ...EMPTY_BOARD };
  Object.keys(EMPTY_BOARD).forEach((status) => {
    const items = board[status] || [];
    items.forEach((item) => {
      if (item.taskId === taskId) moving = { ...item, status: toStatus };
    });
    next[status] = items.filter((item) => item.taskId !== taskId);
  });
  if (!moving) return null;
  const column = [...next[toStatus]];
  const index = beforeTaskId
    ? column.findIndex((item) => item.taskId === beforeTaskId)
    : -1;
  if (index >= 0) column.splice(index, 0, moving);
  else column.push(moving);
  next[toStatus] = column;
  return next;
}

function countFilters(filters) {
  return ["status", "projectId", "memberId", "from", "to"].filter((key) => {
    const value = filters[key];
    return value && value !== "all";
  }).length + (filters.overdue ? 1 : 0);
}

export function TasksWorkspace({ scope }) {
  const team = scope === "team";
  const [view, setView] = useState("list");
  const [search, setSearch] = useState("");
  const [appliedSearch, setAppliedSearch] = useState("");
  const [draft, setDraft] = useState(EMPTY_FILTERS);
  const [applied, setApplied] = useState(EMPTY_FILTERS);
  const [page, setPage] = useState(1);
  const [pageSize, setPageSize] = useState(TABLE_PAGE_SIZE);
  const [rows, setRows] = useState([]);
  const [board, setBoard] = useState(EMPTY_BOARD);
  const [meta, setMeta] = useState(null);
  const [stats, setStats] = useState(null);
  const [projects, setProjects] = useState([]);
  const [members, setMembers] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [formOpen, setFormOpen] = useState(false);
  const [openTaskId, setOpenTaskId] = useState(null);
  const [detailFocus, setDetailFocus] = useState("");
  const [reloadKey, setReloadKey] = useState(0);
  const [dragOver, setDragOver] = useState("");
  const [dragId, setDragId] = useState("");
  const skipClick = useRef(false);

  useEffect(() => {
    const timer = setTimeout(() => setAppliedSearch(search.trim()), 400);
    return () => clearTimeout(timer);
  }, [search]);

  useEffect(() => {
    let alive = true;
    listProjects()
      .then((result) => {
        if (alive) setProjects(result.rows);
      })
      .catch(() => {
        if (alive) setProjects([]);
      });
    if (team) {
      listTeamMembers()
        .then((result) => {
          if (alive) setMembers(result.rows || []);
        })
        .catch(() => {
          if (alive) setMembers([]);
        });
    }
    return () => {
      alive = false;
    };
  }, [team, reloadKey]);

  useEffect(() => {
    let alive = true;
    const loadStats = team ? getTeamTaskStats : getMyTaskStats;
    loadStats()
      .then((data) => {
        if (alive) setStats(data);
      })
      .catch(() => {
        if (alive) setStats(null);
      });
    return () => {
      alive = false;
    };
  }, [team, reloadKey]);

  useEffect(() => {
    let alive = true;
    setLoading(true);
    setError("");
    const query = {
      projectId: applied.projectId,
      from: applied.from,
      to: applied.to,
      ...(team ? { assignedToEmployeeId: applied.memberId } : {}),
    };
    const listQuery = {
      ...query,
      search: appliedSearch,
      page,
      limit: pageSize,
      ...(applied.overdue ? { overdue: "1" } : { status: applied.status }),
    };
    const loader =
      view === "board"
        ? team
          ? getTeamBoard(query)
          : getMyBoard(query)
        : team
          ? listTeamTasks(listQuery)
          : listMyTasks(listQuery);

    Promise.resolve(loader)
      .then((result) => {
        if (!alive) return;
        if (view === "board") setBoard(result);
        else {
          setRows(result.rows);
          setMeta(result.meta);
        }
      })
      .catch((err) => {
        if (!alive) return;
        setError(err.message || "Failed to load tasks");
        setRows([]);
        setBoard(EMPTY_BOARD);
      })
      .finally(() => {
        if (alive) setLoading(false);
      });
    return () => {
      alive = false;
    };
  }, [team, view, applied, appliedSearch, page, pageSize, reloadKey]);

  const visibleBoard = useMemo(() => {
    const next = {};
    Object.entries(board).forEach(([key, items]) => {
      next[key] = items.filter((task) => {
        if (
          appliedSearch &&
          !task.title.toLowerCase().includes(appliedSearch.toLowerCase())
        ) {
          return false;
        }
        if (applied.overdue) return isTaskOverdue(task);
        if (applied.status !== "all" && task.status !== applied.status) return false;
        return true;
      });
    });
    return next;
  }, [board, applied, appliedSearch]);

  const total = meta?.total ?? rows.length;

  function applyStat(key) {
    const next = {
      ...applied,
      status: key === "overdue" || key === "total" ? "all" : key,
      overdue: key === "overdue",
    };
    setApplied(next);
    setDraft(next);
    setPage(1);
  }

  function refresh() {
    setReloadKey((value) => value + 1);
  }

  function openTask(taskId, focus = "") {
    setDetailFocus(focus);
    setOpenTaskId(taskId);
  }

  async function completeTask(task) {
    setError("");
    try {
      await updateTaskStatus(task.taskId, "done");
      refresh();
    } catch (err) {
      setError(err.message || "Failed to complete task");
    }
  }

  function taskActions(task) {
    return [
      {
        label: "View Details",
        icon: <Eye className="h-4 w-4 text-[var(--violet)]" />,
        onClick: () => openTask(task.taskId),
      },
      {
        label: "Comments",
        icon: <MessageSquare className="h-4 w-4 text-[var(--muted)]" />,
        onClick: () => openTask(task.taskId, "comments"),
      },
      ...(task.status === "done"
        ? []
        : [
            {
              label: "Mark Complete",
              tone: "success",
              icon: <Check className="h-4 w-4" />,
              onClick: () => completeTask(task),
            },
          ]),
      {
        label: "Close",
        separated: true,
        icon: <X className="h-4 w-4" />,
        onClick: () => {
          if (openTaskId === task.taskId) {
            setOpenTaskId(null);
            setDetailFocus("");
          }
        },
      },
    ];
  }

  async function moveCard(taskId, toStatus, beforeTaskId) {
    if (!taskId || taskId === beforeTaskId) return;
    const sourceStatus = Object.keys(board).find((status) =>
      (board[status] || []).some((item) => item.taskId === taskId)
    );
    const task = (board[sourceStatus] || []).find((item) => item.taskId === taskId);
    if (!task || task.status === "done") return;
    const next = placeTask(board, taskId, toStatus, beforeTaskId);
    if (!next) return;
    const sameOrder =
      (board[toStatus] || []).map((item) => item.taskId).join() ===
      next[toStatus].map((item) => item.taskId).join();
    if (sourceStatus === toStatus && sameOrder) return;
    setBoard(next);
    setError("");
    try {
      await moveTask(
        taskId,
        toStatus,
        next[toStatus].map((item) => item.taskId)
      );
      refresh();
    } catch (err) {
      setBoard(board);
      setError(err.message || "Failed to move task");
    }
  }

  const columns = [
    {
      id: "task",
      header: "Task",
      cell: (row) => (
        <button
          type="button"
          className="text-left"
          onClick={() => openTask(row.taskId)}
        >
          <span className="block font-semibold text-[var(--text)]">{row.title}</span>
          <span className="block text-[11px] text-[var(--muted)]">
            {row.projectName || "No project"}
          </span>
        </button>
      ),
    },
    ...(team
      ? [{ id: "assignee", header: "Assigned to", cell: (row) => row.assigneeName || "—" }]
      : []),
    {
      id: "priority",
      header: "Priority",
      cell: (row) => <Badge variant="violet">{priorityLabel(row.priority)}</Badge>,
    },
    { id: "due", header: "Due date", cell: (row) => formatDate(row.dueDate) },
    {
      id: "status",
      header: "Status",
      cell: (row) => {
        const meta = statusMeta(row.status);
        return <Badge variant={row.status === "done" ? "success" : row.status === "blocked" ? "danger" : "primary"}>{meta.label}</Badge>;
      },
    },
    { id: "time", header: "Time tracked", cell: (row) => formatTracked(row.trackedSeconds) },
    { id: "created", header: "Created", cell: (row) => formatDate(row.createdAt) },
    {
      id: "actions",
      header: "Actions",
      cell: (row) => <TeamRowMenu menuId={row.taskId} items={taskActions(row)} />,
    },
  ];

  return (
    <PortalPage
      fill
      title={team ? "Team tasks" : "My tasks"}
      subtitle={
        team
          ? "Tasks assigned to people who report to you."
          : "Tasks assigned to you, grouped by project."
      }
      error={error}
      actions={
        <Button type="button" onClick={() => setFormOpen(true)}>
          <Plus className="h-4 w-4" />
          {team ? "Assign task" : "New task"}
        </Button>
      }
    >
      <CollapsibleSection title="Overview">
        <div className={SUMMARY_GRID_CLASS}>
          <StatButton label="Total tasks" value={stats?.total ?? "—"} onClick={() => applyStat("total")} />
          <StatButton label="To-do" value={stats?.todo ?? "—"} color="#ca8a04" onClick={() => applyStat("todo")} />
          <StatButton label="In progress" value={stats?.in_progress ?? "—"} color="#7b39ec" onClick={() => applyStat("in_progress")} />
          <StatButton label="Completed" value={stats?.done ?? "—"} color="#16a34a" onClick={() => applyStat("done")} />
          <StatButton label="Overdue" value={stats?.overdue ?? "—"} color="#dc2626" onClick={() => applyStat("overdue")} />
        </div>
      </CollapsibleSection>

      <section
        data-fill-panel=""
        className="flex min-h-[180px] flex-1 flex-col overflow-hidden rounded-2xl border border-[var(--border)] bg-[var(--surface)] shadow-[var(--card-shadow)]"
      >
        <div className="flex items-center justify-between gap-2 border-b border-[var(--border)] px-3 py-1.5">
          <h2 className="heading-section">{team ? "Tasks" : "Task list"}</h2>
          <div className="flex items-center gap-1">
            <ViewButton active={view === "list"} label="List" icon={List} onClick={() => setView("list")} />
            <ViewButton active={view === "board"} label="Board" icon={LayoutGrid} onClick={() => setView("board")} />
          </div>
        </div>
        <ListToolbar
          search={search}
          onSearchChange={(value) => {
            setSearch(value);
            setPage(1);
          }}
          searchPlaceholder="Search tasks"
          recordCount={view === "list" ? total : undefined}
          filterTitle="Filters"
          filterSubtitle="Project, people and dates"
          filterActive={countFilters(applied) > 0}
          activeFilterCount={countFilters(applied)}
          onApplyFilters={() => {
            setApplied(draft);
            setPage(1);
          }}
          onResetFilters={() => {
            setDraft(EMPTY_FILTERS);
            setApplied(EMPTY_FILTERS);
            setPage(1);
          }}
          onRefresh={refresh}
          drawerFields={
            <div className="space-y-3">
              <FilterSelect
                label="Status"
                value={draft.overdue ? "overdue" : draft.status}
                onChange={(value) =>
                  setDraft((prev) => ({
                    ...prev,
                    overdue: value === "overdue",
                    status: value === "overdue" ? "all" : value,
                  }))
                }
                options={[
                  { value: "all", label: "All statuses" },
                  ...TASK_STATUSES.map((item) => ({ value: item.value, label: item.label })),
                  { value: "overdue", label: "Overdue" },
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
              {team ? (
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
              ) : null}
              <FilterDate label="From" value={draft.from} clearable onChange={(value) => setDraft((prev) => ({ ...prev, from: value }))} />
              <FilterDate label="To" value={draft.to} clearable onChange={(value) => setDraft((prev) => ({ ...prev, to: value }))} />
            </div>
          }
        />

        <div className="min-h-0 flex-1 overflow-hidden">
          {view === "list" ? (
            <DataTable minWidth={team ? "980px" : "860px"} fill>
              <DataTableHead>
                {columns.map((column) => (
                  <DataTh key={column.id}>{column.header}</DataTh>
                ))}
              </DataTableHead>
              <tbody>
                {loading ? (
                  <DataTableEmpty colSpan={columns.length}>Loading tasks…</DataTableEmpty>
                ) : rows.length === 0 ? (
                  <DataTableEmpty colSpan={columns.length}>
                    <div className="flex flex-col items-center gap-2">
                      <SearchX className="h-6 w-6 text-[var(--violet)]" />
                      <p className="text-[14px] font-semibold text-[var(--text)]">
                        {team ? "No tasks for your team match these filters" : "No tasks match these filters"}
                      </p>
                    </div>
                  </DataTableEmpty>
                ) : (
                  rows.map((row) => (
                    <DataTableRow key={row.taskId}>
                      {columns.map((column) => (
                        <DataTd key={column.id}>{column.cell(row)}</DataTd>
                      ))}
                    </DataTableRow>
                  ))
                )}
              </tbody>
            </DataTable>
          ) : (
            <div className="flex h-full gap-3 overflow-x-auto p-3">
              {TASK_STATUSES.map((column) => {
                const items = visibleBoard[column.value] || [];
                return (
                  <div
                    key={column.value}
                    className={`flex w-64 shrink-0 flex-col rounded-xl border bg-[var(--panel-soft)] ${
                      dragOver === column.value
                        ? "border-[var(--violet)] ring-2 ring-[var(--lavender-soft)]"
                        : "border-[var(--border)]"
                    }`}
                    onDragOver={(event) => {
                      event.preventDefault();
                      setDragOver(column.value);
                    }}
                    onDragLeave={(event) => {
                      if (!event.currentTarget.contains(event.relatedTarget)) setDragOver("");
                    }}
                    onDrop={(event) => {
                      event.preventDefault();
                      setDragOver("");
                      moveCard(event.dataTransfer.getData("text/plain"), column.value, null);
                    }}
                  >
                    <div className="flex items-center justify-between px-3 py-2">
                      <span className="text-[12px] font-semibold text-[var(--text)]">{column.label}</span>
                      <span className="text-[11px] text-[var(--muted)]">{items.length}</span>
                    </div>
                    <div className="min-h-0 flex-1 space-y-2 overflow-y-auto px-2 pb-2">
                      {items.length === 0 ? (
                        <p className="px-1 py-6 text-center text-[12px] text-[var(--muted)]">No tasks</p>
                      ) : (
                        items.map((task) => {
                          const locked = task.status === "done";
                          return (
                            <div
                              key={task.taskId}
                              draggable={!locked}
                              onDragStart={(event) => {
                                event.dataTransfer.setData("text/plain", task.taskId);
                                event.dataTransfer.effectAllowed = "move";
                                setDragId(task.taskId);
                              }}
                              onDragEnd={() => {
                                skipClick.current = true;
                                setDragId("");
                                setDragOver("");
                              }}
                              onDragOver={(event) => {
                                if (locked) return;
                                event.preventDefault();
                                event.stopPropagation();
                                setDragOver(`${column.value}:${task.taskId}`);
                              }}
                              onDrop={(event) => {
                                event.preventDefault();
                                event.stopPropagation();
                                setDragOver("");
                                moveCard(
                                  event.dataTransfer.getData("text/plain"),
                                  column.value,
                                  task.taskId
                                );
                              }}
                              onClick={() => {
                                if (skipClick.current) {
                                  skipClick.current = false;
                                  return;
                                }
                                openTask(task.taskId);
                              }}
                              className={`relative w-full rounded-xl border bg-[var(--surface)] p-3 pr-10 text-left shadow-[var(--card-shadow)] ${
                                locked ? "cursor-default" : "cursor-grab active:cursor-grabbing"
                              } ${dragId === task.taskId ? "opacity-50" : ""} ${
                                dragOver === `${column.value}:${task.taskId}`
                                  ? "border-[var(--violet)]"
                                  : "border-[var(--border)]"
                              }`}
                            >
                              <div
                                className="absolute right-1.5 top-1.5"
                                onClick={(event) => event.stopPropagation()}
                                onMouseDown={(event) => event.stopPropagation()}
                              >
                                <TeamRowMenu menuId={`board-${task.taskId}`} items={taskActions(task)} />
                              </div>
                              <p className="text-[13px] font-semibold text-[var(--text)]">{task.title}</p>
                              <p className="mt-1 text-[11px] text-[var(--muted)]">{task.projectName || "No project"}</p>
                              <div className="mt-2 flex items-center justify-between gap-2 text-[11px] text-[var(--muted)]">
                                <span>{priorityLabel(task.priority)}</span>
                                <span>{formatDate(task.dueDate)}</span>
                              </div>
                              {team ? (
                                <p className="mt-1 truncate text-[11px] text-[var(--muted)]">{task.assigneeName}</p>
                              ) : null}
                            </div>
                          );
                        })
                      )}
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </div>
        {view === "list" ? (
          <TablePagination
            page={page}
            pageSize={pageSize}
            total={total}
            onPageChange={setPage}
            onPageSizeChange={(size) => {
              setPageSize(size);
              setPage(1);
            }}
            loading={loading}
          />
        ) : null}
      </section>

      <TaskFormDrawer
        open={formOpen}
        scope={scope}
        projects={projects.filter((project) => project.bucket === "active")}
        members={members}
        onClose={() => setFormOpen(false)}
        onCreated={refresh}
      />
      <TaskDetailDrawer
        open={Boolean(openTaskId)}
        taskId={openTaskId}
        focus={detailFocus}
        onClose={() => {
          setOpenTaskId(null);
          setDetailFocus("");
        }}
        onChanged={refresh}
      />
    </PortalPage>
  );
}

function StatButton({ label, value, color, onClick }) {
  return (
    <button type="button" onClick={onClick} className="text-left">
      <SoftStat label={label} value={value} color={color} />
    </button>
  );
}

function ViewButton({ active, label, icon: Icon, onClick }) {
  return (
    <button
      type="button"
      onClick={onClick}
      className={`inline-flex items-center gap-1 rounded-md border px-2 py-1 text-[12px] font-medium ${
        active
          ? "border-[var(--violet)] bg-[var(--lavender-soft)] text-[var(--violet)]"
          : "border-[var(--border)] text-[var(--muted)]"
      }`}
    >
      <Icon className="h-3.5 w-3.5" />
      {label}
    </button>
  );
}
