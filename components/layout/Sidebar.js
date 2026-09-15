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
  BarChart3,
  Settings,
  ChevronDown,
} from "lucide-react";
import { OrdinifyLogo } from "@/components/ui/OrdinifyLogo";
import { useModules } from "@/components/modules/ModulesProvider";
import { ASSET_NAV } from "@/lib/asset-nav";
import { DOCUMENT_TYPES } from "@/lib/document-types";
import { LEAVE_NAV } from "@/lib/leave-nav";
import { PAYSLIP_NAV } from "@/lib/payslip-nav";
import { PROFILE_NAV } from "@/lib/profile-nav";
import { REQUEST_TYPES } from "@/lib/request-types";
import { SETTINGS_NAV } from "@/lib/settings-nav";

const NAV = [
  { href: "/dashboard", label: "Dashboard", icon: LayoutDashboard },
  {
    href: "/profile",
    label: "My Profile",
    icon: UserRound,
    childrenKey: "profile",
  },
  { href: "/attendance", label: "Attendance", icon: CalendarCheck2 },
  { href: "/roster", label: "Shift Roster", icon: CalendarClock },
  {
    href: "/leave",
    label: "Leave",
    icon: Palmtree,
    childrenKey: "leave",
  },
  {
    href: "/requests",
    label: "Requests",
    icon: Inbox,
    childrenKey: "requests",
  },
  {
    href: "/documents",
    label: "Documents",
    icon: FileStack,
    childrenKey: "documents",
  },
  {
    href: "/assets",
    label: "Assets",
    icon: Laptop,
    childrenKey: "assets",
  },
  {
    href: "/payslip",
    label: "Payslip",
    icon: Receipt,
    childrenKey: "payslip",
  },
  { href: "/team", label: "Team", icon: Users },
  { href: "/holidays", label: "Holidays", icon: CalendarDays },
  { href: "/announcements", label: "Announcements", icon: Megaphone },
  { href: "/reports", label: "Reports", icon: BarChart3 },
  {
    href: "/settings",
    label: "Settings",
    icon: Settings,
    childrenKey: "settings",
  },
];

function NavSection({
  href,
  label,
  Icon,
  open,
  setOpen,
  sectionActive,
  collapsed,
  onClose,
  children,
  maxHeightClass = "max-h-[480px]",
}) {
  return (
    <div className="space-y-0.5">
      <button
        type="button"
        tabIndex={collapsed ? -1 : undefined}
        onClick={() => setOpen((v) => !v)}
        className={`relative flex w-full items-center gap-3 rounded-lg px-3 py-2.5 text-left text-[13.5px] font-medium leading-none transition-colors duration-200 ${
          sectionActive
            ? "bg-[var(--lavender-soft)] text-[var(--violet)]"
            : "text-[var(--muted)] hover:bg-[var(--muted-bg)] hover:text-[var(--text)]"
        }`}
      >
        {sectionActive ? (
          <span className="absolute left-0 top-1/2 h-5 w-[3px] -translate-y-1/2 rounded-r bg-[var(--violet)]" />
        ) : null}
        <Icon className="h-[18px] w-[18px] shrink-0" strokeWidth={1.75} />
        <span className="min-w-0 flex-1 truncate">{label}</span>
        <ChevronDown
          className={`h-3.5 w-3.5 shrink-0 opacity-70 transition-transform ${
            open ? "rotate-180" : ""
          }`}
          strokeWidth={2}
        />
      </button>

      <div
        className={`overflow-hidden transition-[max-height,opacity] duration-300 ease-out ${
          open ? `${maxHeightClass} opacity-100` : "max-h-0 opacity-0"
        }`}
      >
        <div className="ml-4 space-y-0.5 border-l border-[var(--border)] pl-2.5">
          {children}
        </div>
      </div>
    </div>
  );
}

