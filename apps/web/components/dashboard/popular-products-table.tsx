'use client';

import { usePopularProducts } from '@/hooks/usePopularProducts';

export function PopularProductsTable() {
  const { products, loading } = usePopularProducts();

  return (
    <section className="rounded-2xl border border-slate-200 bg-white/80 p-4 shadow-sm backdrop-blur-sm dark:border-slate-800 dark:bg-slate-900/70">
      <header className="mb-3 flex items-center justify-between gap-3">
        <div>
          <h2 className="text-base font-semibold text-slate-900 dark:text-slate-50">
            Popular products
          </h2>
          <p className="text-xs text-slate-500 dark:text-slate-400">
            Top 10 by units sold
          </p>
        </div>
      </header>

      {loading ? (
        <div className="h-32 animate-pulse rounded-xl bg-slate-100 dark:bg-slate-800" />
      ) : !products.length ? (
        <div className="flex items-center justify-center rounded-xl border border-dashed border-slate-200 p-6 text-sm text-slate-500 dark:border-slate-700 dark:text-slate-400">
          No products yet. Once orders sync, you’ll see your top items here.
        </div>
      ) : (
        <div className="overflow-x-auto">
          <table className="min-w-full text-left text-sm">
            <thead>
              <tr className="border-b border-slate-200 text-xs font-medium uppercase tracking-wide text-slate-500 dark:border-slate-800 dark:text-slate-400">
                <th className="py-2 pr-4">Product</th>
                <th className="px-4 py-2">SKU</th>
                <th className="px-4 py-2 text-right">Price</th>
                <th className="px-4 py-2 text-right">Units</th>
                <th className="pl-4 py-2 text-right">Revenue</th>
              </tr>
            </thead>
            <tbody>
              {products.map((p, idx) => {
                const rowBg =
                  idx % 2 === 0
                    ? 'bg-white dark:bg-slate-900'
                    : 'bg-slate-50 dark:bg-slate-900/60';
                const revenue = p.price * p.total_sales;

                return (
                  <tr
                    key={p.id}
                    className={`${rowBg} border-b border-slate-100 last:border-0 hover:bg-slate-50/80 dark:border-slate-800 dark:hover:bg-slate-800/80`}
                  >
                    <td className="max-w-[220px] truncate py-2 pr-4 text-sm font-medium text-slate-900 dark:text-slate-50">
                      <span title={p.name}>{p.name}</span>
                    </td>
                    <td className="px-4 py-2 text-xs text-slate-500 dark:text-slate-400">
                      {p.sku || '—'}
                    </td>
                    <td className="px-4 py-2 text-right text-sm text-slate-900 dark:text-slate-50">
                      ${p.price.toFixed(2)}
                    </td>
                    <td className="px-4 py-2 text-right text-sm text-slate-900 dark:text-slate-50">
                      {p.total_sales.toLocaleString()}
                    </td>
                    <td className="pl-4 py-2 text-right text-sm font-medium text-slate-900 dark:text-slate-50">
                      ${revenue.toFixed(2)}
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      )}
    </section>
  );
}
