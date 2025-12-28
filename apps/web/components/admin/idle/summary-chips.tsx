'use client';

export type SummaryItem = {
  label: string;
  value: string | number | null | undefined;
};

export function SummaryChips({ items }: { items: SummaryItem[] }) {
  return (
    <div className="mt-3 flex flex-wrap gap-2 text-xs text-slate-500">
      {items.map((item) => (
        <div
          key={item.label}
          className="flex items-center gap-2 rounded-full border border-[#eadcff] bg-white/70 px-3 py-1 text-[12px] text-slate-500 shadow-sm dark:border-purple-900/40 dark:bg-purple-950/40"
        >
          <span>{item.label}</span>
          <span className="text-[12px] font-semibold normal-case text-[#5b3ba4] dark:text-purple-100">
            {item.value ?? '—'}
          </span>
        </div>
      ))}
    </div>
  );
}
