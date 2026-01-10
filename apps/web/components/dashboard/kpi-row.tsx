'use client';

import { useEffect, useMemo } from 'react';
import {
  DollarSign,
  Banknote,
  ShoppingCart,
  LineChart as LineIcon,
  Package,
  Users,
  RotateCcw,
  BadgePercent,
  Truck,
  Receipt,
  ListOrdered,
  UserPlus,
} from 'lucide-react';
import { fmtMoney } from '@/lib/money';
import { KpiCard } from './kpi-card';
import type { KpiSummary } from '@/types/kpi';

type KpiRowProps = KpiSummary & {
  startIndex?: number;
  pageSize?: number;
  onTotalCountChange?: (count: number) => void;
};

export function KpiRow({
  startIndex = 0,
  pageSize = 12,
  onTotalCountChange,
  ...kpis
}: KpiRowProps) {
  const prev = kpis.previous;
  const pct = (current: number, previous?: number) => {
    if (previous === undefined || previous === 0) return undefined;
    const delta = ((current - previous) / previous) * 100;
    const positive = delta >= 0;
    const sign = positive ? '▲' : '▼';
    return {
      text: `${sign} ${Math.abs(delta).toFixed(1)}%`,
      positive,
    };
  };

  const cards = useMemo(
    () => [
      {
        label: 'Revenue',
        icon: <DollarSign className="h-5 w-5" />,
        value: fmtMoney(kpis.revenue),
        hint: pct(kpis.revenue, prev?.revenue),
      },
      {
        label: 'Orders',
        icon: <ShoppingCart className="h-5 w-5" />,
        value: kpis.orders.toLocaleString(),
        hint: pct(kpis.orders, prev?.orders),
      },
      {
        label: 'AOV',
        icon: <LineIcon className="h-5 w-5" />,
        value: fmtMoney(kpis.aov),
        hint: pct(kpis.aov, prev?.aov),
      },
      {
        label: 'Units sold',
        icon: <Package className="h-5 w-5" />,
        value: kpis.units.toLocaleString(),
        hint: pct(kpis.units, prev?.units),
      },
      {
        label: 'Customers',
        icon: <Users className="h-5 w-5" />,
        value: kpis.customers.toLocaleString(),
        hint: pct(kpis.customers, prev?.customers),
      },
      {
        label: 'Net revenue',
        icon: <Banknote className="h-5 w-5" />,
        value: fmtMoney(kpis.netRevenue),
        hint: pct(kpis.netRevenue, prev?.netRevenue),
      },
      {
        label: 'Refunds',
        icon: <RotateCcw className="h-5 w-5" />,
        value: fmtMoney(kpis.refunds),
        hint: pct(kpis.refunds, prev?.refunds),
      },
      {
        label: 'Discounts',
        icon: <BadgePercent className="h-5 w-5" />,
        value: fmtMoney(kpis.discounts),
        hint: pct(kpis.discounts, prev?.discounts),
      },
      {
        label: 'Shipping',
        icon: <Truck className="h-5 w-5" />,
        value: fmtMoney(kpis.shipping),
        hint: pct(kpis.shipping, prev?.shipping),
      },
      {
        label: 'Tax collected',
        icon: <Receipt className="h-5 w-5" />,
        value: fmtMoney(kpis.tax),
        hint: pct(kpis.tax, prev?.tax),
      },
      {
        label: 'Avg items/order',
        icon: <ListOrdered className="h-5 w-5" />,
        value: kpis.avgItemsPerOrder.toFixed(2),
        hint: pct(kpis.avgItemsPerOrder, prev?.avgItemsPerOrder),
      },
      {
        label: 'New customers',
        icon: <UserPlus className="h-5 w-5" />,
        value: kpis.newCustomers.toLocaleString(),
        hint: pct(kpis.newCustomers, prev?.newCustomers),
      },
    ],
    [kpis, prev]
  );

  const totalCount = cards.length;
  const windowSize = Math.min(pageSize, totalCount);
  const safeIndex = totalCount
    ? ((startIndex % totalCount) + totalCount) % totalCount
    : 0;
  const visibleCards =
    totalCount <= pageSize
      ? cards
      : Array.from({ length: windowSize }, (_, idx) => cards[(safeIndex + idx) % totalCount]);

  useEffect(() => {
    onTotalCountChange?.(totalCount);
  }, [onTotalCountChange, totalCount]);

  return (
    <section className="grid grid-cols-2 gap-3 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 xl:grid-cols-6">
      {visibleCards.map((card) => (
        <KpiCard
          key={card.label}
          icon={card.icon}
          label={card.label}
          value={card.value}
          hint={card.hint}
        />
      ))}
    </section>
  );
}
