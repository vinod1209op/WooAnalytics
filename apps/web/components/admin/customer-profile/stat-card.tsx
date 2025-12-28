'use client';

export function StatCard({
  label,
  value,
  hint,
}: {
  label: string;
  value: string | number | null | undefined;
  hint?: string;
}) {
  return (
    <div className="rounded-2xl border border-[#eadcff] bg-white/80 p-3 shadow-sm dark:border-purple-900/40 dark:bg-purple-950/30">
      <div className="text-xs font-semibold uppercase tracking-wide text-[#7a5bcf] dark:text-purple-200">
        {label}
      </div>
      <div className="mt-1 text-base font-semibold text-[#5b3ba4] dark:text-purple-100">
        {value ?? '—'}
      </div>
      {hint && <div className="text-xs text-slate-500">{hint}</div>}
    </div>
  );
}
