export const TASK_STATUSES = [
  { value: "todo", label: "To-do", color: "#ca8a04" },
  { value: "in_progress", label: "In progress", color: "#7b39ec" },
  { value: "review", label: "Review", color: "#d97706" },
  { value: "blocked", label: "On hold", color: "#dc2626" },
  { value: "done", label: "Completed", color: "#16a34a" },
];

export const TASK_PRIORITIES = [
  { value: "low", label: "Low" },
  { value: "medium", label: "Medium" },
  { value: "high", label: "High" },
  { value: "urgent", label: "Urgent" },
];

export const PROJECT_STATUSES = [
  { value: "active", label: "Active" },
  { value: "completed", label: "Completed" },
  { value: "archived", label: "Archived" },
];

export function statusMeta(value) {
  return (
    TASK_STATUSES.find((item) => item.value === value) || {
      value: value || "todo",
      label: value || "To-do",
      color: "#7b738f",
    }
  );
}

export function priorityLabel(value) {
  return (
    TASK_PRIORITIES.find((item) => item.value === value)?.label ||
    (value ? String(value) : "Medium")
  );
}

export function projectBucket(status) {
  const value = String(status || "active").toLowerCase();
  if (["completed", "done", "complete"].includes(value)) return "completed";
  if (["archived", "archive", "inactive"].includes(value)) return "archived";
  return "active";
}

export function formatTracked(seconds) {
  const total = Number(seconds);
  if (!Number.isFinite(total) || total <= 0) return "—";
  const hours = Math.floor(total / 3600);
  const minutes = Math.floor((total % 3600) / 60);
  if (hours && minutes) return `${hours}h ${minutes}m`;
  if (hours) return `${hours}h`;
  if (minutes) return `${minutes}m`;
  return `${total}s`;
}

export function personName(person) {
  if (!person) return "—";
  if (typeof person === "string") return person;
  const name = [person.firstName, person.lastName].filter(Boolean).join(" ").trim();
  return name || person.employeeName || person.name || person.employeeCode || "—";
}

export function toInputDate(value) {
  if (!value) return "";
  const match = String(value).match(/^(\d{4}-\d{2}-\d{2})/);
  return match ? match[1] : "";
}

export function toIsoDate(value) {
  if (!value) return undefined;
  return `${value}T00:00:00.000Z`;
}

export function isTaskOverdue(task, today = new Date()) {
  if (!task?.dueDate || task.status === "done") return false;
  const due = new Date(task.dueDate);
  if (Number.isNaN(due.getTime())) return false;
  const end = new Date(today);
  end.setHours(0, 0, 0, 0);
  return due < end;
}
