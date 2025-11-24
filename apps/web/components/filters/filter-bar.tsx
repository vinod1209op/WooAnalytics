'use client';

import { useState } from 'react';

import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from '@/components/ui/popover';
import { Calendar as CalendarIcon, ChevronDown } from 'lucide-react';

export type FilterType = 'date' | 'category' | 'coupon';

export type DateRangeValue = { from?: Date; to?: Date } | null;

const toInputDate = (d?: Date | null) => (d ? d.toISOString().slice(0, 10) : '');

const fromInputDate = (value: string): Date | undefined =>
  value ? new Date(value + 'T00:00:00') : undefined;

export interface FilterState {
  type: FilterType;
  date: DateRangeValue;
  category?: string;
  coupon?: string;
}

interface FilterBarProps {
  filter: FilterState;
  onChange: (next: FilterState) => void;
  categories?: string[];
  coupons?: string[];
}

export function FilterBar({
  filter,
  onChange,
  categories = [],
  coupons = [],
}: FilterBarProps) {
  const [dateOpen, setDateOpen] = useState(false);
  const [categoryOpen, setCategoryOpen] = useState(false);
  const [couponOpen, setCouponOpen] = useState(false);

  const update = (patch: Partial<FilterState>) => onChange({ ...filter, ...patch });

  const applyPreset = (days: number) => {
    const to = new Date();
    to.setHours(0, 0, 0, 0);
    const from = new Date(to);
    from.setDate(from.getDate() - (days - 1));
    update({
      type: 'date',
      date: { from, to },
    });
  };

  const rangeLabel = (() => {
    const from = filter.date?.from;
    const to = filter.date?.to;
    if (from && to) {
      return `${from.toLocaleDateString()} – ${to.toLocaleDateString()}`;
    }
    return 'Select dates';
  })();

  return (
    <div className="flex flex-wrap items-center gap-3 text-sm">
      <div className="flex items-center gap-2 rounded-xl border border-[#d9c7f5] bg-white p-1 shadow-sm dark:border-purple-900/50 dark:bg-purple-950/40">
        {(['date', 'category', 'coupon'] as FilterType[]).map((type) => {
          const isActive = filter.type === type;

          if (type === 'category') {
            return (
              <Popover
                key={type}
                open={categoryOpen && isActive}
                onOpenChange={(open) => {
                  setCategoryOpen(open);
                  if (open) {
                    update({ type: 'category', category: filter.category ?? '' });
                    setDateOpen(false);
                    setCouponOpen(false);
                  }
                }}
              >
                <PopoverTrigger asChild>
                  <Button
                    variant={isActive ? 'default' : 'ghost'}
                    size="sm"
                    className={[
                      'rounded-lg px-3',
                      isActive
                        ? 'bg-[#6f4bb3] text-white hover:bg-[#6f4bb3]'
                        : 'text-[#5b3ba4] hover:bg-[#f0e5ff] dark:text-purple-100 dark:hover:bg-purple-900/60',
                    ].join(' ')}
                  >
                    <span className="flex items-center gap-1">
                      Category
                      <ChevronDown className="h-3 w-3 opacity-80" />
                    </span>
                  </Button>
                </PopoverTrigger>
                <PopoverContent className="w-[200px] rounded-xl border-[#d9c7f5] bg-white shadow-lg dark:border-purple-900/50 dark:bg-purple-950/60">
                  <div className="flex flex-col gap-1 text-sm text-[#5b3ba4] dark:text-purple-50">
                    <button
                      className="rounded-lg px-2 py-1 text-left hover:bg-[#f0e5ff] dark:hover:bg-purple-900/50"
                      onClick={() => {
                        update({ category: '', type: 'category' });
                        setCategoryOpen(false);
                      }}
                    >
                      All categories
                    </button>
                    {categories.map((c) => (
                      <button
                        key={c}
                        className="rounded-lg px-2 py-1 text-left hover:bg-[#f0e5ff] dark:hover:bg-purple-900/50"
                        onClick={() => {
                          update({ category: c, type: 'category' });
                          setCategoryOpen(false);
                        }}
                      >
                        {c}
                      </button>
                    ))}
                  </div>
                </PopoverContent>
              </Popover>
            );
          }

          if (type === 'coupon') {
            return (
              <Popover
                key={type}
                open={couponOpen && isActive}
                onOpenChange={(open) => {
                  setCouponOpen(open);
                  if (open) {
                    update({ type: 'coupon', coupon: filter.coupon ?? '' });
                    setDateOpen(false);
                    setCategoryOpen(false);
                  }
                }}
              >
                <PopoverTrigger asChild>
                  <Button
                    variant={isActive ? 'default' : 'ghost'}
                    size="sm"
                    className={[
                      'rounded-lg px-3',
                      isActive
                        ? 'bg-[#6f4bb3] text-white hover:bg-[#6f4bb3]'
                        : 'text-[#5b3ba4] hover:bg-[#f0e5ff] dark:text-purple-100 dark:hover:bg-purple-900/60',
                    ].join(' ')}
                  >
                    <span className="flex items-center gap-1">
                      Coupon
                      <ChevronDown className="h-3 w-3 opacity-80" />
                    </span>
                  </Button>
                </PopoverTrigger>
                <PopoverContent className="w-[200px] rounded-xl border-[#d9c7f5] bg-white shadow-lg dark:border-purple-900/50 dark:bg-purple-950/60">
                  <div className="flex flex-col gap-1 text-sm text-[#5b3ba4] dark:text-purple-50">
                    <button
                      className="rounded-lg px-2 py-1 text-left hover:bg-[#f0e5ff] dark:hover:bg-purple-900/50"
                      onClick={() => {
                        update({ coupon: '', type: 'coupon' });
                        setCouponOpen(false);
                      }}
                    >
                      All coupons
                    </button>
                    {coupons.map((c) => (
                      <button
                        key={c}
                        className="rounded-lg px-2 py-1 text-left hover:bg-[#f0e5ff] dark:hover:bg-purple-900/50"
                        onClick={() => {
                          update({ coupon: c, type: 'coupon' });
                          setCouponOpen(false);
                        }}
                      >
                        {c}
                      </button>
                    ))}
                  </div>
                </PopoverContent>
              </Popover>
            );
          }

          // date button with chevron
          return (
            <Button
              key={type}
              variant={isActive ? 'default' : 'ghost'}
              size="sm"
              className={[
                'rounded-lg px-3',
                isActive
                  ? 'bg-[#6f4bb3] text-white hover:bg-[#6f4bb3]'
                  : 'text-[#5b3ba4] hover:bg-[#f0e5ff] dark:text-purple-100 dark:hover:bg-purple-900/60',
              ].join(' ')}
              onClick={() => {
                update({ type: 'date' });
                setDateOpen(true);
                setCategoryOpen(false);
                setCouponOpen(false);
              }}
            >
              <span className="flex items-center gap-1">
                Date
                <ChevronDown className="h-3 w-3 opacity-80" />
              </span>
            </Button>
          );
        })}
      </div>

      <Popover open={dateOpen} onOpenChange={setDateOpen}>
        <PopoverTrigger asChild>
          <Button
            variant="outline"
            className="min-w-[230px] justify-start gap-2 rounded-xl border-[#d9c7f5] bg-white text-[#5b3ba4] shadow-sm hover:bg-[#f0e5ff] dark:border-purple-900/50 dark:bg-purple-950/40 dark:text-purple-50"
          >
            <CalendarIcon className="h-4 w-4 opacity-80" />
            <span className="truncate text-left">{rangeLabel}</span>
          </Button>
        </PopoverTrigger>
        <PopoverContent className="w-[320px] rounded-2xl border-[#d9c7f5] bg-white shadow-lg dark:border-purple-900/50 dark:bg-purple-950/60">
          <div className="flex flex-col gap-3">
            <div className="text-xs font-semibold uppercase text-[#6f4bb3] dark:text-purple-200">
              Date range
            </div>
            <div className="flex items-center gap-2">
              <Input
                type="date"
                className="w-full rounded-xl border-[#d9c7f5] bg-white shadow-sm focus:border-[#6f4bb3] focus:ring-[#6f4bb3] dark:border-purple-900/50 dark:bg-purple-950/40"
                value={toInputDate(filter.date?.from ?? null)}
                onChange={(e) =>
                  update({
                    date: {
                      ...(filter.date ?? {}),
                      from: fromInputDate(e.target.value),
                    },
                  })
                }
              />
              <Input
                type="date"
                className="w-full rounded-xl border-[#d9c7f5] bg-white shadow-sm focus:border-[#6f4bb3] focus:ring-[#6f4bb3] dark:border-purple-900/50 dark:bg-purple-950/40"
                value={toInputDate(filter.date?.to ?? null)}
                onChange={(e) =>
                  update({
                    date: {
                      ...(filter.date ?? {}),
                      to: fromInputDate(e.target.value),
                    },
                  })
                }
              />
            </div>
            <div className="flex flex-wrap gap-2">
              <Button
                variant="secondary"
                size="sm"
                className="rounded-lg bg-[#f0e5ff] text-[#5b3ba4] hover:bg-[#e5d8ff] dark:bg-purple-900/60 dark:text-purple-50 dark:hover:bg-purple-800/70"
                onClick={() => applyPreset(7)}
              >
                Last 7 days
              </Button>
              <Button
                variant="secondary"
                size="sm"
                className="rounded-lg bg-[#f0e5ff] text-[#5b3ba4] hover:bg-[#e5d8ff] dark:bg-purple-900/60 dark:text-purple-50 dark:hover:bg-purple-800/70"
                onClick={() => applyPreset(30)}
              >
                Last 30 days
              </Button>
              <Button
                variant="secondary"
                size="sm"
                className="rounded-lg bg-[#f0e5ff] text-[#5b3ba4] hover:bg-[#e5d8ff] dark:bg-purple-900/60 dark:text-purple-50 dark:hover:bg-purple-800/70"
                onClick={() => applyPreset(365)}
              >
                Last year
              </Button>
            </div>
          </div>
        </PopoverContent>
      </Popover>

    </div>
  );
}
