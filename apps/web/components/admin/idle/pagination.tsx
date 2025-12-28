'use client';

import { useMemo, useState } from 'react';
import { Button } from '@/components/ui/button';

type PaginationProps = {
  activePage: number;
  totalPages: number;
  activeRowsCount: number;
  activeLoading: boolean;
  onPageChange: (page: number) => void;
};

export function PaginationControls({
  activePage,
  totalPages,
  activeRowsCount,
  activeLoading,
  onPageChange,
}: PaginationProps) {
  const [jumpInput, setJumpInput] = useState('');
  const [jumpOpen, setJumpOpen] = useState<'left' | 'right' | null>(null);

  const pagination = useMemo(() => {
    const pages = new Set<number>();
    pages.add(1);

    if (totalPages > 1) {
      pages.add(totalPages);
    }

    for (let p = activePage - 1; p <= activePage + 1; p += 1) {
      if (p > 1 && p < totalPages) pages.add(p);
    }

    const sorted = Array.from(pages)
      .filter((p) => p >= 1)
      .sort((a, b) => a - b);
    const middle = sorted.filter((p) => p !== 1 && p !== totalPages);
    const leftEllipsis = middle.length > 0 && middle[0] > 2;
    const rightEllipsis = middle.length > 0 && middle[middle.length - 1] < totalPages - 1;

    return { middle, leftEllipsis, rightEllipsis };
  }, [activePage, totalPages]);

  const gotoPage = (target: number) => {
    const clamped = Math.min(Math.max(target, 1), totalPages);
    onPageChange(clamped);
    setJumpOpen(null);
    setJumpInput('');
  };

  const handleJumpSubmit = (value: string) => {
    const parsed = Number.parseInt(value, 10);
    if (Number.isNaN(parsed)) return;
    gotoPage(parsed);
  };

  return (
    <div className="mt-4 flex items-center justify-between text-sm text-slate-600 dark:text-slate-300">
      <div>
        Page {activePage} of {totalPages}. {activeRowsCount} rows fetched.
      </div>
      <div className="flex items-center gap-1">
        <Button
          variant={activePage === 1 ? 'default' : 'outline'}
          className="h-9 w-9 rounded-xl border-[#d9c7f5] text-[#5b3ba4] hover:bg-[#f0e5ff] dark:border-purple-900/50 dark:text-purple-100 dark:hover:bg-purple-900/60"
          onClick={() => gotoPage(1)}
          disabled={activeLoading}
        >
          1
        </Button>
        {pagination.leftEllipsis && (
          <>
            {jumpOpen === 'left' ? (
              <input
                aria-label="Jump to page"
                inputMode="numeric"
                pattern="[0-9]*"
                value={jumpInput}
                onChange={(event) =>
                  setJumpInput(event.target.value.replace(/[^0-9]/g, ''))
                }
                onFocus={(event) => event.currentTarget.select()}
                onKeyDown={(event) => {
                  if (event.key === 'Enter') {
                    event.preventDefault();
                    handleJumpSubmit(jumpInput);
                  }
                  if (event.key === 'Escape') {
                    setJumpOpen(null);
                  }
                }}
                onBlur={() => setJumpOpen(null)}
                disabled={activeLoading}
                autoFocus
                placeholder="#"
                className="h-9 w-14 rounded-xl border border-[#d9c7f5] bg-white/80 text-center text-sm text-[#5b3ba4] shadow-sm outline-none focus:ring-2 focus:ring-purple-300 disabled:opacity-70 dark:border-purple-900/50 dark:bg-purple-950/40 dark:text-purple-100"
              />
            ) : (
              <button
                type="button"
                onClick={() => {
                  setJumpInput(String(activePage));
                  setJumpOpen('left');
                }}
                disabled={activeLoading}
                className="px-2 text-slate-400 transition hover:text-slate-600 disabled:opacity-70 dark:text-slate-500 dark:hover:text-slate-300"
              >
                …
              </button>
            )}
          </>
        )}
        {pagination.middle.map((p) => (
          <Button
            key={p}
            variant={activePage === p ? 'default' : 'outline'}
            className="h-9 w-9 rounded-xl border-[#d9c7f5] text-[#5b3ba4] hover:bg-[#f0e5ff] dark:border-purple-900/50 dark:text-purple-100 dark:hover:bg-purple-900/60"
            onClick={() => gotoPage(p)}
            disabled={activeLoading}
          >
            {p}
          </Button>
        ))}
        {pagination.rightEllipsis && (
          <>
            {jumpOpen === 'right' ? (
              <input
                aria-label="Jump to page"
                inputMode="numeric"
                pattern="[0-9]*"
                value={jumpInput}
                onChange={(event) =>
                  setJumpInput(event.target.value.replace(/[^0-9]/g, ''))
                }
                onFocus={(event) => event.currentTarget.select()}
                onKeyDown={(event) => {
                  if (event.key === 'Enter') {
                    event.preventDefault();
                    handleJumpSubmit(jumpInput);
                  }
                  if (event.key === 'Escape') {
                    setJumpOpen(null);
                  }
                }}
                onBlur={() => setJumpOpen(null)}
                disabled={activeLoading}
                autoFocus
                placeholder="#"
                className="h-9 w-14 rounded-xl border border-[#d9c7f5] bg-white/80 text-center text-sm text-[#5b3ba4] shadow-sm outline-none focus:ring-2 focus:ring-purple-300 disabled:opacity-70 dark:border-purple-900/50 dark:bg-purple-950/40 dark:text-purple-100"
              />
            ) : (
              <button
                type="button"
                onClick={() => {
                  setJumpInput(String(activePage));
                  setJumpOpen('right');
                }}
                disabled={activeLoading}
                className="px-2 text-slate-400 transition hover:text-slate-600 disabled:opacity-70 dark:text-slate-500 dark:hover:text-slate-300"
              >
                …
              </button>
            )}
          </>
        )}
        {totalPages > 1 && (
          <Button
            variant={activePage === totalPages ? 'default' : 'outline'}
            className="h-9 w-9 rounded-xl border-[#d9c7f5] text-[#5b3ba4] hover:bg-[#f0e5ff] dark:border-purple-900/50 dark:text-purple-100 dark:hover:bg-purple-900/60"
            onClick={() => gotoPage(totalPages)}
            disabled={activeLoading}
          >
            {totalPages}
          </Button>
        )}
      </div>
    </div>
  );
}
