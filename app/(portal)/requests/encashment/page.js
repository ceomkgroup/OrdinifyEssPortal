"use client";

import { useEffect } from "react";
import { useRouter } from "next/navigation";
import { PageLoader } from "@/components/ui/Spinner";

export default function EncashmentRedirectPage() {
  const router = useRouter();
  useEffect(() => {
    router.replace("/leave/encashment");
  }, [router]);
  return (
    <PageLoader
      label="Opening encashment"
      hint="Taking you to Leave Encashment…"
    />
  );
}
