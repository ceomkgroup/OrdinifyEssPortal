import { NotFoundView } from "@/components/ui/NotFoundView";

/** Renders inside the portal shell (sidebar + header). */
export default function PortalNotFound() {
  return (
    <NotFoundView
      title="Page not found"
      description="This portal page doesn’t exist or you don’t have access. Pick a shortcut below."
      primaryHref="/dashboard"
      primaryLabel="Go to dashboard"
      secondaryHref="/requests"
      secondaryLabel="All requests"
    />
  );
}
