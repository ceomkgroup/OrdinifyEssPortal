"use client";

import { useParams } from "next/navigation";
import { PayslipDetailView } from "@/components/payslip/PayslipDetailView";
import { useModules } from "@/components/modules/ModulesProvider";
import { ComingSoon } from "@/components/ui/ComingSoon";
import { PageLoader } from "@/components/ui/Spinner";

export default function PayslipDetailPage() {
  const params = useParams();
  const payslipId = String(params?.payslipId || "");
  const { canAccessRoute, loading } = useModules();

  if (loading) {
    return (
      <PageLoader label="Loading payslip" hint="Checking payroll module access…" />
    );
  }

  if (!canAccessRoute("/payslip")) {
    return (
      <ComingSoon
        title="Payslip"
        description="Payroll is not enabled for your company yet."
      />
    );
  }

  return <PayslipDetailView payslipId={payslipId} />;
}
