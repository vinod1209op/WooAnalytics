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

export const KPI_NUMBER_PROPERTIES = [
  'Revenue',
  'Orders',
  'AOV',
  'Units',
  'Customers',
  'Net Revenue',
  'Refunds',
  'Discounts',
  'Shipping',
  'Tax',
  'Avg Items/Order',
  'New Customers',
  'Lead Coupon %',
  'Lead Coupons Created',
  'Lead Coupons Redeemed',
  'Lead Coupon Uses',
  'Lead Coupon Orders',
  'New Orders',
  'Returning Orders',
  'Repeat Rate',
  'Prev Revenue',
  'Prev Orders',
  'Prev AOV',
  'Prev Units',
  'Prev Customers',
  'Prev Net Revenue',
  'Prev Refunds',
  'Prev Discounts',
  'Prev Shipping',
  'Prev Tax',
  'Prev Avg Items/Order',
  'Prev New Customers',
  'Prev Lead Coupon %',
];

export const KPI_TEXT_PROPERTIES = [
  'Top Products',
  'Top Categories',
  'Segment Counts',
];

export type KpiSummary = KpiPeriod & {
  leadCouponRedemptionRate?: number | null;
  leadCouponRedemptionRatePrev?: number | null;
  leadCouponsCreated?: number | null;
  leadCouponsRedeemed?: number | null;
  leadCouponUses?: number | null;
  leadCouponOrders?: number | null;
  newOrders?: number | null;
  returningOrders?: number | null;
  repeatRate?: number | null;
  topProducts?: string | null;
  topCategories?: string | null;
  segmentCounts?: string | null;
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

function buildTextProperties(source: Record<string, string | undefined>) {
  return Object.entries(source).reduce<Record<string, { rich_text: { text: { content: string } }[] }>>(
    (acc, [name, value]) => {
      if (typeof value === 'string' && value.trim().length > 0) {
        acc[name] = {
          rich_text: [{ text: { content: value.trim() } }],
        };
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
    'Lead Coupon %': options.kpis.leadCouponRedemptionRate ?? undefined,
    'Lead Coupons Created': options.kpis.leadCouponsCreated ?? undefined,
    'Lead Coupons Redeemed': options.kpis.leadCouponsRedeemed ?? undefined,
    'Lead Coupon Uses': options.kpis.leadCouponUses ?? undefined,
    'Lead Coupon Orders': options.kpis.leadCouponOrders ?? undefined,
    'New Orders': options.kpis.newOrders ?? undefined,
    'Returning Orders': options.kpis.returningOrders ?? undefined,
    'Repeat Rate': options.kpis.repeatRate ?? undefined,
  });

  const previous = options.kpis.previous ?? {};
  const prevNumbers = buildNumberProperties({
    'Prev Revenue': previous.revenue ?? undefined,
    'Prev Orders': previous.orders ?? undefined,
    'Prev AOV': previous.aov ?? undefined,
    'Prev Units': previous.units ?? undefined,
    'Prev Customers': previous.customers ?? undefined,
    'Prev Net Revenue': previous.netRevenue ?? undefined,
    'Prev Refunds': previous.refunds ?? undefined,
    'Prev Discounts': previous.discounts ?? undefined,
    'Prev Shipping': previous.shipping ?? undefined,
    'Prev Tax': previous.tax ?? undefined,
    'Prev Avg Items/Order': previous.avgItemsPerOrder ?? undefined,
    'Prev New Customers': previous.newCustomers ?? undefined,
    'Prev Lead Coupon %': options.kpis.leadCouponRedemptionRatePrev ?? undefined,
  });

  const baseText = buildTextProperties({
    'Top Products': options.kpis.topProducts ?? undefined,
    'Top Categories': options.kpis.topCategories ?? undefined,
    'Segment Counts': options.kpis.segmentCounts ?? undefined,
  });

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
    ...baseText,
    ...prevNumbers,
  };

  const db = await notion.databases.retrieve({ database_id: databaseId });
  const dbProps = db.properties ?? {};

  const missingNumberProps: Record<string, any> = {};
  const numberProps = { ...baseNumbers, ...prevNumbers };
  Object.keys(numberProps).forEach((name) => {
    const existing = dbProps[name];
    if (!existing) {
      missingNumberProps[name] = { number: { format: "number" } };
    }
  });

  const missingTextProps: Record<string, any> = {};
  const textProps = { ...baseText };
  Object.keys(textProps).forEach((name) => {
    const existing = dbProps[name];
    if (!existing) {
      missingTextProps[name] = { rich_text: {} };
    }
  });

  let schemaUpdated = false;
  if (Object.keys(missingNumberProps).length > 0 || Object.keys(missingTextProps).length > 0) {
    try {
      await notion.databases.update({
        database_id: databaseId,
        properties: { ...missingNumberProps, ...missingTextProps },
      });
      schemaUpdated = true;
    } catch (err) {
      console.warn("Notion schema update failed; continuing with existing properties.", err);
    }
  }

  const allowedKeys = new Set(Object.keys(dbProps));
  if (schemaUpdated) {
    Object.keys(missingNumberProps).forEach((name) => allowedKeys.add(name));
    Object.keys(missingTextProps).forEach((name) => allowedKeys.add(name));
  }

  const safeProperties: Record<string, any> = {};
  Object.entries(properties).forEach(([key, value]) => {
    if (key === "Name" || key === "Date" || key === "Store") {
      safeProperties[key] = value;
      return;
    }
    if (allowedKeys.has(key)) {
      safeProperties[key] = value;
    }
  });

  const page = await notion.pages.create({
    parent: { database_id: databaseId },
    properties: safeProperties,
  });

  return page;
}
