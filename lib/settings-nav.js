import { ShieldCheck } from "lucide-react";

/**
 * Settings section children (sidebar submenu), like REQUEST_TYPES.
 */
export const SETTINGS_NAV = [
  {
    key: "security",
    href: "/settings/security",
    title: "Security",
    icon: ShieldCheck,
  },
];

export function getSettingsNavByHref(href) {
  return SETTINGS_NAV.find((item) => item.href === href) || null;
}
