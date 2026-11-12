import api from "@/lib/axios";
import { personName, projectBucket } from "@/lib/task-labels";

const ROOT = "/api/employee/portal/task-management";

function unwrap(data, fallbackMessage) {
  if (!data?.success) {
    const err = new Error(data?.message || fallbackMessage);
    err.code = data?.code || data?.error;
    err.data = data?.data ?? data;
    throw err;
  }
  return data;
}

function toApiError(err, fallbackMessage) {
  const apiMessage =
    (err?.data && typeof err.data === "object" && err.data.message) ||
    err?.message ||
    fallbackMessage;
  const next = new Error(apiMessage);
  next.status = err?.status;
  next.code = err?.code || err?.data?.code || err?.data?.error;
  next.data = err?.data;
  return next;
}

function cleanQuery(query = {}) {
  const params = {};
  Object.entries(query).forEach(([key, value]) => {
    if (value == null || value === "" || value === "all") return;
    params[key] = value;
  });
  return params;
}

async function request(method, path, { query, body, form, fallback } = {}) {
  try {
    const config = { params: cleanQuery(query) };
    const { data } =
      method === "get"
        ? await api.get(path, config)
        : method === "delete"
          ? await api.delete(path, config)
          : await api[method](path, form || body || {}, config);
    return unwrap(data, fallback || "Request failed");
  } catch (err) {
    throw toApiError(err, fallback || "Request failed");
  }
}

export function normalizeTask(row) {
  if (!row || typeof row !== "object") return null;
  const taskId = row.taskId || row.id;
  if (!taskId) return null;
  const assignee = row.assignee || null;
  return {
    ...row,
    taskId,
    title: row.title || "Untitled task",
    description: row.description || "",
    priority: row.priority || "medium",
    status: row.status || "todo",
    projectId: row.projectId || row.project?.projectId || null,
    projectName: row.project?.projectName || row.projectName || "",
    assignedToEmployeeId:
      row.assignedToEmployeeId || assignee?.employeeId || null,
    assigneeName: personName(assignee),
    dueDate: row.dueDate || null,
    estimatedHours: row.estimatedHours ?? null,
    trackedSeconds: Number(row.trackedSeconds) || 0,
    createdAt: row.createdAt || null,
    checklist: row.checklist || null,
    checklistItems: Array.isArray(row.checklistItems) ? row.checklistItems : [],
    comments: Array.isArray(row.comments) ? row.comments : [],
    attachments: Array.isArray(row.attachments) ? row.attachments : [],
    timeLogs: Array.isArray(row.timeLogs) ? row.timeLogs : [],
  };
}

export function normalizeProject(row) {
  if (!row || typeof row !== "object") return null;
  const projectId = row.projectId || row.id;
  if (!projectId) return null;
  const status = row.status || "active";
  return {
    ...row,
    projectId,
    projectName: row.projectName || row.name || "Untitled project",
    description: row.description || "",
    status,
    bucket: projectBucket(status),
    taskCount: Number(row.taskCount ?? row.tasksCount ?? row.tasks ?? 0) || 0,
    memberCount:
      Number(row.memberCount ?? row.membersCount ?? row.members?.length ?? 0) ||
      0,
    createdAt: row.createdAt || row.addedAt || null,
  };
}

function normalizeColumns(data) {
  const source = data && typeof data === "object" ? data : {};
  return {
    todo: (source.todo || []).map(normalizeTask).filter(Boolean),
    in_progress: (source.in_progress || []).map(normalizeTask).filter(Boolean),
    review: (source.review || []).map(normalizeTask).filter(Boolean),
    blocked: (source.blocked || []).map(normalizeTask).filter(Boolean),
    done: (source.done || []).map(normalizeTask).filter(Boolean),
  };
}

export function listMyTasks(query) {
  return request("get", `${ROOT}/tasks/my`, {
    query,
    fallback: "Failed to load your tasks",
  }).then((body) => ({
    rows: (Array.isArray(body.data) ? body.data : []).map(normalizeTask).filter(Boolean),
    meta: body.meta || null,
  }));
}

