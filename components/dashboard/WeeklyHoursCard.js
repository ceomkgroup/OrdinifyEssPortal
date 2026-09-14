"use client";

import {
  Bar,
  BarChart,
  CartesianGrid,
  Tooltip,
  XAxis,
  YAxis,
} from "recharts";
import { Card } from "@/components/ui/Card";
import { ChartContainer } from "@/components/ui/ChartContainer";

const MONTHS = [
  "Jan",
  "Feb",
  "Mar",
  "Apr",
  "May",
  "Jun",
  "Jul",
  "Aug",
  "Sep",
  "Oct",
  "Nov",
  "Dec",
];

function dayLabel(dateStr) {
  if (!dateStr) return "";
  const match = String(dateStr).match(/^(\d{4})-(\d{2})-(\d{2})/);
  if (match) {
    const day = match[3];
    const monthIndex = Number(match[2]) - 1;
    return `${day} ${MONTHS[monthIndex] || ""}`;
  }
  const d = new Date(dateStr);
  if (Number.isNaN(d.getTime())) return dateStr;
  return `${String(d.getDate()).padStart(2, "0")} ${MONTHS[d.getMonth()]}`;
}

export function WeeklyHoursCard({ weekHours = [] }) {
  const data = (weekHours || []).map((day) => ({
    ...day,
    axis: dayLabel(day.date),
  }));

  return (
    <Card title="Weekly Working Hours" className="h-full">
      <ChartContainer height={210} className="min-h-[210px]">
        {({ width, height }) => (
          <BarChart
            width={width}
            height={height}
            data={data}
            margin={{ top: 8, right: 8, left: 0, bottom: 0 }}
          >
            <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#ece8f8" />
            <XAxis
              dataKey="axis"
              interval="preserveStartEnd"
              minTickGap={8}
              tick={{ fill: "#6B7280", fontSize: 10 }}
              axisLine={false}
              tickLine={false}
            />
            <YAxis
              domain={[0, 10]}
              ticks={[0, 2, 4, 6, 8, 10]}
              width={28}
              tick={{ fill: "#6B7280", fontSize: 10 }}
              axisLine={false}
              tickLine={false}
            />
            <Tooltip
              cursor={{ fill: "rgba(123, 57, 236, 0.06)" }}
              contentStyle={{
                borderRadius: 10,
                border: "1px solid #e8e6ef",
                fontSize: 12,
              }}
              formatter={(value) => [`${value}h`, "Hours"]}
            />
            <Bar
              dataKey="hours"
              name="Hours"
              fill="#7b39ec"
              radius={[4, 4, 0, 0]}
              maxBarSize={28}
            />
          </BarChart>
        )}
      </ChartContainer>
    </Card>
  );
}
