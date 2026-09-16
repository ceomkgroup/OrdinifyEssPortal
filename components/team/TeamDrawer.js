"use client";

import { Avatar } from "@/components/ui/Avatar";

export function PersonHero({ person, badge, meta }) {
  if (!person) return null;
  const name = person.employeeName || person.name || "—";
  const code = person.employeeCode || person.code || "";
  const extra = [person.designation, meta].filter(Boolean).join(" · ");

  return (
    <div className="flex items-start gap-3 rounded-2xl border border-[var(--border)] bg-gradient-to-br from-[var(--lavender-soft)]/70 via-[var(--surface)] to-[var(--surface)] px-4 py-3.5">
      <Avatar name={name} person={person} src={person.photoUrl} size={48} />
      <div className="min-w-0 flex-1">
        <p className="truncate text-[15px] font-semibold text-[var(--text)]">
          {name}
        </p>
        <p className="mt-0.5 text-[12px] text-[var(--muted)]">
          {code ? <span className="tabular-nums">{code}</span> : null}
          {code && extra ? " · " : null}
          {extra || (!code ? "Team member" : "")}
        </p>
        {badge ? <div className="mt-2">{badge}</div> : null}
      </div>
    </div>
  );
}

export function SectionCard({ kicker, title, children }) {
  return (
    <section className="rounded-2xl border border-[var(--border)] bg-[var(--surface)] p-4 shadow-[var(--card-shadow)]">
      {kicker || title ? (
        <div className="mb-3 border-b border-[var(--border)] pb-2.5">
          {kicker ? (
            <p className="text-[11px] font-semibold uppercase tracking-wide text-[var(--muted)]">
              {kicker}
            </p>
          ) : null}
          {title ? (
            <h3 className="mt-0.5 text-[14px] font-semibold text-[var(--text)]">
              {title}
            </h3>
          ) : null}
        </div>
      ) : null}
      {children}
    </section>
  );
}

export function DetailField({ icon: Icon, label, children, className = "" }) {
  if (children == null || children === "") return null;
  return (
    <div className={`min-w-0 ${className}`}>
      <dt className="inline-flex items-center gap-1.5 text-[11px] font-semibold uppercase tracking-wide text-[var(--muted)]">
        {Icon ? <Icon className="h-3.5 w-3.5 text-[var(--violet)]" /> : null}
        {label}
      </dt>
      <dd className="mt-1.5 text-[13px] font-medium leading-snug text-[var(--text)]">
        {children}
      </dd>
    </div>
  );
}

export function HintBanner({ icon: Icon, children }) {
  return (
    <div className="flex items-start gap-2.5 rounded-2xl border border-dashed border-[var(--border)] bg-[var(--panel-soft)] px-3 py-2.5 text-[12px] leading-relaxed text-[var(--muted)]">
      {Icon ? (
        <Icon className="mt-0.5 h-4 w-4 shrink-0 text-[var(--violet)]" />
      ) : null}
      <div>{children}</div>
    </div>
  );
}

export function FieldBlock({ label, required, hint, children }) {
  return (
    <label className="block min-w-0">
      <span className="text-[12px] font-semibold text-[var(--text)]">
        {label}
        {required ? <span className="text-[var(--danger)]"> *</span> : null}
      </span>
      <div className="mt-1.5">{children}</div>
      {hint ? (
        <p className="mt-1.5 text-[11px] leading-snug text-[var(--muted)]">
          {hint}
        </p>
      ) : null}
    </label>
  );
}