export function listTeamTasks(query) {
  return request("get", `${ROOT}/tasks/team`, {
    query,
    fallback: "Failed to load team tasks",
  }).then((body) => ({
    rows: (Array.isArray(body.data) ? body.data : []).map(normalizeTask).filter(Boolean),
    meta: body.meta || null,
  }));
}

export function getMyTaskStats() {
  return request("get", `${ROOT}/tasks/my/stats`, {
    fallback: "Failed to load task summary",
  }).then((body) => body.data || {});
}

export function getTeamTaskStats() {
  return request("get", `${ROOT}/tasks/team/stats`, {
    fallback: "Failed to load team task summary",
  }).then((body) => body.data || {});
}

export function getMyBoard(query) {
  return request("get", `${ROOT}/tasks/my/board`, {
    query,
    fallback: "Failed to load your board",
  }).then((body) => normalizeColumns(body.data));
}

export function getTeamBoard(query) {
  return request("get", `${ROOT}/tasks/team/board`, {
    query,
    fallback: "Failed to load the team board",
  }).then((body) => normalizeColumns(body.data));
}

export function getTask(taskId) {
  return request("get", `${ROOT}/tasks/${taskId}`, {
    fallback: "Failed to load task",
  }).then((body) => normalizeTask(body.data));
}

export function createTask(payload) {
  return request("post", `${ROOT}/tasks`, {
    body: payload,
    fallback: "Failed to create task",
  }).then((body) => normalizeTask(body.data));
}

/**
 * Field edits after create. Title stays as it was created.
 * Body is description, priority, due date, and estimated hours.
 */
export function updateTask(taskId, payload) {
  return request("patch", `${ROOT}/tasks/${taskId}`, {
    body: payload,
    fallback: "Failed to update task",
  }).then((body) => normalizeTask(body.data) || body.data);
}

export function updateTaskStatus(taskId, status) {
  return request("patch", `${ROOT}/tasks/${taskId}/status`, {
    body: { status },
    fallback: "Failed to change status",
  }).then((body) => normalizeTask(body.data) || body.data);
}

export function moveTask(taskId, status, orderedTaskIds) {
  return request("patch", `${ROOT}/tasks/${taskId}/move`, {
    body: { status, orderedTaskIds },
    fallback: "Failed to move task",
  });
}

export function addTaskComment(taskId, payload) {
  return request("post", `${ROOT}/tasks/${taskId}/comments`, {
    body: payload,
    fallback: "Failed to add comment",
  }).then((body) => body.data);
}

export function listMentionable(taskId) {
  return request("get", `${ROOT}/tasks/${taskId}/mentionable`, {
    fallback: "Failed to load people",
  }).then((body) => (Array.isArray(body.data) ? body.data : []));
}

export function addChecklistItem(taskId, title) {
  return request("post", `${ROOT}/tasks/${taskId}/checklist`, {
    body: { title },
    fallback: "Failed to add checklist item",
  }).then((body) => body.data);
}

export function updateChecklistItem(taskId, itemId, payload) {
  return request("patch", `${ROOT}/tasks/${taskId}/checklist/${itemId}`, {
    body: payload,
    fallback: "Failed to update checklist item",
  }).then((body) => body.data);
}

export function deleteChecklistItem(taskId, itemId) {
  return request("delete", `${ROOT}/tasks/${taskId}/checklist/${itemId}`, {
    fallback: "Failed to delete checklist item",
  });
}

export function listTaskAttachments(taskId) {
  return request("get", `${ROOT}/tasks/${taskId}/attachments`, {
    fallback: "Failed to load attachments",
  }).then((body) => (Array.isArray(body.data) ? body.data : []));
}

export function uploadTaskAttachment(taskId, file) {
  const form = new FormData();
  form.append("file", file);
  return request("post", `${ROOT}/tasks/${taskId}/attachments`, {
    form,
    fallback: "Failed to upload file",
  }).then((body) => body.data);
}

export function getAttachmentDownload(taskId, attachmentId) {
  return request(
    "get",
    `${ROOT}/tasks/${taskId}/attachments/${attachmentId}/download`,
    { fallback: "Failed to download file" }
  ).then((body) => body.data);
}

