"use client";

import { ComposedChart, Bar, Line, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer } from "recharts";
import type { NewVsReturningPoint } from "@/types/analytics";
import { ChartFrame } from "./chart-frame";

type Props = {
  data: NewVsReturningPoint[];
  loading?: boolean;
  error?: string | null;
};

export function NewVsReturningChart({ data, loading, error }: Props) {
  return (
    <ChartFrame loading={loading} error={error} hasData={!!data && data.length > 0}>
      <ResponsiveContainer width="100%" height="100%">
        <ComposedChart data={data} margin={{ top: 10, right: 24, left: 0, bottom: 0 }}>
          <CartesianGrid strokeDasharray="3 3" opacity={0.2} />
          <XAxis dataKey="date" tick={{ fontSize: 11 }} tickLine={false} tickMargin={8} />
          <YAxis
            yAxisId="left"
            tick={{ fontSize: 11 }}
            width={48}
            tickMargin={4}
          />
          <YAxis
            yAxisId="right"
            orientation="right"
            tickFormatter={(v) => `${v}%`}
            tick={{ fontSize: 11 }}
            width={60}
            tickMargin={4}
          />
          <Tooltip
            formatter={(value, name) => {
              if (name === "Repeat rate") return [`${value}%`, name];
              return [value, name];
            }}
            labelFormatter={(label) => `Date: ${label}`}
          />
          <Legend />
          <Bar
            yAxisId="left"
            dataKey="newOrders"
            name="New orders"
            fill="#7c3aed"
            stackId="orders"
            radius={[4, 4, 0, 0]}
          />
          <Bar
            yAxisId="left"
            dataKey="returningOrders"
            name="Returning orders"
            fill="#c084fc"
            stackId="orders"
            radius={[4, 4, 0, 0]}
          />
          <Line
            yAxisId="right"
            type="monotone"
            dataKey="repeatRate"
            name="Repeat rate"
            stroke="#a855f7"
            strokeWidth={2}
            dot={false}
          />
        </ComposedChart>
      </ResponsiveContainer>
    </ChartFrame>
  );
}
