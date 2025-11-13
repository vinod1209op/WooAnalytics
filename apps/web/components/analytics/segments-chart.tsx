'use client';

import {
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
} from 'recharts';
import type { SegmentPoint } from '@/types/segment';

export function SegmentsChart({
  data,
  loading,
}: {
  data: SegmentPoint[];
  loading?: boolean;
}) {
  if (loading) return <ChartSkeleton />;
  if (!data.length) return <Empty />;

  return (
    <ResponsiveContainer width="100%" height="100%">
      <BarChart data={data}>
        <CartesianGrid strokeDasharray="3 3" />
        <XAxis dataKey="segment" />
        <YAxis />
        <Tooltip />
        <Bar dataKey="customers" fill="#f59e0b" radius={[6, 6, 0, 0]} />
      </BarChart>
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
