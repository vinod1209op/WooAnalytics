'use client';

import {
  LineChart,
  Line,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
} from 'recharts';
import type { SalesPoint } from '@/types/sales';

const fmtMoney = (n: number) =>
  `$${n.toLocaleString(undefined, { maximumFractionDigits: 2 })}`;

export function RevenueChart({
  data,
  loading,
}: {
  data: SalesPoint[];
  loading?: boolean;
}) {
  if (loading) {
    return <ChartSkeleton />;
  }

  if (!data.length) {
    return <Empty />;
  }

  return (
    <ResponsiveContainer width="100%" height="100%">
      <LineChart data={data}>
        <CartesianGrid strokeDasharray="3 3" />
        <XAxis dataKey="date" />
        <YAxis tickFormatter={(v) => `$${v}`} />
        <Tooltip formatter={(v: number) => [fmtMoney(v), 'Revenue']} />
        <Line type="monotone" dataKey="revenue" stroke="#2563eb" strokeWidth={3} dot={{ r: 3 }} />
      </LineChart>
    </ResponsiveContainer>
  );
}

function ChartSkeleton() {
  return (
    <div className="h-80 rounded-2xl border border-slate-200 bg-slate-100/80 dark:border-slate-800 dark:bg-slate-900/40 animate-pulse" />
  );
}
function Empty() {
  return (
    <div className="flex h-80 items-center justify-center text-sm text-slate-500">
      No data
    </div>
  );
}
