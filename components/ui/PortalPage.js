"use client";

import { FlashBanner } from "@/components/ui/FlashBanner";
import { PageHeader } from "@/components/ui/PageHeader";

/**
 * Attendance-style portal page shell:
 * title + subtitle | actions, then gap-5 content stack.
 *
 * fill: one viewport, no page scroll. The table panel (`data-fill-panel`)
 * grows and scrolls internally.
 */
export function PortalPage({
  title,
  subtitle,
  actions,
  error,
  hideHeader = false,
  fill = false,
  className = "",
  children,
}) {
  return (
    <div
      className={`flex w-full flex-col gap-5 ${
        fill
          ? "h-full min-h-0 flex-1 overflow-hidden [&>*]:shrink-0 [&>[data-fill-panel]]:min-h-[180px] [&>[data-fill-panel]]:flex-1 [&>[data-fill-panel]]:shrink"
          : ""
      } ${className}`}
    >
      {!hideHeader ? (
        <PageHeader title={title} subtitle={subtitle} actions={actions} />
      ) : null}
      {error ? (
        <FlashBanner
          message={error}
          tone="danger"
          duration={5000}
          autoDismiss={false}
        />
      ) : null}
      {children}
    </div>
  );
}
