"use client";

import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer } from "recharts";
import type { ProductPerformance } from "@/types/analytics";
import { ChartFrame } from "./chart-frame";

const fmtMoney = (n: number | null) =>
  `$${(n ?? 0).toLocaleString(undefined, { maximumFractionDigits: 2 })}`;

type Props = {
  data: ProductPerformance[];
  loading?: boolean;
  error?: string | null;
};

export function TopProductsChart({ data, loading, error }: Props) {
  const chartData = data.map((p) => ({
    ...p,
    label: p.name ?? `Product ${p.id}`,
  }));

  return (
    <ChartFrame loading={loading} error={error} hasData={!!data && data.length > 0}>
      <ResponsiveContainer width="100%" height="100%">
        <BarChart
          data={chartData}
          layout="vertical"
          margin={{ top: 10, right: 20, left: 0, bottom: 0 }}
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
            formatter={(value, name, props) => {
              if (name === "revenue") return [fmtMoney(value as number), "Revenue"];
              if (name === "units") return [value, "Units"];
              return [value, name];
            }}
            labelFormatter={(label, payload) => {
              const sku = payload?.[0]?.payload?.sku;
              return sku ? `${label} (SKU: ${sku})` : label;
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
