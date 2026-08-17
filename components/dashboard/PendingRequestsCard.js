"use client";

import {
  Banknote,
  BriefcaseBusiness,
  Clock3,
  Coins,
  FileStack,
  Home,
  MoonStar,
  Palmtree,
  RefreshCw,
} from "lucide-react";
import { Card } from "@/components/ui/Card";
import { useModules } from "@/components/modules/ModulesProvider";

const REQUESTS = [
  { key: "leave", label: "Leave", icon: Palmtree, tone: "bg-[var(--info-soft)] text-[var(--info)]" },
  { key: "shiftChange", label: "Shift Change", icon: RefreshCw, tone: "bg-[var(--warning-soft)] text-[var(--warning)]" },
  { key: "wfh", label: "WFH", icon: Home, tone: "bg-[var(--success-soft)] text-[var(--success)]" },
  { key: "onDuty", label: "On Duty", icon: BriefcaseBusiness, tone: "bg-[var(--lavender-soft)] text-[var(--violet)]" },
  { key: "overtime", label: "Overtime", icon: Clock3, tone: "bg-[var(--danger-soft)] text-[var(--danger)]" },
  { key: "compOff", label: "Comp Off", icon: MoonStar, tone: "bg-[var(--info-soft)] text-[var(--info)]" },
  { key: "loans", label: "Loans", icon: Banknote, tone: "bg-[var(--success-soft)] text-[var(--success)]" },
  { key: "advances", label: "Advances", icon: Coins, tone: "bg-[var(--warning-soft)] text-[var(--warning)]" },
  { key: "encashment", label: "Encashment", icon: FileStack, tone: "bg-[var(--lavender-soft)] text-[var(--violet)]" },
];

export function PendingRequestsCard({ pendingRequests }) {
  const { canShowRequestTile } = useModules();

  if (!pendingRequests) return null;

  const tiles = REQUESTS.filter((item) => canShowRequestTile(item.key));
  if (!tiles.length) return null;

  const visibleTotal = tiles.reduce(
    (sum, item) => sum + (Number(pendingRequests[item.key]) || 0),
    0
  );

  return (
    <Card title="Pending Requests" className="h-full" bodyClassName="flex flex-col">
      <div className="grid grid-cols-3 gap-2.5">
        {tiles.map(({ key, label, icon: Icon, tone }) => {
          const count = pendingRequests[key] ?? 0;
          return (
            <div
              key={key}
              className="flex flex-col items-center gap-1.5 rounded-lg bg-[var(--panel-soft)] px-1.5 py-2.5 text-center"
            >
              <span
                className={`flex h-8 w-8 items-center justify-center rounded-full ${tone}`}
              >
                <Icon className="h-3.5 w-3.5" strokeWidth={1.9} />
              </span>
              <p className="text-[10px] leading-tight text-[var(--muted)]">{label}</p>
              <p className="text-[13px] font-bold text-[var(--text)]">{count}</p>
            </div>
          );
        })}
      </div>

      <div className="mt-auto flex items-center justify-between border-t border-[var(--border)] pt-3 text-[13px]">
        <span className="font-medium text-[var(--muted)]">Total</span>
        <span className="font-bold text-[var(--text)]">
          {pendingRequests.total ?? visibleTotal}
        </span>
      </div>
    </Card>
  );
}
