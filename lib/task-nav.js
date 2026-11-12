import { FolderKanban, ListTodo } from "lucide-react";

/** My-work task screens. Always available until a company screen key is assigned. */
export const TASK_NAV = [
  {
    key: "my",
    href: "/tasks",
    title: "My tasks",
    description: "Tasks assigned to you.",
    icon: ListTodo,
    screens: null,
  },
  {
    key: "projects",
    href: "/tasks/projects",
    title: "My projects",
    description: "Projects you belong to.",
    icon: FolderKanban,
    screens: null,
  },
];

export function getTaskNavByHref(href) {
  return TASK_NAV.find((item) => item.href === href) || null;
}
