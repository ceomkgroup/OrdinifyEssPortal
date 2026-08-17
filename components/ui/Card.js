export function Card({ title, action, children, className = "", bodyClassName = "" }) {
  return (
    <section
      className={`flex h-full flex-col rounded-[var(--card-radius)] border border-[var(--border)] bg-[var(--surface)] p-4 shadow-[var(--card-shadow)] md:p-5 ${className}`}
    >
      {(title || action) && (
        <div className="mb-3.5 flex items-center justify-between gap-3">
          {title ? (
            <h3 className="font-[family-name:var(--font-heading)] text-[15px] font-semibold leading-none text-[var(--text)]">
              {title}
            </h3>
          ) : (
            <span />
          )}
          {action}
        </div>
      )}
      <div className={`min-h-0 flex-1 ${bodyClassName}`}>{children}</div>
    </section>
  );
}
