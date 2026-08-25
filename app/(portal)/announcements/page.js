"use client";

import { AnnouncementsView } from "@/components/announcements/AnnouncementsView";
import { useModules } from "@/components/modules/ModulesProvider";
import { ComingSoon } from "@/components/ui/ComingSoon";
import { PageLoader } from "@/components/ui/Spinner";
import { useCompanySettings } from "@/hooks/useCompanySettings";

export default function AnnouncementsPage() {
  const { canAccessRoute, loading } = useModules();
  const { settings } = useCompanySettings();

  if (loading) {
    return (
      <PageLoader label="Loading" hint="Checking announcements access…" />
    );
  }

  if (!canAccessRoute("/announcements")) {
    return (
      <ComingSoon
        title="Announcements"
        description="Announcements are not enabled for your company."
      />
    );
  }

  return (
    <AnnouncementsView
      dateFormat={settings.dateFormat || "DD/MM/YYYY"}
      timeFormat={settings.timeFormat || "12h"}
    />
  );
}
