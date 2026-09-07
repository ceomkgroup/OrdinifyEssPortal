"use client";

import { useEffect } from "react";
import { useRouter } from "next/navigation";
import { PageLoader } from "@/components/ui/Spinner";
import { SETTINGS_NAV } from "@/lib/settings-nav";

export default function SettingsHubPage() {
  const router = useRouter();

  useEffect(() => {
    router.replace(SETTINGS_NAV[0]?.href || "/settings/security");
  }, [router]);

  return <PageLoader label="Loading" hint="Opening settings…" />;
}
