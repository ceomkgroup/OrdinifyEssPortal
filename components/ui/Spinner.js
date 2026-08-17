export function Spinner({ className = "" }) {
  return (
    <div
      className={`h-8 w-8 animate-spin rounded-full border-2 border-[var(--lavender)] border-t-[var(--violet)] ${className}`}
      role="status"
      aria-label="Loading"
    />
  );
}
