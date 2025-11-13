'use client';

export type FilterType = 'date' | 'category' | 'coupon';

export type DateRangeValue = { from?: Date; to?: Date} | null;

const toInputDate = (d?: Date | null) =>
  d ? d.toISOString().slice(0, 10) : '';

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
  // helper to update a piece of state
  const update = (patch: Partial<FilterState>) =>
    onChange({ ...filter, ...patch });

  return (
    <div className="flex flex-wrap items-center gap-3">
      {/* Filter type selector */}
      <select
        className="rounded-xl border border-slate-200 bg-white px-3 py-2 text-sm
                   dark:border-slate-700 dark:bg-slate-900 dark:text-slate-100"
        value={filter.type}
        onChange={(e) => {
          const type = e.target.value as FilterType;
          if (type === 'date') {
            update({ type });
          } else if (type === 'category') {
            update({ type, category: '' });
          } else {
            update({ type, coupon: '' });
          }
        }}
      >
        <option value="date">Date</option>
        <option value="category">Category</option>
        <option value="coupon">Coupon</option>
      </select>

      {/* Date range (always available, but especially for type="date") */}
      <div className="flex items-center gap-2 text-sm">
        <span className="text-slate-500 dark:text-slate-400">From</span>
        <input
          type="date"
          className="rounded-lg border border-slate-200 bg-white px-2 py-1
                    dark:border-slate-700 dark:bg-slate-900 dark:text-slate-100"
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

        <span className="text-slate-500 dark:text-slate-400">To</span>
        <input
          type="date"
          className="rounded-lg border border-slate-200 bg-white px-2 py-1
                    dark:border-slate-700 dark:bg-slate-900 dark:text-slate-100"
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

      {/* Category dropdown (only when type = category) */}
      {filter.type === 'category' && (
        <select
          className="rounded-xl border border-slate-200 bg-white px-3 py-2 text-sm
                     dark:border-slate-700 dark:bg-slate-900 dark:text-slate-100"
          value={filter.category}
          onChange={(e) => update({ category: e.target.value })}
        >
          <option value="">All categories</option>
          {categories.map((c) => (
            <option key={c} value={c}>
              {c}
            </option>
          ))}
        </select>
      )}

      {/* Coupon dropdown (only when type = coupon) */}
      {filter.type === 'coupon' && (
        <select
          className="rounded-xl border border-slate-200 bg-white px-3 py-2 text-sm
                     dark:border-slate-700 dark:bg-slate-900 dark:text-slate-100"
          value={filter.coupon}
          onChange={(e) => update({ coupon: e.target.value })}
        >
          <option value="">All coupons</option>
          {coupons.map((c) => (
            <option key={c} value={c}>
              {c}
            </option>
          ))}
        </select>
      )}
    </div>
  );
}
