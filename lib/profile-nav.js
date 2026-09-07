import { Pencil, UserRound } from "lucide-react";

/**
 * Profile section children (sidebar submenu), like REQUEST_TYPES / DOCUMENT_TYPES.
 */
export const PROFILE_NAV = [
  {
    key: "overview",
    href: "/profile",
    title: "Overview",
    icon: UserRound,
  },
  {
    key: "edit",
    href: "/profile/edit",
    title: "Edit Profile",
    icon: Pencil,
  },
];

export function getProfileNavByHref(href) {
  return PROFILE_NAV.find((item) => item.href === href) || null;
}
