"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import {
  LayoutDashboard,
  UserRound,
  CalendarCheck2,
  Palmtree,
  Inbox,
  Receipt,
  Users,
  CalendarDays,
  BarChart3,
  Settings,
} from "lucide-react";
import { OrdinifyLogo } from "@/components/ui/OrdinifyLogo";
import { useModules } from "@/components/modules/ModulesProvider";

const NAV = [
  { href: "/dashboard", label: "Dashboard", icon: LayoutDashboard },
  { href: "/profile", label: "My Profile", icon: UserRound },
  { href: "/attendance", label: "Attendance", icon: CalendarCheck2 },
  { href: "/leave", label: "Leave", icon: Palmtree },
  { href: "/requests", label: "Requests", icon: Inbox },
  { href: "/payslip", label: "Payslip", icon: Receipt },
  { href: "/team", label: "Team", icon: Users },
  { href: "/holidays", label: "Holidays", icon: CalendarDays },
  { href: "/reports", label: "Reports", icon: BarChart3 },
  { href: "/settings", label: "Settings", icon: Settings },
];

export function Sidebar({ open, onClose, collapsed }) {
  const pathname = usePathname();
  const { canAccessRoute, loading } = useModules();

  const items = NAV.filter((item) => {
    // While modules load, keep dashboard + profile visible to avoid empty nav flash.
    if (loading && !canAccessRoute(item.href)) {
      return item.href === "/dashboard" || item.href === "/profile";
    }
    return canAccessRoute(item.href);
  });

  return (
    <>
      <div
        className={`fixed inset-0 z-40 bg-black/30 transition-opacity duration-300 ease-out lg:hidden ${
          open ? "opacity-100" : "pointer-events-none opacity-0"
        }`}
        onClick={onClose}
      />

      <aside
        className={[
          "z-50 flex h-screen flex-col overflow-hidden border-[var(--border)] bg-[var(--surface)]",
          "fixed inset-y-0 left-0 lg:sticky lg:top-0",
          "transition-[width,transform,opacity,border-color,padding] duration-300 ease-[cubic-bezier(0.22,1,0.36,1)]",
          open ? "translate-x-0" : "-translate-x-full lg:translate-x-0",
          collapsed
            ? "w-[252px] border-r border-transparent lg:w-0 lg:opacity-0 lg:pointer-events-none"
            : "w-[252px] border-r opacity-100",
        ].join(" ")}
        aria-hidden={collapsed || undefined}
      >
        <div className="flex h-16 w-[252px] shrink-0 items-center border-b border-[var(--border)] px-5">
          <OrdinifyLogo />
        </div>

        <nav className="w-[252px] flex-1 space-y-0.5 overflow-y-auto px-3 py-4">
          {items.map(({ href, label, icon: Icon }) => {
            const active = pathname === href;
            return (
              <Link
                key={href}
                href={href}
                onClick={onClose}
                tabIndex={collapsed ? -1 : undefined}
                className={`relative flex items-center gap-3 rounded-lg px-3 py-2.5 text-[13.5px] font-medium transition-colors duration-200 ${
                  active
                    ? "bg-[var(--lavender-soft)] text-[var(--violet)]"
                    : "text-[var(--muted)] hover:bg-[var(--muted-bg)] hover:text-[var(--text)]"
                }`}
              >
                {active ? (
                  <span className="absolute left-0 top-1/2 h-5 w-[3px] -translate-y-1/2 rounded-r bg-[var(--violet)]" />
                ) : null}
                <Icon className="h-[18px] w-[18px] shrink-0" strokeWidth={1.75} />
                <span className="truncate">{label}</span>
              </Link>
            );
          })}
        </nav>
      </aside>
    </>
  );
}
