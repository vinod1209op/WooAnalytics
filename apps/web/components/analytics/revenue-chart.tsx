// apps/web/components/analytics/revenue-chart.tsx
"use client";

import { LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer } from "recharts";
import type { SalesPoint } from "@/types/sales";
import { ChartFrame } from "./chart-frame";

const fmtMoney = (n: number) =>
  `$${n.toLocaleString(undefined, { maximumFractionDigits: 2 })}`;

type RevenueChartProps = {
  data: SalesPoint[];
  loading?: boolean;
  error?: string | null;
  variant?: 'card' | 'plain';
};

export function RevenueChart({ data, loading, error, variant = 'card' }: RevenueChartProps) {
  const chartBody = (
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
          formatter={(value: number, name: string) => {
            if (name === "revenue") return [fmtMoney(value as number), "Revenue"];
            if (name === "orders") return [value as number, "Orders"];
            return [value, name];
          }}
          labelFormatter={(label) => `Date: ${label}`}
        />
        <Line
          type="monotone"
          dataKey="revenue"
          stroke="#7c3aed"
          strokeWidth={2}
          dot={{ r: 2 }}
          activeDot={{ r: 4 }}
          name="Revenue"
        />
        <Line
          type="monotone"
          dataKey="orders"
          stroke="#c084fc"
          strokeWidth={1}
          dot={false}
          yAxisId={0}
          name="Orders"
        />
      </LineChart>
    </ResponsiveContainer>
  );

  return (
    <ChartFrame loading={loading} error={error} hasData={!!data && data.length > 0} padded={variant !== 'plain'}>
      {chartBody}
    </ChartFrame>
  );
}
