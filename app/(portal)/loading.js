import { PageLoader } from "@/components/ui/Spinner";

export default function PortalLoading() {
  return (
    <PageLoader
      label="Loading portal"
      hint="Preparing your workspace…"
    />
  );
}
