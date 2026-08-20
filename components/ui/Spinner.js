"use client";

import { OrdinifyLogo } from "@/components/ui/OrdinifyLogo";

const LOGO_LOADER_SIZE = {
  xs: {
    wrap: "h-5 w-5",
    logo: 12,
    disc: "h-3.5 w-3.5",
    inner: "inset-[3px]",
  },
  sm: {
    wrap: "h-10 w-10",
    logo: 20,
    disc: "h-7 w-7",
    inner: "inset-[7px]",
  },
  md: {
    wrap: "h-[76px] w-[76px]",
    logo: 36,
    disc: "h-12 w-12",
    inner: "inset-[12px]",
  },
  lg: {
    wrap: "h-24 w-24",
    logo: 46,
    disc: "h-14 w-14",
    inner: "inset-[14px]",
  },
};

/**
 * Brand loader — Ordinify mark with orbiting rings.
 * Use everywhere loading is shown; pick size for the spot.
 */
export function LogoLoader({ size = "md", className = "" }) {
  const dims = LOGO_LOADER_SIZE[size] || LOGO_LOADER_SIZE.md;

  return (
    <div
      className={`relative inline-flex items-center justify-center ${dims.wrap} ${className}`}
      role="status"
      aria-label="Loading"
    >
      <span
        className="logo-loader-glow absolute inset-0 rounded-full bg-[var(--lavender-soft)]"
        aria-hidden
      />

      <svg
        className="logo-loader-ring absolute inset-0 h-full w-full"
        viewBox="0 0 100 100"
        fill="none"
        aria-hidden
      >
        <circle
          cx="50"
          cy="50"
          r="46"
          stroke="var(--lavender)"
          strokeWidth="1.4"
          strokeDasharray="3.5 5.5"
          opacity="0.5"
        />
        <circle
          cx="50"
          cy="50"
          r="46"
          stroke="var(--violet)"
          strokeWidth="2.6"
          strokeLinecap="round"
          strokeDasharray="30 220"
          opacity="0.95"
        />
      </svg>

      <svg
        className={`logo-loader-ring-rev absolute ${dims.inner} h-auto w-auto`}
        viewBox="0 0 100 100"
        fill="none"
        aria-hidden
      >
        <circle
          cx="50"
          cy="50"
          r="44"
          stroke="var(--lavender)"
          strokeWidth="2.2"
          strokeLinecap="round"
          strokeDasharray="16 150"
          opacity="0.75"
        />
      </svg>

      <div
        className={`relative z-[1] flex items-center justify-center rounded-full bg-[var(--surface)] shadow-[0_6px_20px_rgba(123,57,236,0.2)] ring-1 ring-[var(--border)] ${dims.disc}`}
      >
        <OrdinifyLogo markOnly size={dims.logo} />
      </div>
    </div>
  );
}

/**
 * Alias — same brand loader. Prefer LogoLoader / PageLoader by context.
 * size: sm (inline) · md (section) · lg (hero / full page)
 */
export function Spinner({ className = "", size = "md" }) {
  return <LogoLoader size={size} className={className} />;
}

/**
 * Full-area page / section loader — logo rings + copy.
 */
export function PageLoader({
  label = "Loading",
  hint = "Fetching the latest data for you…",
  className = "",
  compact = false,
}) {
  return (
    <div
      className={`relative flex w-full flex-col items-center justify-center overflow-hidden rounded-2xl border border-dashed border-[var(--violet)]/25 bg-gradient-to-br from-[var(--lavender-soft)] via-[var(--surface)] to-[var(--violet-soft)] text-center shadow-[var(--card-shadow)] ${
        compact
          ? "min-h-[220px] px-5 py-10"
          : "min-h-[min(50vh,480px)] px-6 py-12"
      } ${className}`}
      role="status"
      aria-live="polite"
      aria-busy="true"
    >
      <div className="pointer-events-none absolute -right-16 -top-20 h-48 w-48 rounded-full bg-[var(--lavender)]/20 blur-3xl" />
      <div className="pointer-events-none absolute -bottom-20 -left-12 h-44 w-44 rounded-full bg-[var(--violet)]/12 blur-3xl" />

      <div className="relative flex flex-col items-center">
        <LogoLoader size={compact ? "md" : "lg"} />

        <p className="mt-6 font-[family-name:var(--font-heading)] text-[16px] font-semibold text-[var(--text)]">
          {label}
        </p>
        {hint ? (
          <p className="mt-1.5 max-w-xs text-[12px] leading-relaxed text-[var(--muted)]">
            {hint}
          </p>
        ) : null}
      </div>
    </div>
  );
}

/**
 * Full-screen boot / auth gate — logo only, no card chrome.
 */
export function FullScreenLoader({
  label = "Loading",
  hint = "Starting Ordinify…",
}) {
  return (
    <div
      className="flex min-h-screen flex-col items-center justify-center gap-5 bg-[var(--background)] px-4"
      role="status"
      aria-live="polite"
      aria-busy="true"
    >
      <LogoLoader size="lg" />
      <div className="text-center">
        <p className="font-[family-name:var(--font-heading)] text-[16px] font-semibold text-[var(--text)]">
          {label}
        </p>
        {hint ? (
          <p className="mt-1 text-[12px] text-[var(--muted)]">{hint}</p>
        ) : null}
      </div>
    </div>
  );
}
