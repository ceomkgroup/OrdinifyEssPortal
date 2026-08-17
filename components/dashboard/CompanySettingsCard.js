import { CalendarRange, Clock3, Globe2, Wallet } from "lucide-react";
import { Card } from "@/components/ui/Card";

const ROWS = [
  { key: "timezone", label: "Timezone", icon: Globe2 },
  { key: "timeFormat", label: "Time Format", icon: Clock3 },
  { key: "dateFormat", label: "Date Format", icon: CalendarRange },
  { key: "currency", label: "Currency", icon: Wallet },
];

export function CompanySettingsCard({ companySettings }) {
  if (!companySettings) return null;

  return (
    <Card title="Company Settings" className="h-full">
      <div className="grid grid-cols-2 gap-2.5">
        {ROWS.map(({ key, label, icon: Icon }) => (
          <div
            key={key}
            className="rounded-lg border border-[var(--border)] bg-[var(--panel-soft)] px-3 py-2.5"
          >
            <div className="mb-1.5 flex items-center gap-1.5 text-[var(--violet)]">
              <Icon className="h-3.5 w-3.5" strokeWidth={1.8} />
              <span className="text-[11px] text-[var(--muted)]">{label}</span>
            </div>
            <p className="truncate text-[13px] font-semibold text-[var(--text)]">
              {companySettings[key] || "—"}
            </p>
          </div>
        ))}
      </div>
    </Card>
  );
}
