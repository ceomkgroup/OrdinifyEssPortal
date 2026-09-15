"use client";

import { TaxCertificateView } from "@/components/payslip/TaxCertificateView";
import { useModules } from "@/components/modules/ModulesProvider";
import { ComingSoon } from "@/components/ui/ComingSoon";
import { PageLoader } from "@/components/ui/Spinner";

export default function TaxCertificatePage() {
  const { canAccessRoute, loading } = useModules();

  if (loading) {
    return (
      <PageLoader
        label="Loading tax certificate"
        hint="Checking payroll module access…"
      />
    );
  }

  if (!canAccessRoute("/payslip/tax-certificate")) {
    return (
      <ComingSoon
        title="Tax Certificate"
        description="Payroll is not enabled for your company yet."
      />
    );
  }

  return <TaxCertificateView />;
}
