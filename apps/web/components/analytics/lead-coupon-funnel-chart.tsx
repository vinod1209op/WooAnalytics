"use client";

import { LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer } from "recharts";
import type { LeadCouponPoint, LeadCouponSummary } from "@/types/analytics";
import { ChartFrame } from "./chart-frame";

const fmtPercent = (value: number) => `${value.toFixed(1)}%`;

type Props = {
  summary: LeadCouponSummary | null;
  points: LeadCouponPoint[];
  loading?: boolean;
  error?: string | null;
};

export function LeadCouponFunnelChart({ summary, points, loading, error }: Props) {
  const hasData = !!summary || points.length > 0;

  return (
    <ChartFrame
      loading={loading}
      error={error}
      hasData={hasData}
      heightClass="h-[20rem]"
      padded={false}
    >
      <div className="flex h-full flex-col overflow-hidden p-3">
        <div className="flex-1 min-h-0">
          <ResponsiveContainer width="100%" height="100%">
            <LineChart data={points} margin={{ top: 10, right: 20, left: 0, bottom: 0 }}>
              <CartesianGrid strokeDasharray="3 3" opacity={0.2} />
              <XAxis dataKey="date" tick={{ fontSize: 11 }} tickLine={false} tickMargin={8} />
              <YAxis
                tickFormatter={(val) => `${val}%`}
                tick={{ fontSize: 11 }}
                width={55}
                domain={[0, 100]}
              />
              <Tooltip
                formatter={(value) => [fmtPercent(value as number), "Lead coupon rate"]}
                labelFormatter={(label) => `Date: ${label}`}
              />
              <Line
                type="monotone"
                dataKey="redemptionRate"
                name="Lead coupon rate"
                stroke="#7c3aed"
                strokeWidth={2}
                dot={false}
              />
            </LineChart>
          </ResponsiveContainer>
        </div>
      </div>
    </ChartFrame>
  );
}
