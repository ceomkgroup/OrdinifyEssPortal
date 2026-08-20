"use client";

import { useEffect } from "react";
import { usePathname, useRouter } from "next/navigation";
import { useModules } from "@/components/modules/ModulesProvider";
import { PageLoader } from "@/components/ui/Spinner";

export function ModuleRouteGuard({ children }) {
  const pathname = usePathname();
  const router = useRouter();
  const { canAccessRoute, loading, modules } = useModules();

  const allowed = canAccessRoute(pathname);

  useEffect(() => {
    if (loading || !modules) return;
    if (!allowed) {
      router.replace("/dashboard");
    }
  }, [allowed, loading, modules, router]);

  if (loading && !modules) {
    return (
      <PageLoader
        label="Loading modules"
        hint="Checking what is enabled for your company…"
      />
    );
  }

  if (modules && !allowed) {
    return (
      <PageLoader
        compact
        label="Redirecting"
        hint="Taking you back to the dashboard…"
      />
    );
  }

  return children;
}
