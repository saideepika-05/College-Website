"use client";

import { Area, AreaChart, Bar, BarChart, XAxis, YAxis } from "recharts";
import {
  ChartContainer,
  ChartTooltip,
  ChartTooltipContent,
  type ChartConfig,
} from "@/components/ui/chart";

function EmptyChart({ message }: { message: string }) {
  return (
    <div className="flex h-[250px] w-full items-center justify-center rounded-lg border border-dashed">
      <p className="text-sm text-muted-foreground">{message}</p>
    </div>
  );
}

function shortDate(date: string) {
  return new Date(`${date}T00:00:00`).toLocaleDateString("en-IN", {
    day: "numeric",
    month: "short",
  });
}

const trendConfig = {
  percentage: { label: "Attendance %", color: "var(--chart-1)" },
} satisfies ChartConfig;

export function AttendanceTrendChart({
  data,
}: {
  data: { date: string; percentage: number; total: number }[];
}) {
  if (data.length === 0) return <EmptyChart message="No attendance data yet" />;
  return (
    <ChartContainer config={trendConfig} className="h-[250px] w-full">
      <AreaChart data={data} margin={{ left: -20, right: 8, top: 8 }}>
        <XAxis
          dataKey="date"
          tickFormatter={shortDate}
          tickLine={false}
          axisLine={false}
          fontSize={11}
        />
        <YAxis
          domain={[0, 100]}
          tickLine={false}
          axisLine={false}
          fontSize={11}
        />
        <ChartTooltip
          content={<ChartTooltipContent labelFormatter={(v) => shortDate(String(v))} />}
        />
        <Area
          dataKey="percentage"
          type="monotone"
          stroke="var(--chart-1)"
          fill="var(--chart-1)"
          fillOpacity={0.2}
          strokeWidth={2}
        />
      </AreaChart>
    </ChartContainer>
  );
}

const barConfig = {
  value: { label: "Count", color: "var(--chart-2)" },
} satisfies ChartConfig;

export function NamedBarChart({
  data,
  color,
}: {
  data: { name: string; value: number }[];
  color?: string;
}) {
  if (data.length === 0) return <EmptyChart message="No data yet" />;
  return (
    <ChartContainer config={barConfig} className="h-[250px] w-full">
      <BarChart data={data} margin={{ left: -20, right: 8, top: 8 }}>
        <XAxis
          dataKey="name"
          tickLine={false}
          axisLine={false}
          fontSize={11}
          interval={0}
          tickFormatter={(v: string) =>
            v.length > 12 ? `${v.slice(0, 11)}…` : v
          }
        />
        <YAxis tickLine={false} axisLine={false} fontSize={11} allowDecimals={false} />
        <ChartTooltip content={<ChartTooltipContent />} />
        <Bar
          dataKey="value"
          fill={color ?? "var(--chart-2)"}
          radius={4}
          maxBarSize={48}
        />
      </BarChart>
    </ChartContainer>
  );
}

const percentConfig = {
  percentage: { label: "Attendance %", color: "var(--chart-3)" },
} satisfies ChartConfig;

export function PercentBarChart({
  data,
}: {
  data: { name: string; percentage: number }[];
}) {
  if (data.length === 0) return <EmptyChart message="No data yet" />;
  return (
    <ChartContainer config={percentConfig} className="h-[250px] w-full">
      <BarChart data={data} margin={{ left: -20, right: 8, top: 8 }}>
        <XAxis
          dataKey="name"
          tickLine={false}
          axisLine={false}
          fontSize={11}
          interval={0}
          tickFormatter={(v: string) =>
            v.length > 12 ? `${v.slice(0, 11)}…` : v
          }
        />
        <YAxis
          domain={[0, 100]}
          tickLine={false}
          axisLine={false}
          fontSize={11}
        />
        <ChartTooltip content={<ChartTooltipContent />} />
        <Bar
          dataKey="percentage"
          fill="var(--chart-3)"
          radius={4}
          maxBarSize={48}
        />
      </BarChart>
    </ChartContainer>
  );
}
