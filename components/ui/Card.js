export function Card({ title, action, children, className = "", bodyClassName = "", ...rest }) {
  return (
    <section
      className={`flex h-full flex-col rounded-[var(--card-radius)] border border-[var(--border)] bg-[var(--surface)] p-4 shadow-[var(--card-shadow)] md:p-5 ${className}`}
      {...rest}
    >
      {(title || action) && (
        <div className="mb-3.5 flex items-center justify-between gap-3">
          {title ? (
            <h3 className="heading-card">
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
