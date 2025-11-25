'use client';

import { useMemo } from 'react';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { chartOptions, ChartId, ChartRegistryContext, getChartById } from './chart-registry';

const cardShell =
  'rounded-2xl border border-[#d9c7f5] bg-gradient-to-b from-white via-[#faf5ff] to-white/90 shadow-[0_8px_24px_rgba(93,63,163,0.08)] backdrop-blur-sm dark:border-purple-900/50 dark:bg-gradient-to-b dark:from-[#1a0f2b] dark:via-[#201338] dark:to-[#1a0f2b]/80';
const heading =
  'text-base font-semibold text-[#6f4bb3] dark:text-purple-200';

type ChartSwitcherProps = {
  chartId: ChartId;
  onChange: (next: ChartId) => void;
  context: ChartRegistryContext;
  allowedIds?: ChartId[];
};

export function ChartSwitcher({ chartId, onChange, context, allowedIds }: ChartSwitcherProps) {
  const options = useMemo(
    () =>
      allowedIds
        ? chartOptions.filter((opt) => allowedIds.includes(opt.value))
        : chartOptions,
    [allowedIds]
  );

  const chart = useMemo(() => {
    const entry = options.find((opt) => opt.value === chartId);
    return entry ? getChartById(chartId) : getChartById(options[0]?.value ?? chartId);
  }, [chartId, options]);

  return (
    <section className={`${cardShell} p-4`}>
      <div className="mb-3 flex items-center justify-between gap-3">
        <div>
          <h2 className={heading}>
            {chart.label}
          </h2>
          {chart.description && (
            <p className="text-xs text-slate-500 dark:text-slate-400">{chart.description}</p>
          )}
        </div>
        <Select value={chartId} onValueChange={(v) => onChange(v as ChartId)}>
          <SelectTrigger className="w-[180px] rounded-xl border-[#d9c7f5] bg-white text-[#5b3ba4] shadow-sm hover:bg-[#f0e5ff] dark:border-purple-900/60 dark:bg-[#24133b] dark:text-purple-100">
            <SelectValue placeholder="Choose chart" />
          </SelectTrigger>
          <SelectContent>
            {options.map((opt) => (
              <SelectItem key={opt.value} value={opt.value}>
                {opt.label}
              </SelectItem>
            ))}
          </SelectContent>
      </Select>
    </div>
      <div className="w-full">{chart.render(context)}</div>
    </section>
  );
}
