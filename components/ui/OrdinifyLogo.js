export function OrdinifyLogo({
  className = "",
  markOnly = false,
  variant = "default",
  size = 36,
}) {
  const isLight = variant === "light";
  const markColor = isLight ? "#ffffff" : "var(--violet)";
  const textColor = isLight ? "text-white" : "text-[var(--deep-purple)]";
  const inner = isLight ? "var(--violet)" : "#ffffff";

  return (
    <div className={`flex items-center gap-2.5 ${className}`}>
      <svg
        width={size}
        height={size}
        viewBox="0 0 64 64"
        fill="none"
        xmlns="http://www.w3.org/2000/svg"
        aria-hidden
      >
        <circle cx="32" cy="32" r="30" fill={markColor} />
        <circle
          cx="32"
          cy="32"
          r="18"
          stroke={inner}
          strokeWidth="2.2"
          fill="none"
          opacity="0.95"
        />
        <circle
          cx="32"
          cy="32"
          r="11"
          stroke={inner}
          strokeWidth="2"
          fill="none"
          opacity="0.85"
        />
        <circle cx="32" cy="26" r="3.2" fill={inner} />
        <path
          d="M32 30.5C27.2 30.5 23.5 34 23.5 38.2V40.5H40.5V38.2C40.5 34 36.8 30.5 32 30.5Z"
          fill={inner}
        />
      </svg>
      {!markOnly ? (
        <span
          className={`font-[family-name:var(--font-heading)] text-xl font-semibold lowercase tracking-tight ${textColor}`}
        >
          ordinify
        </span>
      ) : null}
    </div>
  );
}
