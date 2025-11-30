import { Client } from '@notionhq/client';

type KpiPeriod = {
  revenue: number;
  orders: number;
  aov: number;
  units: number;
  customers: number;
  netRevenue: number;
  refunds: number;
  discounts: number;
  shipping: number;
  tax: number;
  avgItemsPerOrder: number;
  newCustomers: number;
};

export type KpiSummary = KpiPeriod & {
  previous?: Partial<KpiPeriod>;
};

type SnapshotOptions = {
  databaseId?: string;
  storeId: string;
  periodLabel?: string;
  date?: string | Date;
  kpis: KpiSummary;
};

const notionToken = process.env.NOTION_TOKEN;
const defaultDatabaseId = process.env.NOTION_DB_ID_KPIS || process.env.NOTION_DB_ID;

function buildNumberProperties(source: Record<string, number | undefined>) {
  return Object.entries(source).reduce<Record<string, { number: number }>>(
    (acc, [name, value]) => {
      if (typeof value === 'number' && !Number.isNaN(value)) {
        acc[name] = { number: value };
      }
      return acc;
    },
    {}
  );
}

export async function createKpiSnapshot(options: SnapshotOptions) {
  if (!notionToken) {
    throw new Error('NOTION_TOKEN is required to push KPI snapshots to Notion');
  }

  const databaseId = options.databaseId || defaultDatabaseId;
  if (!databaseId) {
    throw new Error('NOTION_DB_ID_KPIS (or NOTION_DB_ID) is required to push KPI snapshots to Notion');
  }

  const notion = new Client({ auth: notionToken });

  const snapshotDate = options.date ? new Date(options.date) : new Date();
  const label = options.periodLabel || snapshotDate.toISOString().slice(0, 10);

  const baseNumbers = buildNumberProperties({
    Revenue: options.kpis.revenue,
    Orders: options.kpis.orders,
    AOV: options.kpis.aov,
    Units: options.kpis.units,
    Customers: options.kpis.customers,
    'Net Revenue': options.kpis.netRevenue,
    Refunds: options.kpis.refunds,
    Discounts: options.kpis.discounts,
    Shipping: options.kpis.shipping,
    Tax: options.kpis.tax,
    'Avg Items/Order': options.kpis.avgItemsPerOrder,
    'New Customers': options.kpis.newCustomers,
  });

  const prevNumbers = options.kpis.previous
    ? buildNumberProperties({
        'Prev Revenue': options.kpis.previous.revenue,
        'Prev Orders': options.kpis.previous.orders,
        'Prev AOV': options.kpis.previous.aov,
        'Prev Units': options.kpis.previous.units,
        'Prev Customers': options.kpis.previous.customers,
        'Prev Net Revenue': options.kpis.previous.netRevenue,
        'Prev Refunds': options.kpis.previous.refunds,
        'Prev Discounts': options.kpis.previous.discounts,
        'Prev Shipping': options.kpis.previous.shipping,
        'Prev Tax': options.kpis.previous.tax,
        'Prev Avg Items/Order': options.kpis.previous.avgItemsPerOrder,
        'Prev New Customers': options.kpis.previous.newCustomers,
      })
    : {};

  const properties: Record<string, any> = {
    Name: {
      title: [{ text: { content: `KPI Snapshot – ${label}` } }],
    },
    Date: {
      date: {
        start: snapshotDate.toISOString(),
      },
    },
    Store: {
      rich_text: [{ text: { content: options.storeId } }],
    },
    ...baseNumbers,
    ...prevNumbers,
  };

  const page = await notion.pages.create({
    parent: { database_id: databaseId },
    properties,
  });

  return page;
}
