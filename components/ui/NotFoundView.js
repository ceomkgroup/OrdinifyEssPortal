"use client";

import Link from "next/link";
import { Compass, Home, SearchX } from "lucide-react";

const primaryBtn =
  "inline-flex h-10 items-center justify-center gap-2 rounded-xl border border-transparent bg-[var(--btn-primary-bg)] px-5 text-sm font-semibold text-[var(--btn-primary-text)] transition hover:brightness-110";
const outlineBtn =
  "inline-flex h-10 items-center justify-center gap-2 rounded-xl border border-[var(--btn-outline-border)] bg-[var(--surface)] px-5 text-sm font-semibold text-[var(--btn-outline-text)] transition hover:bg-[var(--lavender-soft)]";

/**
 * Stylish 404 panel — works inside portal shell or standalone.
 */
export function NotFoundView({
  code = "404",
  title = "Page not found",
  description = "This link is broken or the page moved. Head back to a safe place in the portal.",
  primaryHref = "/dashboard",
  primaryLabel = "Go to dashboard",
  secondaryHref = "/requests",
  secondaryLabel = "All requests",
  standalone = false,
}) {
  const panel = (
    <div className="relative flex min-h-[min(58vh,560px)] w-full flex-col items-center justify-center overflow-hidden rounded-2xl border border-dashed border-[var(--violet)]/30 bg-gradient-to-br from-[var(--lavender-soft)] via-[var(--surface)] to-[var(--violet-soft)] px-6 py-12 text-center shadow-[var(--card-shadow)]">
      <div className="pointer-events-none absolute -right-20 -top-24 h-56 w-56 rounded-full bg-[var(--lavender)]/25 blur-3xl" />
      <div className="pointer-events-none absolute -bottom-28 -left-16 h-52 w-52 rounded-full bg-[var(--violet)]/15 blur-3xl" />

      <div className="relative">
        <p className="font-[family-name:var(--font-heading)] text-[64px] font-bold leading-none tracking-tight text-[var(--violet)]/20 md:text-[80px]">
          {code}
        </p>

        <div className="-mt-6 mx-auto flex h-16 w-16 items-center justify-center rounded-2xl bg-[var(--violet)] text-white shadow-[0_12px_30px_rgba(123,57,236,0.28)]">
          <SearchX className="h-8 w-8" strokeWidth={1.5} />
        </div>

        <h1 className="heading-page mt-5">
          {title}
        </h1>
        <p className="mx-auto mt-2 max-w-md text-[13px] leading-relaxed text-[var(--muted)]">
          {description}
        </p>

        <div className="mt-6 flex flex-wrap items-center justify-center gap-2">
          <Link href={primaryHref} className={primaryBtn}>
            <Home className="h-4 w-4" />
            {primaryLabel}
          </Link>
          {secondaryHref ? (
            <Link href={secondaryHref} className={outlineBtn}>
              <Compass className="h-4 w-4" />
              {secondaryLabel}
            </Link>
          ) : null}
        </div>
      </div>
    </div>
  );

  if (!standalone) return panel;

  return (
    <div className="flex min-h-screen items-center justify-center bg-[var(--background)] p-4 md:p-6">
      <div className="w-full max-w-xl">
        <div className="mb-4 text-center">
          <p className="font-[family-name:var(--font-heading)] text-[15px] font-semibold tracking-wide text-[var(--violet)]">
            Ordinify
          </p>
          <p className="text-[12px] text-[var(--muted)]">Employee portal</p>
        </div>
        {panel}
      </div>
    </div>
  );
}
