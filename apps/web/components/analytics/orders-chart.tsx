"use client";

import {
  AreaChart,
  Area,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
} from "recharts";
import type { SalesPoint } from "@/types/sales";

type OrdersChartProps = {
  data: SalesPoint[];
  loading?: boolean;
  error?: string | null;
};

export function OrdersChart({ data, loading, error }: OrdersChartProps) {
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
        Orders over time
      </h2>
      <div className="h-[260px]">
        <ResponsiveContainer width="100%" height="100%">
          <AreaChart
            data={data}
            margin={{ top: 10, right: 16, left: 0, bottom: 0 }}
          >
            <CartesianGrid strokeDasharray="3 3" opacity={0.2} />
            <XAxis
              dataKey="date"
              tick={{ fontSize: 11 }}
              tickMargin={8}
              tickLine={false}
            />
            <YAxis
              tick={{ fontSize: 11 }}
              width={56}
              tickMargin={4}
              allowDecimals={false}
            />
            <Tooltip
              formatter={(value: any) => [value as number, "Orders"]}
              labelFormatter={(label) => `Date: ${label}`}
            />
            <Area
              type="monotone"
              dataKey="orders"
              stroke="#6366f1"
              fill="#6366f1"
              fillOpacity={0.18}
              strokeWidth={2}
              name="Orders"
            />
          </AreaChart>
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
