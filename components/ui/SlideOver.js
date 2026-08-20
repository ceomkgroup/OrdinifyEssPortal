"use client";

import { useEffect, useState } from "react";
import { createPortal } from "react-dom";
import { X } from "lucide-react";

/**
 * Right-side drawer with smooth open/close transition.
 */
export function SlideOver({ open, title, subtitle, onClose, children, wide }) {
  const [mounted, setMounted] = useState(false);
  const [visible, setVisible] = useState(false);

  useEffect(() => {
    if (typeof document === "undefined") return undefined;

    if (open) {
      setMounted(true);
      const prev = document.body.style.overflow;
      document.body.style.overflow = "hidden";
      const frame = requestAnimationFrame(() => {
        requestAnimationFrame(() => setVisible(true));
      });
      function onKey(e) {
        if (e.key === "Escape") onClose?.();
      }
      window.addEventListener("keydown", onKey);
      return () => {
        cancelAnimationFrame(frame);
        document.body.style.overflow = prev;
        window.removeEventListener("keydown", onKey);
      };
    }

    setVisible(false);
    const timer = window.setTimeout(() => setMounted(false), 280);
    return () => window.clearTimeout(timer);
  }, [open, onClose]);

  if (!mounted || typeof document === "undefined") return null;

  return createPortal(
    <div className="fixed inset-0 z-[80] flex justify-end">
      <button
        type="button"
        aria-label="Close panel"
        className={`absolute inset-0 bg-[rgba(15,10,30,0.45)] backdrop-blur-[2px] transition-opacity ease-out ${
          visible ? "opacity-100" : "opacity-0"
        }`}
        style={{ transitionDuration: "280ms" }}
        onClick={onClose}
      />
      <aside
        className={`relative flex h-full w-full flex-col border-l border-[var(--border)] bg-[var(--surface)] shadow-[-20px_0_60px_rgba(15,23,42,0.18)] transition-transform ease-out will-change-transform ${
          wide ? "max-w-[560px]" : "max-w-[440px]"
        } ${visible ? "translate-x-0" : "translate-x-full"}`}
        style={{
          transitionDuration: "280ms",
          transitionTimingFunction: "cubic-bezier(0.22, 1, 0.36, 1)",
        }}
      >
        <div className="flex items-start justify-between gap-3 border-b border-[var(--border)] px-5 py-4">
          <div className="min-w-0">
            <h2 className="font-[family-name:var(--font-heading)] text-[17px] font-semibold text-[var(--text)]">
              {title}
            </h2>
            {subtitle ? (
              <p className="mt-0.5 text-[12px] text-[var(--muted)]">{subtitle}</p>
            ) : null}
          </div>
          <button
            type="button"
            onClick={onClose}
            className="inline-flex h-9 w-9 shrink-0 items-center justify-center rounded-xl border border-[var(--border)] text-[var(--muted)] transition hover:bg-[var(--panel-soft)] hover:text-[var(--text)]"
          >
            <X className="h-4 w-4" />
          </button>
        </div>
        <div className="min-h-0 flex-1 overflow-y-auto px-5 py-4">{children}</div>
      </aside>
    </div>,
    document.body
  );
}
