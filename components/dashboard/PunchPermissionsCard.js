import {
  Check,
  Fingerprint,
  MonitorSmartphone,
  PenLine,
  Smartphone,
  X,
} from "lucide-react";
import { Card } from "@/components/ui/Card";

const ROWS = [
  {
    key: "allowBiometricPunch",
    label: "Biometric",
    hint: "Fingerprint / device",
    icon: Fingerprint,
  },
  {
    key: "allowMobilePunch",
    label: "Mobile",
    hint: "Phone app punch",
    icon: Smartphone,
  },
  {
    key: "allowWebPunch",
    label: "Web",
    hint: "Browser portal",
    icon: MonitorSmartphone,
  },
  {
    key: "allowManualPunch",
    label: "Manual",
    hint: "HR / admin entry",
    icon: PenLine,
  },
];

export function PunchPermissionsCard({ punchPermissions }) {
  if (!punchPermissions) return null;

  const allowedCount = ROWS.filter(
    ({ key }) => punchPermissions[key] === true
  ).length;

  return (
    <Card
      title="Punch Permissions"
      className="h-full"
      bodyClassName="flex h-full flex-col"
      action={
        <span className="rounded-full bg-[var(--lavender-soft)] px-2.5 py-1 text-[11px] font-semibold text-[var(--violet)]">
          {allowedCount}/{ROWS.length}
        </span>
      }
    >
      <ul className="flex flex-1 flex-col justify-between gap-2">
        {ROWS.map(({ key, label, hint, icon: Icon }) => {
          const allowed = punchPermissions[key] === true;
          return (
            <li
              key={key}
              className={`flex items-center gap-2.5 rounded-xl border px-2.5 py-2 ${
                allowed
                  ? "border-[var(--success)]/20 bg-[var(--success-soft)]/60"
                  : "border-[var(--border)] bg-[var(--panel-soft)]"
              }`}
            >
              <span
                className={`inline-flex h-8 w-8 shrink-0 items-center justify-center rounded-lg ${
                  allowed
                    ? "bg-[var(--surface)] text-[var(--success)]"
                    : "bg-[var(--surface)] text-[var(--muted)]"
                }`}
              >
                <Icon className="h-3.5 w-3.5" strokeWidth={2} />
              </span>
              <div className="min-w-0 flex-1">
                <p className="text-[12px] font-semibold text-[var(--text)]">
                  {label}
                </p>
                <p className="truncate text-[10px] text-[var(--muted)]">{hint}</p>
              </div>
              {allowed ? (
                <span className="inline-flex h-6 w-6 items-center justify-center rounded-full bg-[var(--success)] text-white">
                  <Check className="h-3.5 w-3.5" strokeWidth={2.8} />
                </span>
              ) : (
                <span className="inline-flex h-6 w-6 items-center justify-center rounded-full bg-[var(--danger-soft)] text-[var(--danger)]">
                  <X className="h-3.5 w-3.5" strokeWidth={2.8} />
                </span>
              )}
            </li>
          );
        })}
      </ul>
    </Card>
  );
}
