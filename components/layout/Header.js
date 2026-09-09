"use client";

import { useEffect, useRef, useState } from "react";
import Link from "next/link";
import {
  Bell,
  ChevronDown,
  LogOut,
  Moon,
  PanelLeftClose,
  PanelLeftOpen,
  Settings,
  Sun,
  UserRound,
} from "lucide-react";
import { Avatar } from "@/components/ui/Avatar";
import { LogoLoader } from "@/components/ui/Spinner";
import { useAuth } from "@/components/auth/AuthProvider";
import { useFcm } from "@/components/notifications/FcmProvider";
import { NotificationsBell } from "@/components/notifications/NotificationsBell";
import { useTheme } from "@/components/theme/ThemeProvider";
import { getDisplayName } from "@/lib/format";

export function Header({
  employee,
  timezone,
  onMenuClick,
  sidebarCollapsed = false,
  dateFormat = "DD/MM/YYYY",
  timeFormat = "12h",
}) {
  const { logout, authLoading, employee: authEmployee } = useAuth();
  const { permission, enabling, enable } = useFcm();
  const { theme, toggleTheme } = useTheme();
  const [menuOpen, setMenuOpen] = useState(false);
  const [pushMsg, setPushMsg] = useState("");
  const menuRef = useRef(null);

  const profile = employee || authEmployee;
  const displayName = getDisplayName(profile);
  const subtitle =
    profile?.designationName?.trim() ||
    profile?.designation?.trim() ||
    "";

  useEffect(() => {
    function onDocClick(e) {
      if (!menuRef.current?.contains(e.target)) setMenuOpen(false);
    }
    function onEsc(e) {
      if (e.key === "Escape") setMenuOpen(false);
    }
    document.addEventListener("mousedown", onDocClick);
    document.addEventListener("keydown", onEsc);
    return () => {
      document.removeEventListener("mousedown", onDocClick);
      document.removeEventListener("keydown", onEsc);
    };
  }, []);

  return (
    <header className="sticky top-0 z-30 flex h-16 items-center justify-between gap-4 border-b border-[var(--border)] bg-[var(--header-bg)] px-4 backdrop-blur md:px-6">
      <button
        type="button"
        onClick={onMenuClick}
        className="inline-flex h-10 w-10 items-center justify-center rounded-xl border border-[var(--border)] bg-[var(--surface)] text-[var(--text)] transition hover:bg-[var(--lavender-soft)] hover:text-[var(--violet)]"
        aria-label={sidebarCollapsed ? "Open sidebar" : "Close sidebar"}
        title={sidebarCollapsed ? "Open sidebar" : "Close sidebar"}
      >
        {sidebarCollapsed ? (
          <PanelLeftOpen className="h-5 w-5" strokeWidth={1.8} />
        ) : (
          <PanelLeftClose className="h-5 w-5" strokeWidth={1.8} />
        )}
      </button>

      <div className="ml-auto flex items-center gap-2 md:gap-3">
        {timezone ? (
          <button
            type="button"
            className="hidden h-9 items-center gap-1.5 rounded-xl border border-[var(--border)] bg-[var(--surface)] px-3 text-[13px] text-[var(--text)] sm:inline-flex"
          >
            {timezone}
            <ChevronDown className="h-4 w-4 text-[var(--muted)]" />
          </button>
        ) : null}

        <button
          type="button"
          onClick={toggleTheme}
          className="inline-flex h-10 w-10 items-center justify-center rounded-xl border border-[var(--border)] bg-[var(--surface)] text-[var(--text)] transition hover:bg-[var(--lavender-soft)] hover:text-[var(--violet)]"
          aria-label={theme === "dark" ? "Switch to light mode" : "Switch to dark mode"}
          title={theme === "dark" ? "Light mode" : "Dark mode"}
        >
          {theme === "dark" ? (
            <Sun className="h-4 w-4" strokeWidth={1.8} />
          ) : (
            <Moon className="h-4 w-4" strokeWidth={1.8} />
          )}
        </button>

        <NotificationsBell dateFormat={dateFormat} timeFormat={timeFormat} />

        <div className="relative" ref={menuRef}>
          <button
            type="button"
            onClick={() => setMenuOpen((v) => !v)}
            className="flex items-center gap-2.5 rounded-xl border border-[var(--border)] bg-[var(--surface)] py-1 pl-1 pr-2.5 transition hover:border-[var(--lavender)] hover:bg-[var(--lavender-soft)]"
            aria-expanded={menuOpen}
            aria-haspopup="menu"
          >
            <Avatar person={profile} name={displayName} size={34} />
            <div className="hidden max-w-[180px] text-left leading-tight sm:block">
              <p className="truncate text-[13px] font-semibold text-[var(--text)]">
                {displayName || "User"}
              </p>
              {subtitle ? (
                <p className="truncate text-[11px] text-[var(--muted)]">{subtitle}</p>
              ) : null}
            </div>
            <ChevronDown
              className={`h-4 w-4 text-[var(--muted)] transition ${menuOpen ? "rotate-180" : ""}`}
            />
          </button>

          {menuOpen ? (
            <div
              role="menu"
              className="absolute right-0 top-[calc(100%+8px)] z-50 w-56 overflow-hidden rounded-xl border border-[var(--border)] bg-[var(--surface)] shadow-[0_12px_30px_rgba(31,41,55,0.14)]"
            >
              <div className="border-b border-[var(--border)] px-3 py-2.5">
                <p className="truncate text-[13px] font-semibold text-[var(--text)]">
                  {displayName || "User"}
                </p>
                {subtitle ? (
                  <p className="truncate text-[11px] text-[var(--muted)]">{subtitle}</p>
                ) : null}
              </div>

              <Link
                href="/profile"
                role="menuitem"
                onClick={() => setMenuOpen(false)}
                className="flex items-center gap-2.5 px-3 py-2.5 text-[13px] text-[var(--text)] hover:bg-[var(--lavender-soft)] hover:text-[var(--violet)]"
              >
                <UserRound className="h-4 w-4" />
                Profile Settings
              </Link>

              <Link
                href="/settings"
                role="menuitem"
                onClick={() => setMenuOpen(false)}
                className="flex items-center gap-2.5 px-3 py-2.5 text-[13px] text-[var(--text)] hover:bg-[var(--lavender-soft)] hover:text-[var(--violet)]"
              >
                <Settings className="h-4 w-4" />
                Account Settings
              </Link>

              {permission !== "granted" && permission !== "unsupported" ? (
                <button
                  type="button"
                  role="menuitem"
                  disabled={enabling}
                  onClick={async () => {
                    setPushMsg("");
                    try {
                      await enable();
                      setPushMsg("Notifications enabled");
                    } catch (err) {
                      setPushMsg(err?.message || "Could not enable notifications");
                    }
                  }}
                  className="flex w-full items-center gap-2.5 px-3 py-2.5 text-left text-[13px] text-[var(--text)] hover:bg-[var(--lavender-soft)] hover:text-[var(--violet)]"
                >
                  <Bell className="h-4 w-4" />
                  {enabling ? "Enabling…" : "Enable notifications"}
                </button>
              ) : null}

              {pushMsg ? (
                <p className="border-t border-[var(--border)] px-3 py-2 text-[11px] text-[var(--muted)]">
                  {pushMsg}
                </p>
              ) : null}

              <button
                type="button"
                role="menuitem"
                disabled={authLoading}
                onClick={async () => {
                  setMenuOpen(false);
                  await logout();
                }}
                className="flex w-full items-center gap-2.5 border-t border-[var(--border)] px-3 py-2.5 text-left text-[13px] text-[var(--danger)] hover:bg-[var(--danger-soft)]"
              >
                {authLoading ? (
                  <LogoLoader size="xs" />
                ) : (
                  <LogOut className="h-4 w-4" />
                )}
                {authLoading ? "Signing out…" : "Logout"}
              </button>
            </div>
          ) : null}
        </div>
      </div>
    </header>
  );
}
