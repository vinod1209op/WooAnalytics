"use client";

import type { RetentionCohort } from "@/types/analytics";
import { ChartFrame } from "./chart-frame";

type Props = {
  cohorts: RetentionCohort[];
  loading?: boolean;
  error?: string | null;
};

export function CohortsChart({ cohorts, loading, error }: Props) {
  const maxPeriod = Math.max(
    0,
    ...cohorts.flatMap((c) => c.periods.map((p) => p.periodMonth))
  );

  const getShade = (rate: number) => {
    const clamped = Math.max(0, Math.min(100, rate));
    const alpha = (clamped / 100) * 0.8 + 0.1;
    return `rgba(139, 92, 246, ${alpha.toFixed(2)})`;
  };

  return (
    <ChartFrame
      loading={loading}
      error={error}
      hasData={!!cohorts && cohorts.length > 0}
      padded
      heightClass="h-[320px]"
    >
      <div
        className="max-h-[300px] overflow-auto pr-2"
        style={{ scrollbarWidth: 'thin' }}
      >
        <table className="w-full min-w-[720px] border-collapse text-sm">
          <thead>
            <tr className="sticky top-0 z-10 bg-white/90 text-left text-slate-600 backdrop-blur dark:bg-purple-950/80 dark:text-slate-300">
              <th className="px-3 py-2 font-semibold">Cohort</th>
              <th className="px-3 py-2 font-semibold">Size</th>
              {Array.from({ length: maxPeriod + 1 }).map((_, idx) => (
                <th key={idx} className="px-2 py-2 font-semibold text-center">
                  M{idx}
                </th>
              ))}
            </tr>
          </thead>
          <tbody>
            {cohorts.map((cohort) => (
              <tr key={cohort.cohortMonth} className="border-t border-slate-100 last:border-b dark:border-slate-800">
                <td className="whitespace-nowrap px-3 py-2 font-medium text-slate-800 dark:text-slate-100">
                  {cohort.cohortMonth}
                </td>
                <td className="px-3 py-2 text-slate-600 dark:text-slate-300">
                  {cohort.customersInCohort}
                </td>
                {Array.from({ length: maxPeriod + 1 }).map((_, idx) => {
                  const period = cohort.periods.find((p) => p.periodMonth === idx);
                  const rate = period?.retentionRate ?? 0;
                  const active = period?.activeCustomers ?? 0;
                  return (
                    <td key={idx} className="px-2 py-2 text-center">
                      <div
                        className="rounded-md px-2 py-1 text-xs text-white"
                        style={{ backgroundColor: getShade(rate) }}
                        title={`${rate}% (${active} active)`}
                      >
                        {rate}%
                      </div>
                    </td>
                  );
                })}
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </ChartFrame>
  );
}
