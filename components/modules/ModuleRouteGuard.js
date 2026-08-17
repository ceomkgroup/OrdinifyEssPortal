"use client";

import { useEffect } from "react";
import { usePathname, useRouter } from "next/navigation";
import { useModules } from "@/components/modules/ModulesProvider";
import { Spinner } from "@/components/ui/Spinner";

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
      <div className="flex min-h-[40vh] items-center justify-center">
        <Spinner />
      </div>
    );
  }

  if (modules && !allowed) {
    return (
      <div className="flex min-h-[40vh] items-center justify-center">
        <Spinner />
      </div>
    );
  }

  return children;
}
