"use client";

import { useEffect, useRef, useState } from "react";
import { createPortal } from "react-dom";
import { MoreVertical } from "lucide-react";

export function TeamRowMenu({ menuId, items = [] }) {
  const [open, setOpen] = useState(false);
  const [coords, setCoords] = useState({ top: 0, left: 0 });
  const buttonRef = useRef(null);
  const id = String(menuId || "row");

  useEffect(() => {
    if (!open) return undefined;

    function placeMenu() {
      const rect = buttonRef.current?.getBoundingClientRect();
      if (!rect) return;
      const menuWidth = 220;
      const left = Math.min(
        Math.max(8, rect.right - menuWidth),
        window.innerWidth - menuWidth - 8
      );
      setCoords({ top: rect.bottom + 6, left });
    }

    placeMenu();

    function onDocClick(event) {
      if (
        buttonRef.current?.contains(event.target) ||
        event.target.closest?.(`[data-team-row-menu="${id}"]`)
      ) {
        return;
      }
      setOpen(false);
    }

    document.addEventListener("mousedown", onDocClick);
    window.addEventListener("resize", placeMenu);
    window.addEventListener("scroll", placeMenu, true);
    return () => {
      document.removeEventListener("mousedown", onDocClick);
      window.removeEventListener("resize", placeMenu);
      window.removeEventListener("scroll", placeMenu, true);
    };
  }, [open, id]);

  if (!items.length) return null;

  return (
    <>
      <button
        ref={buttonRef}
        type="button"
        className="inline-flex h-8 w-8 items-center justify-center rounded-lg border border-[var(--border)] bg-[var(--surface)] text-[var(--muted)] transition hover:bg-[var(--panel-soft)] hover:text-[var(--text)]"
        aria-label="Row actions"
        aria-expanded={open}
        onClick={(event) => {
          event.stopPropagation();
          setOpen((v) => !v);
        }}
      >
        <MoreVertical className="h-4 w-4" />
      </button>
      {open && typeof document !== "undefined"
        ? createPortal(
            <div
              data-team-row-menu={id}
              className="fixed z-[9999] w-[220px] overflow-hidden rounded-xl border border-[var(--border)] bg-[var(--surface)] shadow-[0_12px_32px_rgba(15,23,42,0.18)]"
              style={{ top: coords.top, left: coords.left }}
            >
              {items.map((item) => (
                <button
                  key={item.label}
                  type="button"
                  className={`flex w-full items-center gap-2 px-3 py-2.5 text-left text-[13px] font-semibold hover:bg-[var(--panel-soft)] ${
                    item.tone === "danger"
                      ? "text-[var(--danger)] hover:bg-[var(--danger-soft)]"
                      : item.tone === "success"
                        ? "text-[var(--success)] hover:bg-[var(--success-soft)]"
                        : "text-[var(--text)]"
                  }`}
                  onClick={() => {
                    setOpen(false);
                    item.onClick?.();
                  }}
                >
                  {item.icon}
                  {item.label}
                </button>
              ))}
            </div>,
            document.body
          )
        : null}
    </>
  );
}