function ChildLink({ href, label, icon: ChildIcon, pathname, onClose, collapsed }) {
  const exactOnly = href === "/profile" || href === "/requests";
  const payslipList = href === "/payslip";
  const active = payslipList
    ? pathname === "/payslip" ||
      (Boolean(pathname?.startsWith("/payslip/")) &&
        !pathname.startsWith("/payslip/tax-certificate"))
    : exactOnly
      ? pathname === href
      : pathname === href || pathname?.startsWith(`${href}/`);

  return (
    <Link
      href={href}
      onClick={onClose}
      tabIndex={collapsed ? -1 : undefined}
      className={`flex items-center gap-2 rounded-lg px-2.5 py-1.5 text-[12px] font-medium transition-colors ${
        active
          ? "bg-[var(--lavender-soft)] text-[var(--violet)]"
          : "text-[var(--muted)] hover:bg-[var(--muted-bg)] hover:text-[var(--text)]"
      }`}
    >
      {ChildIcon ? (
        <ChildIcon className="h-3.5 w-3.5 shrink-0 opacity-80" />
      ) : null}
      <span className="truncate">{label}</span>
    </Link>
  );
}

export function Sidebar({ open, onClose, collapsed }) {
  const pathname = usePathname();
  const {
    canAccessRoute,
    canShowRequestTile,
    canShowDocumentTile,
    canShowAssetTile,
    canShowLeaveTile,
    canShowPayslipTile,
    loading,
  } = useModules();
  const [profileOpen, setProfileOpen] = useState(false);
  const [leaveOpen, setLeaveOpen] = useState(false);
  const [requestsOpen, setRequestsOpen] = useState(false);
  const [documentsOpen, setDocumentsOpen] = useState(false);
  const [assetsOpen, setAssetsOpen] = useState(false);
  const [payslipOpen, setPayslipOpen] = useState(false);
  const [settingsOpen, setSettingsOpen] = useState(false);

  const leaveChildren = useMemo(
    () =>
      LEAVE_NAV.filter((item) => canShowLeaveTile(item.key)).map((item) => ({
        href: item.href,
        label: item.title,
        icon: item.icon,
      })),
    [canShowLeaveTile]
  );

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

  const documentChildren = useMemo(
    () =>
      DOCUMENT_TYPES.filter((item) => canShowDocumentTile(item.key)).map(
        (item) => ({
          href: item.href,
          label: item.title,
          icon: item.icon,
        })
      ),
    [canShowDocumentTile]
  );

  const assetChildren = useMemo(
    () =>
      ASSET_NAV.filter((item) => canShowAssetTile(item.key)).map((item) => ({
        href: item.href,
        label: item.title,
        icon: item.icon,
      })),
    [canShowAssetTile]
  );

  const payslipChildren = useMemo(
    () =>
      PAYSLIP_NAV.filter((item) => canShowPayslipTile(item.key)).map((item) => ({
        href: item.href,
        label: item.title,
        icon: item.icon,
      })),
    [canShowPayslipTile]
  );

  const profileChildren = useMemo(
    () =>
      PROFILE_NAV.map((item) => ({
        href: item.href,
        label: item.title,
        icon: item.icon,
      })),
    []
  );

  const settingsChildren = useMemo(
    () =>
      SETTINGS_NAV.filter((item) => canAccessRoute(item.href)).map((item) => ({
        href: item.href,
        label: item.title,
        icon: item.icon,
      })),
    [canAccessRoute]
  );

  useEffect(() => {
    queueMicrotask(() => {
      if (pathname?.startsWith("/profile")) setProfileOpen(true);
      if (pathname?.startsWith("/leave")) setLeaveOpen(true);
      if (pathname?.startsWith("/requests")) setRequestsOpen(true);
      if (pathname?.startsWith("/documents")) setDocumentsOpen(true);
      if (pathname?.startsWith("/assets")) setAssetsOpen(true);
      if (pathname?.startsWith("/payslip")) setPayslipOpen(true);
      if (pathname?.startsWith("/settings")) setSettingsOpen(true);
    });
  }, [pathname]);

  const items = NAV.filter((item) => {
    if (loading && !canAccessRoute(item.href)) {
      return item.href === "/dashboard" || item.href === "/profile";
    }
    if (item.childrenKey === "leave") {
      return leaveChildren.length > 0 || canAccessRoute("/leave");
    }
    if (item.childrenKey === "requests") {
      return requestChildren.length > 0 || canAccessRoute("/requests");
    }
    if (item.childrenKey === "documents") {
      return documentChildren.length > 0 || canAccessRoute("/documents");
    }
    if (item.childrenKey === "assets") {
      return assetChildren.length > 0 || canAccessRoute("/assets");
    }
    if (item.childrenKey === "payslip") {
      return payslipChildren.length > 0 || canAccessRoute("/payslip");
    }
    if (item.childrenKey === "profile") {
      return true;
    }
    if (item.childrenKey === "settings") {
      return settingsChildren.length > 0 || canAccessRoute("/settings");
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
            if (childrenKey === "profile") {
              return (
                <NavSection
                  key={href}
                  href={href}
                  label={label}
                  Icon={Icon}
                  open={profileOpen}
                  setOpen={setProfileOpen}
                  sectionActive={pathname?.startsWith("/profile")}
                  collapsed={collapsed}
                  onClose={onClose}
                  maxHeightClass="max-h-[240px]"
                >
                  {profileChildren.map((child) => (
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

            if (childrenKey === "leave") {
              return (
                <NavSection
                  key={href}
                  href={href}
                  label={label}
                  Icon={Icon}
                  open={leaveOpen}
                  setOpen={setLeaveOpen}
                  sectionActive={pathname?.startsWith("/leave")}
                  collapsed={collapsed}
                  onClose={onClose}
                  maxHeightClass="max-h-[280px]"
                >
                  {leaveChildren.map((child) => (
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

            if (childrenKey === "requests") {
              return (
                <NavSection
                  key={href}
                  href={href}
                  label={label}
                  Icon={Icon}
                  open={requestsOpen}
                  setOpen={setRequestsOpen}
                  sectionActive={pathname?.startsWith("/requests")}
                  collapsed={collapsed}
                  onClose={onClose}
                >
                  <ChildLink
                    href="/requests"
                    label="All requests"
                    pathname={pathname}
                    onClose={onClose}
                    collapsed={collapsed}
                  />
                  {requestChildren.map((child) => (
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

            if (childrenKey === "documents") {
              return (
                <NavSection
                  key={href}
                  href={href}
                  label={label}
                  Icon={Icon}
                  open={documentsOpen}
                  setOpen={setDocumentsOpen}
                  sectionActive={pathname?.startsWith("/documents")}
                  collapsed={collapsed}
                  onClose={onClose}
                  maxHeightClass="max-h-[240px]"
                >
                  {documentChildren.map((child) => (
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

            if (childrenKey === "assets") {
              return (
                <NavSection
                  key={href}
                  href={href}
                  label={label}
                  Icon={Icon}
                  open={assetsOpen}
                  setOpen={setAssetsOpen}
                  sectionActive={pathname?.startsWith("/assets")}
                  collapsed={collapsed}
                  onClose={onClose}
                  maxHeightClass="max-h-[240px]"
                >
                  {assetChildren.map((child) => (
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

            if (childrenKey === "payslip") {
              return (
                <NavSection
                  key={href}
                  href={href}
                  label={label}
                  Icon={Icon}
                  open={payslipOpen}
                  setOpen={setPayslipOpen}
                  sectionActive={pathname?.startsWith("/payslip")}
                  collapsed={collapsed}
                  onClose={onClose}
                  maxHeightClass="max-h-[200px]"
                >
                  {payslipChildren.map((child) => (
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

            if (childrenKey === "settings") {
              return (
                <NavSection
                  key={href}
                  href={href}
                  label={label}
                  Icon={Icon}
                  open={settingsOpen}
                  setOpen={setSettingsOpen}
                  sectionActive={pathname?.startsWith("/settings")}
                  collapsed={collapsed}
                  onClose={onClose}
                  maxHeightClass="max-h-[200px]"
                >
                  {settingsChildren.map((child) => (
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
