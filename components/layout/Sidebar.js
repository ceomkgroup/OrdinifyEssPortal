"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { useEffect, useMemo, useState } from "react";
import {
  LayoutDashboard,
  UserRound,
  CalendarCheck2,
  CalendarClock,
  Palmtree,
  Inbox,
  FileStack,
  Laptop,
  Receipt,
  Users,
  CalendarDays,
  Megaphone,
  Settings,
  ChevronDown,
  Target,
} from "lucide-react";
import { Avatar } from "@/components/ui/Avatar";
import { OrdinifyLogo } from "@/components/ui/OrdinifyLogo";
import { useAuth } from "@/components/auth/AuthProvider";
import { useAnnouncementsBadge } from "@/components/announcements/AnnouncementsBadgeContext";
import { useModules } from "@/components/modules/ModulesProvider";
import { useTeamOptional } from "@/components/team/TeamCapabilitiesProvider";
import { ASSET_NAV } from "@/lib/asset-nav";
import { DOCUMENT_TYPES } from "@/lib/document-types";
import { getDisplayName } from "@/lib/format";
import { LEAVE_NAV } from "@/lib/leave-nav";
import { PAYSLIP_NAV } from "@/lib/payslip-nav";
import { PROFILE_NAV } from "@/lib/profile-nav";
import { REQUEST_TYPES } from "@/lib/request-types";
import { SETTINGS_NAV } from "@/lib/settings-nav";
import { TEAM_NAV } from "@/lib/team-nav";

const SIDEBAR_W = "w-[256px]";

const NAV_GROUPS = [
  {
    id: "overview",
    label: "Overview",
    items: [{ href: "/dashboard", label: "Dashboard", icon: LayoutDashboard }],
  },
  {
    id: "work",
    label: "My work",
    items: [
      { href: "/profile", label: "My Profile", icon: UserRound, childrenKey: "profile" },
      { href: "/attendance", label: "Attendance", icon: CalendarCheck2 },
      { href: "/roster", label: "Shift Roster", icon: CalendarClock },
      { href: "/leave", label: "Leave", icon: Palmtree, childrenKey: "leave" },
      { href: "/requests", label: "Requests", icon: Inbox, childrenKey: "requests" },
      { href: "/documents", label: "Documents", icon: FileStack, childrenKey: "documents" },
      { href: "/assets", label: "Assets", icon: Laptop, childrenKey: "assets" },
      { href: "/payslip", label: "Payslip", icon: Receipt, childrenKey: "payslip" },
      { href: "/kpi", label: "KPI", icon: Target },
    ],
  },
  {
    id: "team",
    label: "Team",
    items: [{ href: "/team", label: "Team", icon: Users, childrenKey: "team" }],
  },
  {
    id: "company",
    label: "Company",
    items: [
      { href: "/holidays", label: "Holidays", icon: CalendarDays },
      { href: "/announcements", label: "Announcements", icon: Megaphone, badgeKey: "announcements" },
    ],
  },
];

function isTopActive(pathname, href) {
  if (!pathname) return false;
  if (href === "/dashboard") return pathname === "/dashboard";
  if (href === "/kpi") return pathname === "/kpi" || pathname.startsWith("/kpi/");
  return pathname === href || pathname.startsWith(`${href}/`);
}

function isChildActive(pathname, href) {
  if (!pathname) return false;
  const exactOnly =
    href === "/profile" ||
    href === "/requests" ||
    href === "/team" ||
    href === "/settings";
  if (href === "/payslip") {
    return (
      pathname === "/payslip" ||
      (pathname.startsWith("/payslip/") &&
        !pathname.startsWith("/payslip/tax-certificate"))
    );
  }
  if (exactOnly) return pathname === href;
  return pathname === href || pathname.startsWith(`${href}/`);
}

function IconWell({ Icon, active }) {
  return (
    <span
      className={`inline-flex h-7 w-7 shrink-0 items-center justify-center rounded-lg transition-colors ${
        active
          ? "bg-[var(--violet)] text-white shadow-[0_4px_10px_rgba(123,57,236,0.28)]"
          : "bg-[var(--panel-soft)] text-[var(--muted)]"
      }`}
    >
      <Icon className="h-3.5 w-3.5" strokeWidth={1.85} />
    </span>
  );
}

