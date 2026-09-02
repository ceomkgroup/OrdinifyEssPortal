"use client";

import { useEffect } from "react";
import { useRouter } from "next/navigation";
import { useModules } from "@/components/modules/ModulesProvider";
import { PageLoader } from "@/components/ui/Spinner";
import { DOCUMENT_TYPES } from "@/lib/document-types";

export default function DocumentsHubPage() {
  const router = useRouter();
  const { canShowDocumentTile, loading } = useModules();

  useEffect(() => {
    if (loading) return;
    const first =
      DOCUMENT_TYPES.find((item) => canShowDocumentTile(item.key)) ||
      DOCUMENT_TYPES[0];
    router.replace(first?.href || "/documents/my");
  }, [loading, canShowDocumentTile, router]);

  return (
    <PageLoader label="Loading" hint="Opening documents…" />
  );
}
