"use client";

import { useEffect, useState } from "react";
import { Sidebar } from "@/components/layout/Sidebar";
import { Header } from "@/components/layout/Header";
import { useAuth } from "@/components/auth/AuthProvider";
import { getPortalProfile } from "@/api/portal";

export function PortalShell({ children, employee, companySettings }) {
  const { employee: authEmployee, mergeLocalEmployee } = useAuth();
  const [mobileOpen, setMobileOpen] = useState(false);
  const [desktopCollapsed, setDesktopCollapsed] = useState(false);
  const profile = employee || authEmployee;

  // Keep header name / designation / photo in sync with portal profile.
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
    <div className="flex min-h-screen bg-[var(--background)]">
      <Sidebar
        open={mobileOpen}
        onClose={() => setMobileOpen(false)}
        collapsed={desktopCollapsed}
      />

      <div className="flex min-w-0 flex-1 flex-col">
        <Header
          employee={profile}
          timezone={companySettings?.timezone}
          sidebarCollapsed={desktopCollapsed}
          onMenuClick={() => {
            if (typeof window !== "undefined" && window.innerWidth >= 1024) {
              setDesktopCollapsed((value) => !value);
              return;
            }
            setMobileOpen((value) => !value);
          }}
        />
        <main className="min-w-0 flex-1 overflow-x-hidden p-4 md:p-5 lg:p-6">
          {children}
        </main>
      </div>
    </div>
  );
}
