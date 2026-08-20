"use client";

import { useEffect } from "react";
import { X } from "lucide-react";

const TONES = {
  success:
    "border-[var(--success)]/20 bg-[var(--success-soft)] text-[var(--success)]",
  danger:
    "border-[var(--danger)]/20 bg-[var(--danger-soft)] text-[var(--danger)]",
  warning:
    "border-[var(--warning)]/20 bg-[var(--warning-soft)] text-[var(--warning)]",
  info: "border-[var(--info)]/20 bg-[var(--info-soft)] text-[var(--info)]",
};

/**
 * Inline flash / toast banner. Auto-dismisses after `duration` ms (default 4s).
 * Pass autoDismiss={false} for sticky load errors.
 */
export function FlashBanner({
  message,
  tone = "success",
  onDismiss,
  duration = 4000,
  autoDismiss = true,
  className = "",
  compact = false,
}) {
  useEffect(() => {
    if (!message || !autoDismiss || typeof onDismiss !== "function") {
      return undefined;
    }
    const timer = window.setTimeout(() => {
      onDismiss();
    }, duration);
    return () => window.clearTimeout(timer);
    // Restart timer only when the message text changes.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [message, autoDismiss, duration]);

  if (!message) return null;

  return (
    <div
      role="status"
      className={`flex items-start gap-3 rounded-2xl border px-4 py-3 text-sm ${
        compact ? "rounded-lg px-3 py-2 text-[12px]" : ""
      } ${TONES[tone] || TONES.success} ${className}`}
    >
      <p className="min-w-0 flex-1 leading-relaxed">{message}</p>
      {onDismiss ? (
        <button
          type="button"
          aria-label="Dismiss"
          onClick={onDismiss}
          className="mt-0.5 inline-flex h-6 w-6 shrink-0 items-center justify-center rounded-lg opacity-70 transition hover:bg-black/5 hover:opacity-100"
        >
          <X className="h-3.5 w-3.5" />
        </button>
      ) : null}
    </div>
  );
}
