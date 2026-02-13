"use client";

import {
  CartesianGrid,
  Line,
  LineChart,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from "recharts";
import type {
  CartRecoveryPoint,
  CartRecoverySpeedBucket,
  CartRecoverySummary,
} from "@/types/analytics";
import { ChartFrame } from "./chart-frame";

const fmtPercent = (value: number) => `${value.toFixed(1)}%`;
const fmtNumber = (value: number) => value.toLocaleString();
const fmtHours = (value: number | null | undefined) =>
  value == null || Number.isNaN(value) ? "-" : `${value.toFixed(1)}h`;
const shortDate = (value: string) => {
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return value;
  return `${String(date.getMonth() + 1).padStart(2, "0")}/${String(
    date.getDate()
  ).padStart(2, "0")}`;
};

type Props = {
  summary: CartRecoverySummary | null;
  points: CartRecoveryPoint[];
  speedBuckets: CartRecoverySpeedBucket[];
  loading?: boolean;
  error?: string | null;
};

export function CartRecoveryChart({
  summary,
  points,
  speedBuckets,
  loading,
  error,
}: Props) {
  const hasData =
    (summary?.abandonedCustomers ?? 0) > 0 ||
    points.some((point) => point.abandonedCustomers > 0);
  const trendPoints = points.map((point, index) => {
    const start = Math.max(0, index - 6);
    const window = points.slice(start, index + 1);
    const avg =
      window.reduce((sum, row) => sum + (row.customerRecoveryRate || 0), 0) /
      (window.length || 1);
    return {
      ...point,
      recoveryRate7d: Number(avg.toFixed(2)),
    };
  });
  const speedMax = Math.max(1, ...speedBuckets.map((bucket) => bucket.count));
  const windowLabel = summary ? `${summary.recoveryWindowDays}d window` : "window";

  return (
    <ChartFrame
      loading={loading}
      error={error}
      hasData={hasData}
      heightClass="h-[20rem]"
      padded={false}
    >
      <div className="flex h-full flex-col gap-3 p-3">
        <div className="flex flex-wrap items-center gap-2 text-[11px]">
          <span className="rounded-full border border-[#e9d5ff] bg-white/75 px-2 py-1 text-slate-700 dark:border-purple-900/60 dark:bg-purple-950/30 dark:text-purple-100">
            Recovered {fmtNumber(summary?.recoveredCustomers ?? 0)}/
            {fmtNumber(summary?.abandonedCustomers ?? 0)} (
            {fmtPercent(summary?.customerRecoveryRate ?? 0)})
          </span>
          <span className="rounded-full border border-[#e9d5ff] bg-white/75 px-2 py-1 text-slate-700 dark:border-purple-900/60 dark:bg-purple-950/30 dark:text-purple-100">
            Unrecovered {fmtNumber(summary?.unrecoveredCustomers ?? 0)}
          </span>
          <span className="rounded-full border border-[#e9d5ff] bg-white/75 px-2 py-1 text-slate-700 dark:border-purple-900/60 dark:bg-purple-950/30 dark:text-purple-100">
            Avg {fmtHours(summary?.averageRecoveryHours)}
          </span>
          <span className="rounded-full border border-[#e9d5ff] bg-white/75 px-2 py-1 text-slate-700 dark:border-purple-900/60 dark:bg-purple-950/30 dark:text-purple-100">
            Within 24h {fmtNumber(summary?.recoveredWithin24h ?? 0)}
          </span>
          <span className="rounded-full border border-[#e9d5ff] bg-white/75 px-2 py-1 text-slate-700 dark:border-purple-900/60 dark:bg-purple-950/30 dark:text-purple-100">
            {windowLabel}
          </span>
        </div>

        <div className="grid min-h-0 flex-1 gap-3 md:grid-cols-3">
          <div className="min-h-0 md:col-span-2">
            <div className="mb-1 text-[10px] uppercase text-[#6f4bb3] dark:text-purple-200">
              Recovery trend
            </div>
            <ResponsiveContainer width="100%" height="100%">
              <LineChart data={trendPoints} margin={{ top: 8, right: 10, left: 0, bottom: 0 }}>
                <CartesianGrid strokeDasharray="3 3" opacity={0.2} />
                <XAxis
                  dataKey="date"
                  tick={{ fontSize: 11 }}
                  tickLine={false}
                  tickMargin={8}
                  minTickGap={24}
                  interval="preserveStartEnd"
                  tickFormatter={shortDate}
                />
                <YAxis
                  tickFormatter={(value) => `${value}%`}
                  tick={{ fontSize: 11 }}
                  width={42}
                  domain={[0, 100]}
                />
                <Tooltip
                  labelFormatter={(label) => `Date: ${label}`}
                  formatter={(value, name) => {
                    if (name === "recoveryRate7d") {
                      return [fmtPercent(value as number), "Recovery rate (7d avg)"];
                    }
                    if (name === "customerRecoveryRate") {
                      return [fmtPercent(value as number), "Recovery rate (daily)"];
                    }
                    return [value as number, name];
                  }}
                />
                <Line
                  type="monotone"
                  dataKey="recoveryRate7d"
                  name="recoveryRate7d"
                  stroke="#7c3aed"
                  strokeWidth={2}
                  dot={false}
                />
                <Line
                  type="monotone"
                  dataKey="customerRecoveryRate"
                  name="customerRecoveryRate"
                  stroke="#c084fc"
                  strokeWidth={1.2}
                  dot={false}
                  opacity={0.6}
                />
              </LineChart>
            </ResponsiveContainer>
          </div>

          <div className="min-h-0">
            <div className="mb-1 text-[10px] uppercase text-[#6f4bb3] dark:text-purple-200">
              Recovery speed buckets
            </div>
            <div className="space-y-2">
              {speedBuckets.map((bucket) => {
                const width = `${Math.round((bucket.count / speedMax) * 100)}%`;
                return (
                  <div key={bucket.id} className="space-y-1">
                    <div className="flex items-center justify-between text-[11px] text-slate-700 dark:text-purple-100">
                      <span>{bucket.label}</span>
                      <span>
                        {bucket.count} ({fmtPercent(bucket.shareRecovered)})
                      </span>
                    </div>
                    <div className="h-2 overflow-hidden rounded-full bg-[#f0e5ff] dark:bg-purple-900/50">
                      <div className="h-2 rounded-full bg-[#7c3aed]" style={{ width }} />
                    </div>
                  </div>
                );
              })}
            </div>
          </div>
        </div>
      </div>
    </ChartFrame>
  );
}
