// apps/web/components/analytics/revenue-chart.tsx
"use client";

import {
  LineChart,
  Line,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
} from "recharts";
import type { SalesPoint } from "@/types/sales";

const fmtMoney = (n: number) =>
  `$${n.toLocaleString(undefined, { maximumFractionDigits: 2 })}`;

type RevenueChartProps = {
  data: SalesPoint[];
  loading?: boolean;
  error?: string | null;
};

export function RevenueChart({ data, loading, error }: RevenueChartProps) {
  if (loading) {
    return <ChartSkeleton />;
  }

  if (error) {
    return (
      <div className="flex h-80 items-center justify-center rounded-2xl border border-red-200 bg-red-50 px-4 text-sm text-red-700 dark:border-red-900/50 dark:bg-red-950/40">
        {error}
      </div>
    );
  }

  if (!data || data.length === 0) {
    return <Empty />;
  }

  return (
    <div className="h-80 rounded-2xl border border-slate-200 bg-white/80 p-4 shadow-sm dark:border-slate-800 dark:bg-slate-900/60">
      <h2 className="mb-3 text-base font-semibold text-slate-900 dark:text-slate-50">
        Revenue over time
      </h2>
      <div className="h-[260px]">
        <ResponsiveContainer width="100%" height="100%">
          <LineChart data={data} margin={{ top: 10, right: 16, left: 0, bottom: 0 }}>
            <CartesianGrid strokeDasharray="3 3" opacity={0.2} />
            <XAxis
              dataKey="date"
              tick={{ fontSize: 11 }}
              tickMargin={8}
              tickLine={false}
            />
            <YAxis
              tickFormatter={fmtMoney}
              tick={{ fontSize: 11 }}
              width={72}
              tickMargin={4}
            />
            <Tooltip
              formatter={(value: any, name: string) => {
                if (name === "revenue") return [fmtMoney(value as number), "Revenue"];
                if (name === "orders") return [value as number, "Orders"];
                return [value, name];
              }}
              labelFormatter={(label) => `Date: ${label}`}
            />
            <Line
              type="monotone"
              dataKey="revenue"
              stroke="#0ea5e9"
              strokeWidth={2}
              dot={{ r: 2 }}
              activeDot={{ r: 4 }}
              name="Revenue"
            />
            {/* Optional: overlay orders as thin line */}
            <Line
              type="monotone"
              dataKey="orders"
              stroke="#a855f7"
              strokeWidth={1}
              dot={false}
              yAxisId={0}
              name="Orders"
            />
          </LineChart>
        </ResponsiveContainer>
      </div>
    </div>
  );
}

function ChartSkeleton() {
  return (
    <div className="h-80 rounded-2xl border border-slate-200 bg-slate-100/80 shadow-sm dark:border-slate-800 dark:bg-slate-900/40 animate-pulse" />
  );
}

function Empty() {
  return (
    <div className="flex h-80 items-center justify-center rounded-2xl border border-dashed border-slate-200 text-sm text-slate-500 dark:border-slate-700 dark:text-slate-400">
      No data for this range.
    </div>
  );
}