export function deleteTaskAttachment(taskId, attachmentId) {
  return request("delete", `${ROOT}/tasks/${taskId}/attachments/${attachmentId}`, {
    fallback: "Failed to delete file",
  });
}

export function startTaskTimer(taskId) {
  return request("post", `${ROOT}/tasks/${taskId}/timer/start`, {
    body: { source: "web" },
    fallback: "Failed to start timer",
  }).then((body) => body.data);
}

export function stopTaskTimer(taskId) {
  return request("patch", `${ROOT}/tasks/${taskId}/timer/stop`, {
    fallback: "Failed to stop timer",
  }).then((body) => body.data);
}

export function getActiveTimer() {
  return request("get", `${ROOT}/timer/active`, {
    fallback: "Failed to load timer",
  }).then((body) => body.data || null);
}

export function requestTimeCorrection(taskId, payload) {
  return request("post", `${ROOT}/tasks/${taskId}/time-corrections`, {
    body: payload,
    fallback: "Failed to request a time correction",
  }).then((body) => body.data);
}

export function listTeamTimeCorrections(query) {
  return request("get", `${ROOT}/time-corrections/team`, {
    query,
    fallback: "Failed to load time corrections",
  }).then((body) => ({
    rows: Array.isArray(body.data) ? body.data : [],
    meta: body.meta || null,
  }));
}

export function decideTimeCorrection(correctionId, payload) {
  return request("post", `${ROOT}/time-corrections/${correctionId}/decision`, {
    body: payload,
    fallback: "Failed to record the decision",
  }).then((body) => body.data);
}

export function listProjects(query) {
  return request("get", `${ROOT}/projects`, {
    query,
    fallback: "Failed to load projects",
  }).then((body) => ({
    rows: (Array.isArray(body.data) ? body.data : []).map(normalizeProject).filter(Boolean),
    meta: body.meta || null,
  }));
}

export function createProject(payload) {
  return request("post", `${ROOT}/projects`, {
    body: payload,
    fallback: "Failed to create project",
  }).then((body) => normalizeProject(body.data) || body.data);
}

export function updateProject(projectId, payload) {
  return request("patch", `${ROOT}/projects/${projectId}`, {
    body: payload,
    fallback: "Failed to update project",
  }).then((body) => normalizeProject(body.data) || body.data);
}

export function listProjectMembers(projectId) {
  return request("get", `${ROOT}/projects/${projectId}/members`, {
    fallback: "Failed to load members",
  }).then((body) => (Array.isArray(body.data) ? body.data : []));
}

export function addProjectMembers(projectId, employeeIds) {
  return request("post", `${ROOT}/projects/${projectId}/members`, {
    body: { employeeIds },
    fallback: "Failed to add members",
  });
}

export function removeProjectMember(projectId, employeeId) {
  return request("delete", `${ROOT}/projects/${projectId}/members/${employeeId}`, {
    fallback: "Failed to remove member",
  });
}

export function getTeamTimesheet(query) {
  return request("get", `${ROOT}/reports/team/timesheet`, {
    query,
    fallback: "Failed to load the timesheet",
  }).then((body) => (Array.isArray(body.data) ? body.data : []));
}

export function getTeamTaskReport(query) {
  return request("get", `${ROOT}/reports/team/tasks`, {
    query,
    fallback: "Failed to load the task report",
  }).then((body) => ({
    summary: body.data?.summary || {},
    rows: Array.isArray(body.data?.rows) ? body.data.rows : [],
  }));
}

export async function downloadTeamReport(kind, query, filename) {
  const path =
    kind === "timesheet"
      ? `${ROOT}/reports/team/timesheet`
      : `${ROOT}/reports/team/tasks`;
  try {
    const { data } = await api.get(path, {
      params: cleanQuery({ ...query, format: "csv" }),
      responseType: "blob",
    });
    const url = URL.createObjectURL(data);
    const link = document.createElement("a");
    link.href = url;
    link.download = filename;
    link.click();
    URL.revokeObjectURL(url);
  } catch (err) {
    throw toApiError(err, "Failed to export the report");
  }
}
