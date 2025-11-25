"use client";

import { AreaChart, Area, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer } from "recharts";
import type { SalesPoint } from "@/types/sales";
import { ChartFrame } from "./chart-frame";

type OrdersChartProps = {
  data: SalesPoint[];
  loading?: boolean;
  error?: string | null;
  variant?: 'card' | 'plain';
};

export function OrdersChart({ data, loading, error, variant = 'card' }: OrdersChartProps) {
  const chartBody = (
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
          formatter={(value: number) => [value as number, "Orders"]}
          labelFormatter={(label) => `Date: ${label}`}
        />
        <Area
          type="monotone"
          dataKey="orders"
          stroke="#7c3aed"
          fill="#7c3aed"
          fillOpacity={0.22}
          strokeWidth={2}
          name="Orders"
        />
      </AreaChart>
    </ResponsiveContainer>
  );

  return (
    <ChartFrame loading={loading} error={error} hasData={!!data && data.length > 0} padded={variant !== 'plain'}>
      {chartBody}
    </ChartFrame>
  );
}
