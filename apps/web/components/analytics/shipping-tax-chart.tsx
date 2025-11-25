"use client";

import { LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer } from "recharts";
import type { ShippingTaxPoint } from "@/types/analytics";
import { ChartFrame } from "./chart-frame";

const fmtMoney = (n: number) =>
  `$${n.toLocaleString(undefined, { maximumFractionDigits: 2 })}`;

type Props = {
  data: ShippingTaxPoint[];
  loading?: boolean;
  error?: string | null;
};

export function ShippingTaxChart({ data, loading, error }: Props) {
  return (
    <ChartFrame loading={loading} error={error} hasData={!!data && data.length > 0}>
      <ResponsiveContainer width="100%" height="100%">
        <LineChart data={data} margin={{ top: 10, right: 20, left: 0, bottom: 0 }}>
          <CartesianGrid strokeDasharray="3 3" opacity={0.2} />
          <XAxis dataKey="date" tick={{ fontSize: 11 }} tickLine={false} tickMargin={8} />
          <YAxis tickFormatter={fmtMoney} tick={{ fontSize: 11 }} width={70} tickMargin={4} />
          <Tooltip
            formatter={(value, name) => [fmtMoney(value as number), name]}
            labelFormatter={(label) => `Date: ${label}`}
          />
          <Legend />
          <Line
            type="monotone"
            dataKey="shipping"
            name="Shipping"
            stroke="#7c3aed"
            strokeWidth={2}
            dot={false}
          />
          <Line
            type="monotone"
            dataKey="tax"
            name="Tax"
            stroke="#a78bfa"
            strokeWidth={2}
            dot={false}
          />
        </LineChart>
      </ResponsiveContainer>
    </ChartFrame>
  );
}
