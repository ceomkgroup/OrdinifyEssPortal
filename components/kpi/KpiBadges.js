"use client";

import { kpiStatusTone, ratingTone } from "@/lib/kpi";

export function RatingPill({ rating }) {
  if (!rating) return <span className="text-[var(--muted)]">—</span>;
  return (
    <span
      className={`inline-flex rounded-full border px-2.5 py-0.5 text-[11px] font-semibold capitalize ${ratingTone(rating)}`}
    >
      {rating}
    </span>
  );
}

export function KpiStatusPill({ status }) {
  if (!status) return <span className="text-[var(--muted)]">—</span>;
  return (
    <span
      className={`inline-flex rounded-full border px-2.5 py-0.5 text-[11px] font-semibold capitalize ${kpiStatusTone(status)}`}
    >
      {status}
    </span>
  );
}

export function SourcePill({ source }) {
  const raw = String(source || "").trim();
  if (!raw) return <span className="text-[var(--muted)]">—</span>;
  return (
    <span className="inline-flex rounded-full border border-[var(--border)] bg-[var(--panel-soft)] px-2.5 py-1 text-[11px] font-semibold capitalize text-[var(--text)]">
      {raw.replace(/_/g, " ")}
    </span>
  );
}
