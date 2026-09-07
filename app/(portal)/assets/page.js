"use client";

import { useEffect } from "react";
import { useRouter } from "next/navigation";
import { PageLoader } from "@/components/ui/Spinner";
import { useModules } from "@/components/modules/ModulesProvider";
import { ASSET_NAV } from "@/lib/asset-nav";

export default function AssetsHubPage() {
  const router = useRouter();
  const { canShowAssetTile, loading } = useModules();

  useEffect(() => {
    if (loading) return;
    const first =
      ASSET_NAV.find((item) => canShowAssetTile(item.key)) || ASSET_NAV[0];
    router.replace(first?.href || "/assets/my");
  }, [loading, canShowAssetTile, router]);

  return <PageLoader label="Loading" hint="Opening assets…" />;
}
