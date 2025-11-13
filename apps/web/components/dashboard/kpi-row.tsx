'use client';

import { DollarSign, ShoppingCart, LineChart as LineIcon, Package, Users } from 'lucide-react';
import { fmtMoney } from '@/lib/money';
import { KpiCard } from './kpi-card';

export interface KpiRowProps {
  revenue: number;
  orders: number;
  aov: number;
  units: number;
  customers: number;
}

export function KpiRow({ revenue, orders, aov, units, customers }: KpiRowProps) {
  return (
    <section className="grid grid-cols-1 gap-4 sm:grid-cols-2 xl:grid-cols-5">
      <KpiCard
        icon={<DollarSign className="h-5 w-5" />}
        label="Revenue"
        value={fmtMoney(revenue)}
      />
      <KpiCard
        icon={<ShoppingCart className="h-5 w-5" />}
        label="Orders"
        value={orders.toLocaleString()}
      />
      <KpiCard
        icon={<LineIcon className="h-5 w-5" />}
        label="AOV"
        value={fmtMoney(aov)}
      />
      <KpiCard
        icon={<Package className="h-5 w-5" />}
        label="Units sold"
        value={units.toLocaleString()}
      />
      <KpiCard
        icon={<Users className="h-5 w-5" />}
        label="Customers"
        value={customers.toLocaleString()}
      />
    </section>
  );
}