const variants = {
  success: "bg-[var(--success-soft)] text-[var(--success)]",
  danger: "bg-[var(--danger-soft)] text-[var(--danger)]",
  primary: "bg-[var(--lavender-soft)] text-[var(--deep-purple)]",
  muted: "bg-[var(--muted-bg)] text-[var(--muted)]",
  violet: "bg-[var(--lavender-soft)] text-[var(--violet)]",
};

export function Badge({ children, variant = "muted", className = "" }) {
  return (
    <span
      className={`inline-flex items-center rounded-md px-2 py-0.5 text-[11px] font-semibold tracking-wide ${variants[variant] || variants.muted} ${className}`}
    >
      {children}
    </span>
  );
}