function CountBadge({ count }) {
  const n = Number(count) || 0;
  if (n < 1) return null;
  return (
    <span className="ml-auto inline-flex h-5 min-w-5 items-center justify-center rounded-full bg-[var(--violet)] px-1 text-[10px] font-bold leading-none text-white">
      {n > 99 ? "99+" : n}
    </span>
  );
}

function ChildLink({ href, label, icon: ChildIcon, pathname, onClose, collapsed }) {
  const active = isChildActive(pathname, href);
  return (
    <Link
      href={href}
      onClick={onClose}
      tabIndex={collapsed ? -1 : undefined}
      aria-current={active ? "page" : undefined}
      className={`flex items-center gap-2 rounded-lg px-2 py-1.5 text-[12.5px] font-medium transition-colors ${
        active
          ? "bg-[var(--lavender-soft)] text-[var(--violet)]"
          : "text-[var(--muted)] hover:bg-[var(--muted-bg)] hover:text-[var(--text)]"
      }`}
    >
      {ChildIcon ? (
        <ChildIcon className="h-3.5 w-3.5 shrink-0 opacity-80" strokeWidth={1.85} />
      ) : (
        <span className="h-3.5 w-3.5 shrink-0" />
      )}
      <span className="truncate">{label}</span>
    </Link>
  );
}

function NavSection({
  label,
  Icon,
  open,
  onToggle,
  sectionActive,
  collapsed,
  children,
  maxHeightClass = "max-h-[480px]",
}) {
  return (
    <div>
      <button
        type="button"
        tabIndex={collapsed ? -1 : undefined}
        onClick={onToggle}
        aria-expanded={open}
        className={`flex w-full items-center gap-2.5 rounded-xl px-2 py-1.5 text-left text-[13px] font-medium leading-none transition-colors duration-200 ${
          sectionActive
            ? "bg-[var(--lavender-soft)] text-[var(--violet)]"
            : "text-[var(--text)] hover:bg-[var(--muted-bg)]"
        }`}
      >
        <IconWell Icon={Icon} active={sectionActive} />
        <span className="min-w-0 flex-1 truncate">{label}</span>
        <ChevronDown
          className={`h-3.5 w-3.5 shrink-0 text-[var(--muted)] transition-transform duration-200 ${
            open ? "rotate-180" : ""
          }`}
          strokeWidth={2}
        />
      </button>
      <div
        className={`grid transition-[grid-template-rows,opacity] duration-300 ease-out ${
          open ? "grid-rows-[1fr] opacity-100" : "grid-rows-[0fr] opacity-0"
        }`}
      >
        <div className="min-h-0 overflow-hidden">
          <div className={`ml-[18px] mt-0.5 space-y-0.5 border-l border-[var(--border)] pl-3 ${maxHeightClass} overflow-y-auto`}>
            {children}
          </div>
        </div>
      </div>
    </div>
  );
}

