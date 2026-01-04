'use client';

import {
  DollarSign,
  ShoppingCart,
  LineChart as LineIcon,
  Package,
  Users,
  RotateCcw,
  Tag,
  BadgePercent,
  Truck,
  Receipt,
  ListOrdered,
  UserPlus,
} from 'lucide-react';
import { fmtMoney } from '@/lib/money';
import { KpiCard } from './kpi-card';
import type { KpiSummary } from '@/types/kpi';

export function KpiRow(kpis: KpiSummary) {
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
  const formatPercent = (value?: number | null) =>
    value == null ? '—' : `${value.toFixed(1)}%`;

  return (
    <section className="grid grid-cols-2 gap-3 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 xl:grid-cols-6">
      <KpiCard
        icon={<DollarSign className="h-5 w-5" />}
        label="Revenue"
        value={fmtMoney(kpis.revenue)}
        hint={pct(kpis.revenue, prev?.revenue)}
      />
      <KpiCard
        icon={<ShoppingCart className="h-5 w-5" />}
        label="Orders"
        value={kpis.orders.toLocaleString()}
        hint={pct(kpis.orders, prev?.orders)}
      />
      <KpiCard
        icon={<LineIcon className="h-5 w-5" />}
        label="AOV"
        value={fmtMoney(kpis.aov)}
        hint={pct(kpis.aov, prev?.aov)}
      />
      <KpiCard
        icon={<Package className="h-5 w-5" />}
        label="Units sold"
        value={kpis.units.toLocaleString()}
        hint={pct(kpis.units, prev?.units)}
      />
      <KpiCard
        icon={<Users className="h-5 w-5" />}
        label="Customers"
        value={kpis.customers.toLocaleString()}
        hint={pct(kpis.customers, prev?.customers)}
      />
      <KpiCard
        icon={<Tag className="h-5 w-5" />}
        label="Lead coupons %"
        value={formatPercent(kpis.leadCouponRedemptionRate)}
        hint={pct(
          kpis.leadCouponRedemptionRate ?? 0,
          kpis.leadCouponRedemptionRatePrev ?? undefined
        )}
      />
      <KpiCard
        icon={<RotateCcw className="h-5 w-5" />}
        label="Refunds"
        value={fmtMoney(kpis.refunds)}
        hint={pct(kpis.refunds, prev?.refunds)}
      />
      <KpiCard
        icon={<BadgePercent className="h-5 w-5" />}
        label="Discounts"
        value={fmtMoney(kpis.discounts)}
        hint={pct(kpis.discounts, prev?.discounts)}
      />
      <KpiCard
        icon={<Truck className="h-5 w-5" />}
        label="Shipping"
        value={fmtMoney(kpis.shipping)}
        hint={pct(kpis.shipping, prev?.shipping)}
      />
      <KpiCard
        icon={<Receipt className="h-5 w-5" />}
        label="Tax collected"
        value={fmtMoney(kpis.tax)}
        hint={pct(kpis.tax, prev?.tax)}
      />
      <KpiCard
        icon={<ListOrdered className="h-5 w-5" />}
        label="Avg items/order"
        value={kpis.avgItemsPerOrder.toFixed(2)}
        hint={pct(kpis.avgItemsPerOrder, prev?.avgItemsPerOrder)}
      />
      <KpiCard
        icon={<UserPlus className="h-5 w-5" />}
        label="New customers"
        value={kpis.newCustomers.toLocaleString()}
        hint={pct(kpis.newCustomers, prev?.newCustomers)}
      />
    </section>
  );
}
