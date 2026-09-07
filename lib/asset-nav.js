import { AlertTriangle, Laptop, ShieldCheck } from "lucide-react";

/**
 * Assets section children (sidebar submenu).
 * screens: null = always available in ESS.
 */
export const ASSET_NAV = [
  {
    key: "myAssets",
    href: "/assets/my",
    title: "My Assets",
    description: "Assets currently assigned to you.",
    icon: Laptop,
    screens: null,
  },
  {
    key: "verifications",
    href: "/assets/verifications",
    title: "Verifications",
    description: "Confirm or dispute asset verification cycles.",
    icon: ShieldCheck,
    screens: null,
  },
  {
    key: "incidents",
    href: "/assets/incidents",
    title: "Incidents",
    description: "Report and track lost or damaged assets.",
    icon: AlertTriangle,
    screens: null,
  },
];

export function getAssetNavByHref(href) {
  return ASSET_NAV.find((item) => item.href === href) || null;
}

export function getAssetNavByKey(key) {
  return ASSET_NAV.find((item) => item.key === key) || null;
}
