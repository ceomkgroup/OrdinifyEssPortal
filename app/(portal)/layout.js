"use client";

import { PortalShell } from "@/components/layout/PortalShell";
import { ModulesProvider } from "@/components/modules/ModulesProvider";
import { ModuleRouteGuard } from "@/components/modules/ModuleRouteGuard";
import { FcmProvider } from "@/components/notifications/FcmProvider";
import { useAuth } from "@/components/auth/AuthProvider";

export default function PortalLayout({ children }) {
  const { employee } = useAuth();

  return (
    <ModulesProvider>
      <FcmProvider>
        <PortalShell employee={employee}>
          <ModuleRouteGuard>{children}</ModuleRouteGuard>
        </PortalShell>
      </FcmProvider>
    </ModulesProvider>
  );
}
