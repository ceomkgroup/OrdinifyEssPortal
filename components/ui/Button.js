const variants = {
  primary:
    "border border-transparent bg-[var(--btn-primary-bg)] text-[var(--btn-primary-text)] hover:brightness-110 disabled:opacity-60",
  outline:
    "border border-[var(--btn-outline-border)] bg-[var(--surface)] text-[var(--btn-outline-text)] hover:bg-[var(--lavender-soft)]",
  ghost:
    "border border-transparent bg-transparent text-[var(--btn-outline-text)] hover:bg-[var(--lavender-soft)]",
};

export function Button({
  children,
  variant = "primary",
  className = "",
  disabled,
  type = "button",
  ...props
}) {
  return (
    <button
      type={type}
      disabled={disabled}
      className={`inline-flex items-center justify-center gap-2 rounded-lg px-4 py-2.5 text-sm font-semibold transition disabled:cursor-not-allowed disabled:opacity-60 ${variants[variant]} ${className}`}
      {...props}
    >
      {children}
    </button>
  );
}
