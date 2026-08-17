import { Check, X } from "lucide-react";
import { Card } from "@/components/ui/Card";

const ROWS = [
  { key: "allowBiometricPunch", label: "Biometric Punch" },
  { key: "allowMobilePunch", label: "Mobile Punch" },
  { key: "allowWebPunch", label: "Web Punch" },
  { key: "allowManualPunch", label: "Manual Punch" },
];

export function PunchPermissionsCard({ punchPermissions }) {
  if (!punchPermissions) return null;

  return (
    <Card title="Punch Permissions" className="h-full">
      <ul className="space-y-3.5">
        {ROWS.map(({ key, label }) => {
          const allowed = punchPermissions[key] === true;
          return (
            <li key={key} className="flex items-center justify-between gap-3">
              <span className="text-[13px] text-[var(--text)]">{label}</span>
              {allowed ? (
                <Check
                  className="h-[18px] w-[18px] text-[var(--success)]"
                  strokeWidth={2.6}
                />
              ) : (
                <X
                  className="h-[18px] w-[18px] text-[var(--danger)]"
                  strokeWidth={2.6}
                />
              )}
            </li>
          );
        })}
      </ul>
    </Card>
  );
}
