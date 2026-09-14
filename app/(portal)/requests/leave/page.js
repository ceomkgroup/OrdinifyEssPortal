"use client";

import { useEffect } from "react";
import { useRouter } from "next/navigation";
import { PageLoader } from "@/components/ui/Spinner";

export default function LeaveRequestRedirectPage() {
  const router = useRouter();
  useEffect(() => {
    router.replace("/leave/logs");
  }, [router]);
  return (
    <PageLoader label="Opening leave logs" hint="Taking you to Leave Logs…" />
  );
}
