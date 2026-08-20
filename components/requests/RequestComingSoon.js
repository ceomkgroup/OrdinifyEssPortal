"use client";

import { Construction } from "lucide-react";
import { ComingSoon } from "@/components/ui/ComingSoon";

export function RequestComingSoon({ title, description }) {
  return (
    <ComingSoon
      badge="Coming soon"
      icon={Construction}
      title={title}
      description={
        description ||
        "This request type will follow the same flow as Attendance Change (list, apply drawer, view/cancel). APIs will be wired next."
      }
      primaryHref="/requests"
      primaryLabel="Back to Requests"
      secondaryHref="/dashboard"
      secondaryLabel="Dashboard"
    />
  );
}