export function Sidebar({ open, onClose, collapsed, employee }) {
  const pathname = usePathname();
  const { employee: authEmployee } = useAuth();
  const profile = employee || authEmployee;
  const displayName = getDisplayName(profile);
  const roleLabel =
    profile?.designationName?.trim() ||
    profile?.designation?.trim() ||
    profile?.employeeCode ||
    "Employee";
  const { unreadCount } = useAnnouncementsBadge();
  const {
    canAccessRoute,
    canShowRequestTile,
    canShowDocumentTile,
    canShowAssetTile,
    canShowLeaveTile,
    canShowPayslipTile,
    loading,
  } = useModules();
  const team = useTeamOptional();
  const canShowTeam = Boolean(team?.canShowTeam);
  const teamLoading = Boolean(team?.loading);

  const [openKeys, setOpenKeys] = useState({});

  const childrenByKey = useMemo(
    () => ({
      profile: PROFILE_NAV.map((item) => ({
        href: item.href,
        label: item.title,
        icon: item.icon,
      })),
      leave: LEAVE_NAV.filter((item) => canShowLeaveTile(item.key)).map((item) => ({
        href: item.href,
        label: item.title,
        icon: item.icon,
      })),
      requests: [
        { href: "/requests", label: "All requests" },
        ...REQUEST_TYPES.filter((item) => canShowRequestTile(item.key)).map(
          (item) => ({
            href: item.href,
            label: item.title,
            icon: item.icon,
          })
        ),
      ],
      documents: DOCUMENT_TYPES.filter((item) =>
        canShowDocumentTile(item.key)
      ).map((item) => ({
        href: item.href,
        label: item.title,
        icon: item.icon,
      })),
      assets: ASSET_NAV.filter((item) => canShowAssetTile(item.key)).map(
        (item) => ({
          href: item.href,
          label: item.title,
          icon: item.icon,
        })
      ),
      payslip: PAYSLIP_NAV.filter((item) => canShowPayslipTile(item.key)).map(
        (item) => ({
          href: item.href,
          label: item.title,
          icon: item.icon,
        })
      ),
      team: TEAM_NAV.map((item) => ({
        href: item.href,
        label: item.title,
        icon: item.icon,
      })),
      settings: SETTINGS_NAV.filter((item) => canAccessRoute(item.href)).map(
        (item) => ({
          href: item.href,
          label: item.title,
          icon: item.icon,
        })
      ),
    }),
    [
      canAccessRoute,
      canShowAssetTile,
      canShowDocumentTile,
      canShowLeaveTile,
      canShowPayslipTile,
      canShowRequestTile,
    ]
  );

  function itemVisible(item) {
    if (loading && !canAccessRoute(item.href)) {
      return item.href === "/dashboard" || item.href === "/profile";
    }
    if (item.childrenKey === "leave") {
      return childrenByKey.leave.length > 0 || canAccessRoute("/leave");
    }
    if (item.childrenKey === "requests") {
      return childrenByKey.requests.length > 1 || canAccessRoute("/requests");
    }
    if (item.childrenKey === "documents") {
      return childrenByKey.documents.length > 0 || canAccessRoute("/documents");
    }
    if (item.childrenKey === "assets") {
      return childrenByKey.assets.length > 0 || canAccessRoute("/assets");
    }
    if (item.childrenKey === "payslip") {
      return childrenByKey.payslip.length > 0 || canAccessRoute("/payslip");
    }
    if (item.childrenKey === "team") {
      if (teamLoading) return false;
      return canShowTeam;
    }
    if (item.childrenKey === "profile") return true;
    if (item.childrenKey === "settings") {
      return childrenByKey.settings.length > 0 || canAccessRoute("/settings");
    }
    return canAccessRoute(item.href);
  }

  const groups = useMemo(
    () =>
      NAV_GROUPS.map((group) => ({
        ...group,
        items: group.items.filter(itemVisible),
      })).filter((group) => group.items.length > 0),
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [
      loading,
      canAccessRoute,
      canShowTeam,
      teamLoading,
      childrenByKey,
    ]
  );

  const settingsVisible = itemVisible({
    href: "/settings",
    childrenKey: "settings",
  });

  useEffect(() => {
    let alive = true;
    queueMicrotask(() => {
      if (!alive || !pathname) return;
      const next = {};
      if (pathname.startsWith("/profile")) next.profile = true;
      if (pathname.startsWith("/leave")) next.leave = true;
      if (pathname.startsWith("/requests")) next.requests = true;
      if (pathname.startsWith("/documents")) next.documents = true;
      if (pathname.startsWith("/assets")) next.assets = true;
      if (pathname.startsWith("/payslip")) next.payslip = true;
      if (pathname.startsWith("/team")) next.team = true;
      if (pathname.startsWith("/settings")) next.settings = true;
      setOpenKeys((prev) => ({ ...prev, ...next }));
    });
    return () => {
      alive = false;
    };
  }, [pathname]);

  function toggleOpen(key) {
    setOpenKeys((prev) => ({ ...prev, [key]: !prev[key] }));
  }

  function renderItem(item) {
    const children = item.childrenKey
      ? childrenByKey[item.childrenKey] || []
      : [];
    const sectionActive = isTopActive(pathname, item.href);
    const badge =
      item.badgeKey === "announcements" ? unreadCount : 0;

    if (item.childrenKey && children.length) {
      return (
        <NavSection
          key={item.href}
          label={item.label}
          Icon={item.icon}
          open={Boolean(openKeys[item.childrenKey])}
          onToggle={() => toggleOpen(item.childrenKey)}
          sectionActive={sectionActive}
          collapsed={collapsed}
        >
          {children.map((child) => (
            <ChildLink
              key={child.href}
              href={child.href}
              label={child.label}
              icon={child.icon}
              pathname={pathname}
              onClose={onClose}
              collapsed={collapsed}
            />
          ))}
        </NavSection>
      );
    }

    const active = isTopActive(pathname, item.href);
    return (
      <Link
        key={item.href}
        href={item.href}
        onClick={onClose}
        tabIndex={collapsed ? -1 : undefined}
        aria-current={active ? "page" : undefined}
        className={`flex items-center gap-2.5 rounded-xl px-2 py-1.5 text-[13px] font-medium leading-none transition-colors duration-200 ${
          active
            ? "bg-[var(--lavender-soft)] text-[var(--violet)]"
            : "text-[var(--text)] hover:bg-[var(--muted-bg)]"
        }`}
      >
        <IconWell Icon={item.icon} active={active} />
        <span className="min-w-0 flex-1 truncate">{item.label}</span>
        <CountBadge count={badge} />
      </Link>
    );
  }

  return (
    <>
      <div
        className={`fixed inset-0 z-40 bg-black/35 backdrop-blur-[2px] transition-opacity duration-300 ease-out lg:hidden ${
          open ? "opacity-100" : "pointer-events-none opacity-0"
        }`}
        onClick={onClose}
      />

      <aside
        className={[
          "z-50 flex h-screen flex-col overflow-hidden",
          "fixed inset-y-0 left-0 lg:sticky lg:top-0",
          "bg-[var(--surface)]",
          "transition-[width,transform,opacity,border-color] duration-300 ease-[cubic-bezier(0.22,1,0.36,1)]",
          open ? "translate-x-0" : "-translate-x-full lg:translate-x-0",
          collapsed
            ? `${SIDEBAR_W} border-r border-transparent lg:w-0 lg:opacity-0 lg:pointer-events-none`
            : `${SIDEBAR_W} border-r border-[var(--border)] opacity-100`,
        ].join(" ")}
        aria-hidden={collapsed || undefined}
      >
        <div className={`flex h-16 ${SIDEBAR_W} shrink-0 items-center border-b border-[var(--border)] px-4`}>
          <OrdinifyLogo />
        </div>

        <nav className={`sidebar-nav ${SIDEBAR_W} flex-1 space-y-4 overflow-y-auto px-3 py-4`}>
          {groups.map((group) => (
            <div key={group.id} className="space-y-1">
              {group.label ? (
                <p className="px-2 pb-1 text-[10px] font-semibold uppercase tracking-[0.14em] text-[var(--muted)]">
                  {group.label}
                </p>
              ) : null}
              <div className="space-y-0.5">{group.items.map(renderItem)}</div>
            </div>
          ))}
        </nav>

        <div className={`${SIDEBAR_W} shrink-0 space-y-2 border-t border-[var(--border)] bg-[var(--panel-soft)]/50 p-3`}>
          {settingsVisible ? (
            childrenByKey.settings.length ? (
              <NavSection
                label="Settings"
                Icon={Settings}
                open={Boolean(openKeys.settings)}
                onToggle={() => toggleOpen("settings")}
                sectionActive={pathname?.startsWith("/settings")}
                collapsed={collapsed}
                maxHeightClass="max-h-[160px]"
              >
                {childrenByKey.settings.map((child) => (
                  <ChildLink
                    key={child.href}
                    href={child.href}
                    label={child.label}
                    icon={child.icon}
                    pathname={pathname}
                    onClose={onClose}
                    collapsed={collapsed}
                  />
                ))}
              </NavSection>
            ) : (
              <Link
                href="/settings"
                onClick={onClose}
                tabIndex={collapsed ? -1 : undefined}
                className={`flex items-center gap-2.5 rounded-xl px-2 py-1.5 text-[13px] font-medium ${
                  pathname?.startsWith("/settings")
                    ? "bg-[var(--lavender-soft)] text-[var(--violet)]"
                    : "text-[var(--text)] hover:bg-[var(--muted-bg)]"
                }`}
              >
                <IconWell
                  Icon={Settings}
                  active={Boolean(pathname?.startsWith("/settings"))}
                />
                Settings
              </Link>
            )
          ) : null}

          <Link
            href="/profile"
            onClick={onClose}
            tabIndex={collapsed ? -1 : undefined}
            className="flex items-center gap-2.5 rounded-xl border border-[var(--border)] bg-[var(--surface)] px-2 py-2 transition hover:border-[var(--violet)]/30 hover:bg-[var(--lavender-soft)]"
          >
            <Avatar person={profile} name={displayName} size={32} />
            <div className="min-w-0 flex-1">
              <p className="truncate text-[12.5px] font-semibold text-[var(--text)]">
                {displayName || "My account"}
              </p>
              <p className="truncate text-[11px] text-[var(--muted)]">{roleLabel}</p>
            </div>
          </Link>
        </div>
      </aside>
    </>
  );
}
