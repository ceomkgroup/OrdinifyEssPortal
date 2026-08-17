"use client";

import { Cell, Pie, PieChart } from "recharts";
import { Card } from "@/components/ui/Card";
import { ChartContainer } from "@/components/ui/ChartContainer";

export function LeaveBalanceCard({ leave }) {
  if (!leave) return null;

  const remaining = leave.totalRemaining ?? 0;
  const used = leave.totalUsed ?? 0;
  const remainingTone =
    remaining < 0 ? "text-[var(--danger)]" : "text-[var(--success)]";

  const usedAbs = Math.max(Math.abs(used), 0.01);
  const remainVisual = Math.max(Math.abs(remaining), 0.01);

  const chartData = [
    { name: "Used", value: usedAbs, color: "#ddd6fe" },
    {
      name: "Remaining",
      value: remainVisual,
      color: remaining < 0 ? "#fca5a5" : "#7b39ec",
    },
  ];

  return (
    <Card title="Leave Balance" className="h-full">
      <div className="flex h-full flex-col gap-3 sm:flex-row sm:items-center">
        <div className="relative mx-auto w-[150px] shrink-0">
          <ChartContainer height={150}>
            {({ width, height }) => (
              <PieChart width={width} height={height}>
                <Pie
                  data={chartData}
                  dataKey="value"
                  cx="50%"
                  cy="50%"
                  innerRadius={48}
                  outerRadius={68}
                  startAngle={90}
                  endAngle={-270}
                  paddingAngle={2}
                  stroke="none"
                >
                  {chartData.map((entry) => (
                    <Cell key={entry.name} fill={entry.color} />
                  ))}
                </Pie>
              </PieChart>
            )}
          </ChartContainer>
          <div className="pointer-events-none absolute inset-0 flex flex-col items-center justify-center">
            <p className={`text-[18px] font-bold leading-none ${remainingTone}`}>
              {remaining}
            </p>
            <p className="mt-1 text-[11px] text-[var(--muted)]">Remaining</p>
          </div>
        </div>

        <div className="min-w-0 flex-1">
          {(leave.balances || []).map((row) => (
            <div key={row.leaveTypeId} className="mb-3">
              <div className="mb-2 flex items-center gap-2">
                <span
                  className="h-2.5 w-2.5 rounded-full"
                  style={{ background: row.colorCode || "#dedede" }}
                />
                <p className="text-[13px] font-semibold text-[var(--text)]">
                  {row.leaveTypeName}
                </p>
              </div>

              <div className="flex flex-wrap gap-2">
                <span className="rounded-md bg-[var(--info-soft)] px-2 py-1 text-[11px] font-medium text-[var(--info)]">
                  Allocated ({Number(row.allocated).toFixed(1)})
                </span>
                <span className="rounded-md bg-[var(--warning-soft)] px-2 py-1 text-[11px] font-medium text-[var(--warning)]">
                  Used ({row.used})
                </span>
                <span
                  className={`rounded-md px-2 py-1 text-[11px] font-medium ${
                    row.remaining < 0
                      ? "bg-[var(--danger-soft)] text-[var(--danger)]"
                      : "bg-[var(--success-soft)] text-[var(--success)]"
                  }`}
                >
                  Remaining ({row.remaining})
                </span>
              </div>
            </div>
          ))}

          <div className="mt-2 flex flex-wrap gap-x-5 gap-y-1 border-t border-[var(--border)] pt-3 text-[12px] text-[var(--muted)]">
            <span>
              Total Used: <strong className="text-[var(--text)]">{used}</strong>
            </span>
            <span>
              Total Remaining:{" "}
              <strong className={remainingTone}>{remaining}</strong>
            </span>
          </div>
        </div>
      </div>
    </Card>
  );
}
