"use client";

import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer } from "recharts";
import type { UtmOrdersPoint } from "@/types/analytics";
import { ChartFrame } from "./chart-frame";

const fmtCount = (value: number) => value.toLocaleString();
const fmtPercent = (value: number) => `${value.toFixed(1)}%`;

type Props = {
  points: UtmOrdersPoint[];
  loading?: boolean;
  error?: string | null;
};

export function UtmOrdersChart({ points, loading, error }: Props) {
  const chartData = points.map((point) => ({
    ...point,
    label: `${point.source} / ${point.medium}`,
  }));

  return (
    <ChartFrame loading={loading} error={error} hasData={chartData.length > 0}>
      <ResponsiveContainer width="100%" height="100%">
        <BarChart
          data={chartData}
          layout="vertical"
          margin={{ top: 10, right: 18, left: 0, bottom: 0 }}
        >
          <CartesianGrid strokeDasharray="3 3" opacity={0.2} />
          <XAxis type="number" tickFormatter={fmtCount} tick={{ fontSize: 11 }} />
          <YAxis
            type="category"
            dataKey="label"
            width={190}
            tick={{ fontSize: 12 }}
          />
          <Tooltip
            formatter={(value, name, item) => {
              if (name === "orders") {
                return [`${fmtCount(value as number)} (${fmtPercent((item.payload as UtmOrdersPoint).share)})`, "Orders"];
              }
              if (name === "customers") {
                return [fmtCount(value as number), "Customers"];
              }
              return [value, name];
            }}
          />
          <Bar
            dataKey="orders"
            name="orders"
            fill="#7c3aed"
            radius={[0, 6, 6, 0]}
          />
        </BarChart>
      </ResponsiveContainer>
    </ChartFrame>
  );
}
