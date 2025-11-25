"use client";

import { LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer } from "recharts";
import type { RollingPoint } from "@/types/analytics";
import { ChartFrame } from "./chart-frame";

const fmtMoney = (n: number) =>
  `$${n.toLocaleString(undefined, { maximumFractionDigits: 2 })}`;

type Props = {
  data: RollingPoint[];
  loading?: boolean;
  error?: string | null;
};

export function RollingChart({ data, loading, error }: Props) {
  return (
    <ChartFrame loading={loading} error={error} hasData={!!data && data.length > 0}>
      <ResponsiveContainer width="100%" height="100%">
        <LineChart data={data} margin={{ top: 10, right: 20, left: 0, bottom: 0 }}>
          <CartesianGrid strokeDasharray="3 3" opacity={0.2} />
          <XAxis dataKey="date" tick={{ fontSize: 11 }} tickLine={false} tickMargin={8} />
          <YAxis
            yAxisId="left"
            tickFormatter={fmtMoney}
            tick={{ fontSize: 11 }}
            width={70}
            tickMargin={4}
          />
          <YAxis
            yAxisId="right"
            orientation="right"
            tick={{ fontSize: 11 }}
            width={48}
            tickMargin={4}
          />
          <Tooltip
            formatter={(value, name) => {
              if (name?.toString().toLowerCase().includes("revenue")) {
                return [fmtMoney(value as number), name];
              }
              return [value, name];
            }}
            labelFormatter={(label) => `Date: ${label}`}
          />
          <Legend />
          <Line
            yAxisId="left"
            type="monotone"
            dataKey="revenue7d"
            name="Revenue (7d avg)"
            stroke="#7c3aed"
            strokeWidth={2}
            dot={false}
          />
          <Line
            yAxisId="right"
            type="monotone"
            dataKey="orders7d"
            name="Orders (7d avg)"
            stroke="#a78bfa"
            strokeWidth={2}
            dot={false}
          />
        </LineChart>
      </ResponsiveContainer>
    </ChartFrame>
  );
}
