'use client';

import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer } from 'recharts';
import type { SegmentPoint } from '@/types/segment';
import { ChartFrame } from './chart-frame';

export function SegmentsChart({
  data,
  loading,
}: {
  data: SegmentPoint[];
  loading?: boolean;
}) {
  return (
    <ChartFrame loading={loading} error={undefined} hasData={!!data.length}>
      <ResponsiveContainer width="100%" height="100%">
        <BarChart data={data} margin={{ top: 8, right: 12, left: 0, bottom: 0 }}>
          <CartesianGrid strokeDasharray="3 3" opacity={0.2} />
          <XAxis dataKey="segment" tick={{ fontSize: 11 }} tickMargin={6} />
          <YAxis tick={{ fontSize: 11 }} allowDecimals={false} />
          <Tooltip />
          <Bar dataKey="customers" fill="#7c3aed" radius={[8, 8, 0, 0]} />
        </BarChart>
      </ResponsiveContainer>
    </ChartFrame>
  );
}
