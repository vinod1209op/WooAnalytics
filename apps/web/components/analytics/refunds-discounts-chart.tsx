"use client";

import { AreaChart, Area, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer } from "recharts";
import type { RefundsDiscountsPoint } from "@/types/analytics";
import { ChartFrame } from "./chart-frame";

const fmtMoney = (n: number) =>
  `$${n.toLocaleString(undefined, { maximumFractionDigits: 2 })}`;

type Props = {
  data: RefundsDiscountsPoint[];
  loading?: boolean;
  error?: string | null;
};

export function RefundsDiscountsChart({ data, loading, error }: Props) {
  return (
    <ChartFrame loading={loading} error={error} hasData={!!data && data.length > 0}>
      <ResponsiveContainer width="100%" height="100%">
        <AreaChart data={data} margin={{ top: 10, right: 20, left: 0, bottom: 0 }}>
          <defs>
            <linearGradient id="gradRefunds" x1="0" x2="0" y1="0" y2="1">
              <stop offset="5%" stopColor="#a855f7" stopOpacity={0.55} />
              <stop offset="95%" stopColor="#a855f7" stopOpacity={0.05} />
            </linearGradient>
            <linearGradient id="gradDiscounts" x1="0" x2="0" y1="0" y2="1">
              <stop offset="5%" stopColor="#c084fc" stopOpacity={0.5} />
              <stop offset="95%" stopColor="#c084fc" stopOpacity={0.05} />
            </linearGradient>
          </defs>
          <CartesianGrid strokeDasharray="3 3" opacity={0.2} />
          <XAxis dataKey="date" tick={{ fontSize: 11 }} tickLine={false} tickMargin={8} />
          <YAxis tickFormatter={fmtMoney} tick={{ fontSize: 11 }} width={70} tickMargin={4} />
          <Tooltip
            formatter={(value, name) => [fmtMoney(value as number), name]}
            labelFormatter={(label) => `Date: ${label}`}
          />
          <Legend />
          <Area
            type="monotone"
            dataKey="refunds"
            name="Refunds"
            stroke="#a855f7"
            fill="url(#gradRefunds)"
            strokeWidth={2}
            dot={false}
          />
          <Area
            type="monotone"
            dataKey="discounts"
            name="Discounts"
            stroke="#c084fc"
            fill="url(#gradDiscounts)"
            strokeWidth={2}
            dot={false}
          />
        </AreaChart>
      </ResponsiveContainer>
    </ChartFrame>
  );
}
