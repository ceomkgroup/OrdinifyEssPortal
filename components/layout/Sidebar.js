"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { useEffect, useMemo, useState } from "react";
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
  ChevronDown,
} from "lucide-react";
import { OrdinifyLogo } from "@/components/ui/OrdinifyLogo";
import { useModules } from "@/components/modules/ModulesProvider";
import { REQUEST_TYPES } from "@/lib/request-types";

const NAV = [
  { href: "/dashboard", label: "Dashboard", icon: LayoutDashboard },
  { href: "/profile", label: "My Profile", icon: UserRound },
  { href: "/attendance", label: "Attendance", icon: CalendarCheck2 },
  { href: "/leave", label: "Leave", icon: Palmtree },
  {
    href: "/requests",
    label: "Requests",
    icon: Inbox,
    childrenKey: "requests",
  },
  { href: "/payslip", label: "Payslip", icon: Receipt },
  { href: "/team", label: "Team", icon: Users },
  { href: "/holidays", label: "Holidays", icon: CalendarDays },
  { href: "/reports", label: "Reports", icon: BarChart3 },
  { href: "/settings", label: "Settings", icon: Settings },
];

export function Sidebar({ open, onClose, collapsed }) {
  const pathname = usePathname();
  const { canAccessRoute, canShowRequestTile, loading } = useModules();
  const [requestsOpen, setRequestsOpen] = useState(false);

  const requestChildren = useMemo(
    () =>
      REQUEST_TYPES.filter((item) => canShowRequestTile(item.key)).map(
        (item) => ({
          href: item.href,
          label: item.title,
          icon: item.icon,
        })
      ),
    [canShowRequestTile]
  );

  useEffect(() => {
    if (pathname?.startsWith("/requests")) {
      setRequestsOpen(true);
    }
  }, [pathname]);

  const items = NAV.filter((item) => {
    if (loading && !canAccessRoute(item.href)) {
      return item.href === "/dashboard" || item.href === "/profile";
    }
    if (item.childrenKey === "requests") {
      return requestChildren.length > 0 || canAccessRoute("/requests");
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
          {items.map(({ href, label, icon: Icon, childrenKey }) => {
            if (childrenKey === "requests") {
              const sectionActive = pathname?.startsWith("/requests");
              return (
                <div key={href} className="space-y-0.5">
                  <button
                    type="button"
                    tabIndex={collapsed ? -1 : undefined}
                    onClick={() => setRequestsOpen((v) => !v)}
                    className={`relative flex w-full items-center gap-3 rounded-lg px-3 py-2.5 text-left text-[13.5px] font-medium leading-none transition-colors duration-200 ${
                      sectionActive
                        ? "bg-[var(--lavender-soft)] text-[var(--violet)]"
                        : "text-[var(--muted)] hover:bg-[var(--muted-bg)] hover:text-[var(--text)]"
                    }`}
                  >
                    {sectionActive ? (
                      <span className="absolute left-0 top-1/2 h-5 w-[3px] -translate-y-1/2 rounded-r bg-[var(--violet)]" />
                    ) : null}
                    <Icon
                      className="h-[18px] w-[18px] shrink-0"
                      strokeWidth={1.75}
                    />
                    <span className="min-w-0 flex-1 truncate">{label}</span>
                    <ChevronDown
                      className={`h-3.5 w-3.5 shrink-0 opacity-70 transition-transform ${
                        requestsOpen ? "rotate-180" : ""
                      }`}
                      strokeWidth={2}
                    />
                  </button>

                  <div
                    className={`overflow-hidden transition-[max-height,opacity] duration-300 ease-out ${
                      requestsOpen
                        ? "max-h-[480px] opacity-100"
                        : "max-h-0 opacity-0"
                    }`}
                  >
                    <div className="ml-4 space-y-0.5 border-l border-[var(--border)] pl-2.5">
                      <Link
                        href="/requests"
                        onClick={onClose}
                        tabIndex={collapsed ? -1 : undefined}
                        className={`flex items-center rounded-lg px-2.5 py-1.5 text-[12px] font-medium transition-colors ${
                          pathname === "/requests"
                            ? "bg-[var(--lavender-soft)] text-[var(--violet)]"
                            : "text-[var(--muted)] hover:bg-[var(--muted-bg)] hover:text-[var(--text)]"
                        }`}
                      >
                        All requests
                      </Link>
                      {requestChildren.map((child) => {
                        const ChildIcon = child.icon;
                        const active =
                          pathname === child.href ||
                          pathname?.startsWith(`${child.href}/`);
                        return (
                          <Link
                            key={child.href}
                            href={child.href}
                            onClick={onClose}
                            tabIndex={collapsed ? -1 : undefined}
                            className={`flex items-center gap-2 rounded-lg px-2.5 py-1.5 text-[12px] font-medium transition-colors ${
                              active
                                ? "bg-[var(--lavender-soft)] text-[var(--violet)]"
                                : "text-[var(--muted)] hover:bg-[var(--muted-bg)] hover:text-[var(--text)]"
                            }`}
                          >
                            <ChildIcon className="h-3.5 w-3.5 shrink-0 opacity-80" />
                            <span className="truncate">{child.label}</span>
                          </Link>
                        );
                      })}
                    </div>
                  </div>
                </div>
              );
            }

            const active = pathname === href;
            return (
              <Link
                key={href}
                href={href}
                onClick={onClose}
                tabIndex={collapsed ? -1 : undefined}
                className={`relative flex items-center gap-3 rounded-lg px-3 py-2.5 text-[13.5px] font-medium leading-none transition-colors duration-200 ${
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
