"use client";

import { ChartFrame } from "./chart-frame";
import type { UtmOrdersPoint, UtmOrdersSummary } from "@/types/analytics";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";

const fmtNumber = (value: number) => value.toLocaleString();
const fmtPercent = (value: number) => `${value.toFixed(1)}%`;

type Props = {
  totalOrders: number;
  movement: UtmOrdersSummary | null;
  points: UtmOrdersPoint[];
  loading?: boolean;
  error?: string | null;
};

export function UtmOrdersChart({ totalOrders, movement, points, loading, error }: Props) {
  const hasData = totalOrders > 0 && points.length > 0;

  return (
    <ChartFrame
      loading={loading}
      error={error}
      hasData={hasData}
      heightClass="h-[20rem]"
      padded={false}
    >
      <div className="flex h-full flex-col gap-3 p-3">
        <div className="min-h-0 flex-1 overflow-hidden rounded-xl border border-[#e9d5ff] bg-white/70 dark:border-purple-900/60 dark:bg-purple-950/30">
          <div className="h-full overflow-auto">
            <Table>
              <TableHeader>
                <TableRow className="bg-[#f6f0ff] text-xs text-[#6f4bb3] dark:bg-purple-950/60 dark:text-purple-200">
                  <TableHead>Source</TableHead>
                  <TableHead>Medium</TableHead>
                  <TableHead className="text-right">Orders</TableHead>
                  <TableHead className="text-right">Customers</TableHead>
                  <TableHead className="text-right">Share</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {points.map((row, idx) => {
                  return (
                    <TableRow key={`${row.source}-${row.medium}-${idx}`}>
                      <TableCell className="font-medium text-slate-700 dark:text-purple-100">
                        {row.source}
                      </TableCell>
                      <TableCell className="text-slate-600 dark:text-purple-200/80">
                        {row.medium}
                      </TableCell>
                      <TableCell className="text-right text-slate-700 dark:text-purple-100">
                        {fmtNumber(row.orders)}
                      </TableCell>
                      <TableCell className="text-right text-slate-700 dark:text-purple-100">
                        {fmtNumber(row.customers)}
                      </TableCell>
                      <TableCell className="text-right text-slate-600 dark:text-purple-200/80">
                        {fmtPercent(row.share)}
                      </TableCell>
                    </TableRow>
                  );
                })}
              </TableBody>
            </Table>
          </div>
        </div>

      </div>
    </ChartFrame>
  );
}
