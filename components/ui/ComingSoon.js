"use client";

import Link from "next/link";
import { Construction, Sparkles } from "lucide-react";

const primaryBtn =
  "inline-flex h-10 items-center justify-center gap-2 rounded-xl border border-transparent bg-[var(--btn-primary-bg)] px-5 text-sm font-semibold text-[var(--btn-primary-text)] transition hover:brightness-110";
const outlineBtn =
  "inline-flex h-10 items-center justify-center gap-2 rounded-xl border border-[var(--btn-outline-border)] bg-[var(--surface)] px-5 text-sm font-semibold text-[var(--btn-outline-text)] transition hover:bg-[var(--lavender-soft)]";

/**
 * Shared empty / coming-soon panel used across the portal.
 */
export function ComingSoon({
  title = "Coming soon",
  description,
  badge = "In progress",
  icon: Icon = Construction,
  primaryHref = "/dashboard",
  primaryLabel = "Go to dashboard",
  secondaryHref,
  secondaryLabel,
}) {
  return (
    <div className="relative flex min-h-[min(58vh,560px)] w-full flex-col items-center justify-center overflow-hidden rounded-2xl border border-dashed border-[var(--violet)]/30 bg-gradient-to-br from-[var(--lavender-soft)] via-[var(--surface)] to-[var(--violet-soft)] px-6 py-12 text-center shadow-[var(--card-shadow)]">
      <div className="pointer-events-none absolute -right-20 -top-24 h-56 w-56 rounded-full bg-[var(--lavender)]/25 blur-3xl" />
      <div className="pointer-events-none absolute -bottom-28 -left-16 h-52 w-52 rounded-full bg-[var(--violet)]/15 blur-3xl" />
      <div className="pointer-events-none absolute left-1/2 top-10 h-px w-40 -translate-x-1/2 bg-gradient-to-r from-transparent via-[var(--violet)]/35 to-transparent" />

      <div className="relative">
        <span className="inline-flex items-center gap-1.5 rounded-full border border-[var(--violet)]/15 bg-[var(--surface)]/80 px-2.5 py-1 text-[11px] font-semibold text-[var(--violet)] backdrop-blur">
          <Sparkles className="h-3.5 w-3.5" />
          {badge}
        </span>

        <div className="mx-auto mt-5 flex h-16 w-16 items-center justify-center rounded-2xl bg-[var(--violet)] text-white shadow-[0_12px_30px_rgba(123,57,236,0.28)]">
          <Icon className="h-8 w-8" strokeWidth={1.5} />
        </div>

        <h1 className="heading-page mt-5">
          {title}
        </h1>
        <p className="heading-sub mx-auto mt-2 max-w-md leading-relaxed">
          {description ||
            "This screen is on the way. We are wiring it to match the rest of your employee portal."}
        </p>

        <div className="mt-6 flex flex-wrap items-center justify-center gap-2">
          {primaryHref ? (
            <Link href={primaryHref} className={primaryBtn}>
              {primaryLabel}
            </Link>
          ) : null}
          {secondaryHref ? (
            <Link href={secondaryHref} className={outlineBtn}>
              {secondaryLabel || "Go back"}
            </Link>
          ) : null}
        </div>
      </div>
    </div>
  );
}
