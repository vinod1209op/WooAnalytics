// web/components/analytics/rfm-chart.tsx
'use client';

import { RfmHeatmapCell } from "@/types/rfmCell";
import { ChartFrame } from "./chart-frame";

type RfmHeatmapProps = {
  data: RfmHeatmapCell[];
  loading: boolean;
};

export function RfmHeatmap({ data, loading }: RfmHeatmapProps) {
  const rValues = Array.from(new Set(data.map((c) => c.rScore))).sort((a, b) => a - b);
  const fValues = Array.from(new Set(data.map((c) => c.fScore))).sort((a, b) => a - b);
  const maxCount = data.reduce((max, c) => Math.max(max, c.count), 0) || 1;

  const getCell = (rScore: number, fScore: number) =>
    data.find((c) => c.rScore === rScore && c.fScore === fScore) || { rScore, fScore, totalMonetary: 0, count: 0 };

  const intensity = (count: number) => count / maxCount;

  return (
    <ChartFrame loading={loading} error={undefined} hasData={!!data && data.length > 0} padded>
      <div className="flex h-full flex-col gap-3">
        <div className="flex items-center justify-between text-xs text-[#6f4bb3] dark:text-purple-200">
          <span>Recency →</span>
          <span>More recent</span>
        </div>

        <div className="flex flex-1 gap-3">
          <div className="flex flex-col justify-between text-xs text-[#6f4bb3] dark:text-purple-200">
            <span>Frequency ↑</span>
            <span>More orders</span>
          </div>

          <div className="flex-1 overflow-hidden rounded-xl border border-[#e9d5ff] bg-white/60 dark:border-purple-900/60 dark:bg-purple-950/30">
            <div
              className="grid h-full w-full"
              style={{
                gridTemplateRows: `repeat(${fValues.length}, 1fr)`,
                gridTemplateColumns: `repeat(${rValues.length}, 1fr)`,
              }}
            >
              {fValues
                .slice()
                .reverse()
                .map((f) =>
                  rValues.map((r) => {
                    const cell = getCell(r, f);
                    const t = intensity(cell.count);
                    const bgOpacity = 0.12 + t * 0.78;

                    return (
                      <div
                        key={`${r}-${f}`}
                        className="flex flex-col items-center justify-center border border-white/40 text-[10px] font-medium text-[#3b2a63] dark:border-purple-900/40 dark:text-purple-50"
                        style={{
                          backgroundColor: `rgba(124, 58, 237, ${bgOpacity})`,
                        }}
                      >
                        <div>{cell.count}</div>
                        <div className="mt-0.5 opacity-80">
                          R{cell.rScore} · F{cell.fScore}
                        </div>
                      </div>
                    );
                  }),
                )}
            </div>
          </div>
        </div>
      </div>
    </ChartFrame>
  );
}
