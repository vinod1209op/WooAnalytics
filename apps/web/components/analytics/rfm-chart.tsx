// web/components/analytics/rfm-chart.tsx
'use client';

export type RfmHeatmapCell = {
  r: number;       // recency bucket
  f: number;       // frequency bucket
  m: number;       // monetary bucket (if you have it)
  count: number;   // number of customers in this cell
};

type RfmHeatmapProps = {
  data: RfmHeatmapCell[];
  loading: boolean;
};

export function RfmHeatmap({ data, loading }: RfmHeatmapProps) {
  if (loading) {
    return (
      <div className="flex h-80 items-center justify-center rounded-xl bg-slate-100 dark:bg-slate-800">
        <span className="text-sm text-slate-500 dark:text-slate-400">
          Loading RFM heatmap…
        </span>
      </div>
    );
  }

  if (!data || data.length === 0) {
    return (
      <div className="flex h-80 items-center justify-center rounded-xl border border-dashed border-slate-200 text-sm text-slate-500 dark:border-slate-700 dark:text-slate-400">
        No RFM data yet. Once customers place orders, you’ll see the
        distribution here.
      </div>
    );
  }

  // Build simple grid by R & F buckets.
  const rValues = Array.from(new Set(data.map((c) => c.r))).sort((a, b) => a - b);
  const fValues = Array.from(new Set(data.map((c) => c.f))).sort((a, b) => a - b);

  const maxCount = data.reduce((max, c) => Math.max(max, c.count), 0) || 1;

  const getCell = (r: number, f: number) =>
    data.find((c) => c.r === r && c.f === f) || { r, f, m: 0, count: 0 };

  const intensity = (count: number) => count / maxCount;

  return (
    <div className="flex h-80 flex-col gap-3">
      <div className="flex items-center justify-between text-xs text-slate-500 dark:text-slate-400">
        <span>Recency →</span>
        <span>More recent</span>
      </div>

      <div className="flex flex-1 gap-3">
        {/* Y axis label */}
        <div className="flex flex-col justify-between text-xs text-slate-500 dark:text-slate-400">
          <span>Frequency ↑</span>
          <span>More orders</span>
        </div>

        {/* Grid */}
        <div className="flex-1 overflow-hidden rounded-xl border border-slate-200 bg-slate-50 dark:border-slate-700 dark:bg-slate-900/40">
          <div
            className="grid h-full w-full"
            style={{
              gridTemplateRows: `repeat(${fValues.length}, 1fr)`,
              gridTemplateColumns: `repeat(${rValues.length}, 1fr)`,
            }}
          >
            {fValues
              .slice()
              .reverse() // high frequency at top
              .map((f) =>
                rValues.map((r) => {
                  const cell = getCell(r, f);
                  const t = intensity(cell.count);
                  const bgOpacity = 0.15 + t * 0.85;

                  return (
                    <div
                      key={`${r}-${f}`}
                      className="flex flex-col items-center justify-center border border-slate-100 text-[10px] font-medium text-slate-800 dark:border-slate-800 dark:text-slate-100"
                      style={{
                        backgroundColor: `rgba(56, 189, 248, ${bgOpacity})`, // cyan-ish
                      }}
                    >
                      <div>{cell.count}</div>
                      <div className="mt-0.5 opacity-70">
                        R{cell.r} · F{cell.f}
                      </div>
                    </div>
                  );
                }),
              )}
          </div>
        </div>
      </div>
    </div>
  );
}
