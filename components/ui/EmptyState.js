export function EmptyState({ icon: Icon, title, description, className = "" }) {
  return (
    <div
      className={`flex flex-col items-center justify-center gap-2 py-8 text-center ${className}`}
    >
      {Icon ? (
        <Icon className="h-10 w-10 text-[var(--muted)]" strokeWidth={1.4} />
      ) : null}
      {title ? (
        <p className="text-sm font-medium text-[var(--muted)]">{title}</p>
      ) : null}
      {description ? (
        <p className="text-xs text-[var(--muted)]">{description}</p>
      ) : null}
    </div>
  );
}
