"use client";

import { useEffect, useState } from "react";
import { Sidebar } from "@/components/layout/Sidebar";
import { Header } from "@/components/layout/Header";
import { useAuth } from "@/components/auth/AuthProvider";
import { getPortalProfile } from "@/api/portal";
import { AnnouncementsBadgeProvider } from "@/components/announcements/AnnouncementsBadgeContext";
import { NotificationsBadgeProvider } from "@/components/notifications/NotificationsBadgeContext";

function PortalShellInner({ children, employee, companySettings }) {
  const { employee: authEmployee, mergeLocalEmployee } = useAuth();
  const [mobileOpen, setMobileOpen] = useState(false);
  const [desktopCollapsed, setDesktopCollapsed] = useState(false);
  const profile = employee || authEmployee;

  // Keep header name / designation / photo in sync with portal profile.
  // Only when auth cache is incomplete — avoids a profile call on every visit.
  useEffect(() => {
    let alive = true;
    const needsHydrate = !profile?.designationName || !profile?.firstName;

    if (!needsHydrate) return undefined;

    (async () => {
      try {
        const data = await getPortalProfile();
        if (!alive || !data) return;
        mergeLocalEmployee({
          firstName: data.firstName,
          lastName: data.lastName,
          photoUrl: data.photoUrl,
          designationName: data.designationName,
          departmentName: data.departmentName,
          branchName: data.branchName,
          employeeCode: data.employeeCode,
          email: data.email,
          status: data.status,
        });
      } catch {
        // Header can keep cached auth profile.
      }
    })();

    return () => {
      alive = false;
    };
  }, [mergeLocalEmployee, profile?.designationName, profile?.firstName]);

  return (
    <div className="flex h-screen overflow-hidden bg-[var(--background)]">
      <Sidebar
        open={mobileOpen}
        onClose={() => setMobileOpen(false)}
        collapsed={desktopCollapsed}
      />

      <div className="flex min-h-0 min-w-0 flex-1 flex-col overflow-hidden">
        <div className="shrink-0">
          <Header
            employee={profile}
            timezone={companySettings?.timezone}
            sidebarCollapsed={desktopCollapsed}
            dateFormat={companySettings?.dateFormat || "DD/MM/YYYY"}
            timeFormat={companySettings?.timeFormat || "12h"}
            onMenuClick={() => {
              if (typeof window !== "undefined" && window.innerWidth >= 1024) {
                setDesktopCollapsed((value) => !value);
                return;
              }
              setMobileOpen((value) => !value);
            }}
          />
        </div>
        <main className="flex min-h-0 min-w-0 flex-1 flex-col overflow-x-hidden overflow-y-auto p-3 sm:p-4 md:p-5 lg:p-6 [&>[data-portal-fill]]:min-h-0 [&>[data-portal-fill]]:flex-1 [&>[data-portal-fill]]:overflow-hidden">
          {children}
        </main>
      </div>
    </div>
  );
}

export function PortalShell({ children, employee, companySettings }) {
  return (
    <AnnouncementsBadgeProvider>
      <NotificationsBadgeProvider>
        <PortalShellInner employee={employee} companySettings={companySettings}>
          {children}
        </PortalShellInner>
      </NotificationsBadgeProvider>
    </AnnouncementsBadgeProvider>
  );
}
