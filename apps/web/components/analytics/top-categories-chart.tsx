"use client";

import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer } from "recharts";
import type { CategorySummary } from "@/types/category";
import { ChartFrame } from "./chart-frame";

const fmtMoney = (n: number | null) =>
  `$${(n ?? 0).toLocaleString(undefined, { maximumFractionDigits: 2 })}`;

type Props = {
  data: CategorySummary[];
  loading?: boolean;
  error?: string | null;
};

export function TopCategoriesChart({ data, loading, error }: Props) {
  const chartData = data.map((c) => ({
    ...c,
    label: c.name ?? "Category",
  }));

  return (
    <ChartFrame loading={loading} error={error} hasData={!!data && data.length > 0}>
      <ResponsiveContainer width="100%" height="100%">
        <BarChart
          data={chartData}
          layout="vertical"
          margin={{ top: 10, right: 16, left: 0, bottom: 0 }}
        >
          <CartesianGrid strokeDasharray="3 3" opacity={0.2} />
          <XAxis type="number" tickFormatter={fmtMoney} tick={{ fontSize: 11 }} />
          <YAxis
            type="category"
            dataKey="label"
            width={180}
            tick={{ fontSize: 12 }}
          />
          <Tooltip
            formatter={(value, name) => {
              if (name === "revenue") return [fmtMoney(value as number), "Revenue"];
              if (name === "units") return [value, "Units"];
              return [value, name];
            }}
          />
          <Bar
            dataKey="revenue"
            name="Revenue"
            fill="#7c3aed"
            radius={[0, 6, 6, 0]}
          />
        </BarChart>
      </ResponsiveContainer>
    </ChartFrame>
  );
}
