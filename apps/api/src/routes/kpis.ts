// apps/api/routes/kpis.ts
import { Router, Request, Response } from 'express';
import { prisma } from '../prisma';
import { parseDateRange, round2 } from './analytics/utils';

const router = Router();
const SAMPLE_PRODUCT_NAMES = [
  'Focus Dose Sample Pack - 10 Capsules',
  'Bliss Dose Sample Pack - 10 Capsules',
  'Pure Dose Sample Pack - 10 Capsules',
  'Pure Dose Enigma Sample Pack - 10 Capsules',
];
const SAMPLE_CATEGORY_NAME = 'Capsule samples';
const SAMPLE_NAME_MATCH = { contains: 'Sample Pack', mode: 'insensitive' } as const;
const MOVEMENT_UTM_SOURCE = 'mcrdse-movement';

const sampleItemFilter = {
  OR: [
    { name: { in: SAMPLE_PRODUCT_NAMES } },
    { name: SAMPLE_NAME_MATCH },
    {
      product: {
        OR: [
          { name: { in: SAMPLE_PRODUCT_NAMES } },
          { name: SAMPLE_NAME_MATCH },
          {
            categories: {
              some: {
                category: {
                  name: { equals: SAMPLE_CATEGORY_NAME, mode: 'insensitive' },
                },
              },
            },
          },
        ],
      },
    },
  ],
} as const;

async function getSampleBuyerStats(params: {
  storeId: string;
  fromDate: Date;
  toExclusive: Date;
}) {
  const { storeId, fromDate, toExclusive } = params;
  const sampleOrders = await prisma.order.findMany({
    where: {
      storeId,
      createdAt: { gte: fromDate, lt: toExclusive },
      items: {
        some: sampleItemFilter,
      },
    },
    select: { customerId: true, billingEmail: true, createdAt: true },
  });

  if (!sampleOrders.length) {
    return { sampleBuyers: 0, sampleRepeatBuyers: 0, sampleRepeatRate: null };
  }

  const firstSampleByCustomer = new Map<string, Date>();
  for (const order of sampleOrders) {
    const emailKey = order.billingEmail?.trim().toLowerCase();
    const key = order.customerId != null ? `id:${order.customerId}` : emailKey ? `email:${emailKey}` : null;
    if (!key) continue;
    const existing = firstSampleByCustomer.get(key);
    if (!existing || order.createdAt < existing) {
      firstSampleByCustomer.set(key, order.createdAt);
    }
  }

  const customerIds = Array.from(firstSampleByCustomer.keys())
    .filter((key) => key.startsWith('id:'))
    .map((key) => Number(key.slice(3)))
    .filter((id) => !Number.isNaN(id));
  const billingEmails = Array.from(firstSampleByCustomer.keys())
    .filter((key) => key.startsWith('email:'))
    .map((key) => key.slice(6));
  if (!customerIds.length && !billingEmails.length) {
    return { sampleBuyers: 0, sampleRepeatBuyers: 0, sampleRepeatRate: null };
  }

  const allSampleOrders = await prisma.order.findMany({
    where: {
      storeId,
      OR: [
        customerIds.length ? { customerId: { in: customerIds } } : undefined,
        billingEmails.length ? { billingEmail: { in: billingEmails } } : undefined,
      ].filter(Boolean) as any,
      items: {
        some: sampleItemFilter,
      },
    },
    select: { customerId: true, billingEmail: true },
  });

  const sampleOrderCounts = new Map<string, number>();
  for (const order of allSampleOrders) {
    const emailKey = order.billingEmail?.trim().toLowerCase();
    const key = order.customerId != null ? `id:${order.customerId}` : emailKey ? `email:${emailKey}` : null;
    if (!key) continue;
    sampleOrderCounts.set(key, (sampleOrderCounts.get(key) ?? 0) + 1);
  }

  const repeatBuyerIds = new Set<string>();
  for (const [key, count] of sampleOrderCounts.entries()) {
    if (count >= 2) {
      repeatBuyerIds.add(key);
    }
  }

  const sampleBuyers = firstSampleByCustomer.size;
  const sampleRepeatBuyers = repeatBuyerIds.size;
  const sampleRepeatRate = sampleBuyers
    ? round2((sampleRepeatBuyers / sampleBuyers) * 100)
    : null;

  return { sampleBuyers, sampleRepeatBuyers, sampleRepeatRate };
}

function getUniqueAttributionBuyers(
  rows: { order?: { customerId: number | null; billingEmail: string | null } | null }[]
) {
  const emailToCustomerId = new Map<string, number>();
  for (const row of rows) {
    const customerId = row.order?.customerId ?? null;
    const email = row.order?.billingEmail?.trim().toLowerCase();
    if (customerId != null && email) {
      emailToCustomerId.set(email, customerId);
    }
  }

  const buyers = new Set<string>();
  for (const row of rows) {
    const customerId = row.order?.customerId ?? null;
    if (customerId != null) {
      buyers.add(`id:${customerId}`);
      continue;
    }
    const email = row.order?.billingEmail?.trim().toLowerCase();
    if (!email) continue;
    const mappedId = emailToCustomerId.get(email);
    if (mappedId != null) {
      buyers.add(`id:${mappedId}`);
      continue;
    }
    buyers.add(`email:${email}`);
  }

  return buyers.size;
}

router.get('/', async(req: Request, res: Response) => {
    try{
        const { storeId, type = 'date', from, to, category, coupon } = req.query;

        if (!storeId || typeof storeId !== 'string') {
        return res.status(400).json({ error: 'storeId is required' });
        }

        // ----- 1) Date range (timezone-aware) -----
        const { fromDate, toDate } = parseDateRange(
          typeof from === 'string' ? from : undefined,
          typeof to === 'string' ? to : undefined
        );
        const endExclusive = new Date(toDate.getTime() + 1);

        // previous period range (same length, immediately before current)
        const diffMs = toDate.getTime() - fromDate.getTime();
        const prevTo = new Date(fromDate);
        prevTo.setDate(prevTo.getDate() - 1);
        prevTo.setHours(23, 59, 59, 999);
        const prevFrom = new Date(prevTo.getTime() - diffMs);
        prevFrom.setHours(0, 0, 0, 0);
        const prevEndExclusive = new Date(prevTo.getTime() + 1);

        // ----- 2) Base where for orders -----
        const whereOrders: any = {
        storeId,
        createdAt: {
            gte: fromDate,
            lt: endExclusive,
        },
        };

        const prevWhereOrders: any = {
          storeId,
          createdAt: {
            gte: prevFrom,
            lt: prevEndExclusive,
          },
        };

        // Category filter -> orders that have items with products in that category
        if (type === 'category' && typeof category === 'string' && category) {
        whereOrders.items = {
            some: {
            product: {
                categories: {
                some: {
                    category: {
                    name: category,
                    },
                },
                },
            },
            },
        };

        prevWhereOrders.items = whereOrders.items;
        }

        // Coupon filter -> orders that used that coupon code
        if (type === 'coupon' && typeof coupon === 'string' && coupon) {
        whereOrders.coupons = {
            some: {
            coupon: {
                code: coupon,
            },
            },
        };

        prevWhereOrders.coupons = whereOrders.coupons;
        }
        const leadRateWhere = { ...whereOrders };
        if (type === 'coupon') {
          delete leadRateWhere.coupons;
        }
        const prevLeadRateWhere = { ...prevWhereOrders };
        if (type === 'coupon') {
          delete prevLeadRateWhere.coupons;
        }

        // ----- 3) Run aggregates in parallel -----
        const [
          agg,
          itemsAgg,
          customers,
          refundsAgg,
          newCustomerGroups,
          prevAgg,
          prevItemsAgg,
          prevCustomers,
          prevRefundsAgg,
          prevNewCustomerGroups,
          leadCouponRedeemed,
          prevLeadCouponRedeemed,
          leadCouponCreatedRows,
          prevLeadCouponCreatedRows,
          sampleStats,
          prevSampleStats,
          movementAttributions,
          prevMovementAttributions,
        ] = await Promise.all([
        prisma.order.aggregate({
            _count: { _all: true },
            _sum: { total: true, discountTotal: true, shippingTotal: true, taxTotal: true },
            where: whereOrders,
        }),
        prisma.orderItem.aggregate({
            _sum: { quantity: true },
            where: { order: whereOrders },
        }),
        prisma.order.findMany({
            where: whereOrders,
            select: { customerId: true },
        }),
        prisma.refund.aggregate({
          _sum: { amount: true },
          where: {
            storeId,
            createdAt: {
              gte: fromDate,
              lt: endExclusive,
            },
          },
        }),
        prisma.order.groupBy({
          by: ["customerId"],
          where: {
            storeId,
          },
          _min: { createdAt: true },
        }),
        prisma.order.aggregate({
          _count: { _all: true },
          _sum: { total: true, discountTotal: true, shippingTotal: true, taxTotal: true },
          where: prevWhereOrders,
        }),
        prisma.orderItem.aggregate({
          _sum: { quantity: true },
          where: { order: prevWhereOrders },
        }),
        prisma.order.findMany({
          where: prevWhereOrders,
          select: { customerId: true },
        }),
        prisma.refund.aggregate({
          _sum: { amount: true },
          where: {
            storeId,
            createdAt: {
              gte: prevFrom,
              lt: prevEndExclusive,
            },
          },
        }),
        prisma.order.groupBy({
          by: ["customerId"],
          where: {
            storeId,
          },
          _min: { createdAt: true },
        }),
        prisma.orderCoupon.findMany({
          where: {
            coupon: { code: { startsWith: 'lead-' } },
            order: leadRateWhere,
          },
          select: { coupon: { select: { code: true } } },
        }),
        prisma.orderCoupon.findMany({
          where: {
            coupon: { code: { startsWith: 'lead-' } },
            order: prevLeadRateWhere,
          },
          select: { coupon: { select: { code: true } } },
        }),
        prisma.coupon.findMany({
          where: {
            storeId,
            code: { startsWith: 'lead-' },
            createdAt: { gte: fromDate, lt: endExclusive },
          },
          select: { id: true },
        }),
        prisma.coupon.findMany({
          where: {
            storeId,
            code: { startsWith: 'lead-' },
            createdAt: { gte: prevFrom, lt: prevEndExclusive },
          },
          select: { id: true },
        }),
        getSampleBuyerStats({ storeId, fromDate, toExclusive: endExclusive }),
        getSampleBuyerStats({ storeId, fromDate: prevFrom, toExclusive: prevEndExclusive }),
        prisma.orderAttribution.findMany({
          where: {
            utmSource: { equals: MOVEMENT_UTM_SOURCE, mode: 'insensitive' },
            order: whereOrders,
          },
          select: {
            order: {
              select: { customerId: true, billingEmail: true },
            },
          },
        }),
        prisma.orderAttribution.findMany({
          where: {
            utmSource: { equals: MOVEMENT_UTM_SOURCE, mode: 'insensitive' },
            order: prevWhereOrders,
          },
          select: {
            order: {
              select: { customerId: true, billingEmail: true },
            },
          },
        }),
        ]);

        const orders = agg._count._all || 0;
        const revenue = agg._sum.total || 0;
        const units = itemsAgg._sum.quantity || 0;
        const discountTotal = agg._sum.discountTotal || 0;
        const shippingTotal = agg._sum.shippingTotal || 0;
        const taxTotal = agg._sum.taxTotal || 0;
        const refunds = refundsAgg._sum.amount || 0;

        const uniqueCustomers = new Set(
        customers.map((c) => c.customerId).filter((id) => id != null)
        ).size;

        const aov = orders ? revenue / orders : 0;
        const avgItemsPerOrder = orders ? units / orders : 0;

        const newCustomers = newCustomerGroups.filter((g) => {
          if (g.customerId === null || !g._min.createdAt) return false;
          const firstOrder = g._min.createdAt;
          return firstOrder >= fromDate && firstOrder < endExclusive;
        }).length;

        const prevOrders = prevAgg._count._all || 0;
        const prevRevenue = prevAgg._sum.total || 0;
        const prevUnits = prevItemsAgg._sum.quantity || 0;
        const prevDiscountTotal = prevAgg._sum.discountTotal || 0;
        const prevShippingTotal = prevAgg._sum.shippingTotal || 0;
        const prevTaxTotal = prevAgg._sum.taxTotal || 0;
        const prevRefunds = prevRefundsAgg._sum.amount || 0;
        const prevAov = prevOrders ? prevRevenue / prevOrders : 0;
        const prevAvgItemsPerOrder = prevOrders ? prevUnits / prevOrders : 0;
        const prevUniqueCustomers = new Set(
          prevCustomers.map((c) => c.customerId).filter((id) => id != null)
        ).size;
        const prevNewCustomers = prevNewCustomerGroups.filter((g) => {
          if (g.customerId === null || !g._min.createdAt) return false;
          const firstOrder = g._min.createdAt;
          return firstOrder >= prevFrom && firstOrder < prevEndExclusive;
        }).length;
        const leadCouponRedeemedCount = new Set(
          leadCouponRedeemed
            .map((row) => row.coupon?.code)
            .filter((code): code is string => !!code)
        ).size;
        const prevLeadCouponRedeemedCount = new Set(
          prevLeadCouponRedeemed
            .map((row) => row.coupon?.code)
            .filter((code): code is string => !!code)
        ).size;

        const leadCouponCreated = leadCouponCreatedRows.length;
        const prevLeadCouponCreated = prevLeadCouponCreatedRows.length;

        const leadCouponRedemptionRate = leadCouponCreated
          ? round2((leadCouponRedeemedCount / leadCouponCreated) * 100)
          : null;
        const leadCouponRedemptionRatePrev = prevLeadCouponCreated
          ? round2((prevLeadCouponRedeemedCount / prevLeadCouponCreated) * 100)
          : null;
        const movementCustomers = getUniqueAttributionBuyers(movementAttributions);
        const movementCustomersPrev = getUniqueAttributionBuyers(prevMovementAttributions);

        // ----- 4) Send payload -----
        res.json({
        revenue: Number(revenue.toFixed(2)),
        orders,
        aov: Number(aov.toFixed(2)),
        units,
        customers: uniqueCustomers,
        netRevenue: Number((revenue - refunds).toFixed(2)),
        refunds: Number(refunds.toFixed(2)),
        discounts: Number(discountTotal.toFixed(2)),
        shipping: Number(shippingTotal.toFixed(2)),
        tax: Number(taxTotal.toFixed(2)),
        avgItemsPerOrder: Number(avgItemsPerOrder.toFixed(2)),
        newCustomers,
        leadCouponRedemptionRate,
        leadCouponRedemptionRatePrev,
        movementCustomers,
        movementCustomersPrev,
        sampleBuyers: sampleStats.sampleBuyers,
        sampleRepeatBuyers: sampleStats.sampleRepeatBuyers,
        sampleRepeatRate: sampleStats.sampleRepeatRate,
        sampleRepeatRatePrev: prevSampleStats.sampleRepeatRate,
        previous: {
          revenue: Number(prevRevenue.toFixed(2)),
          orders: prevOrders,
          aov: Number(prevAov.toFixed(2)),
          units: prevUnits || 0,
          customers: prevUniqueCustomers,
          netRevenue: Number((prevRevenue - prevRefunds).toFixed(2)),
          refunds: Number(prevRefunds.toFixed(2)),
          discounts: Number(prevDiscountTotal.toFixed(2)),
          shipping: Number(prevShippingTotal.toFixed(2)),
          tax: Number(prevTaxTotal.toFixed(2)),
          avgItemsPerOrder: Number(prevAvgItemsPerOrder.toFixed(2)),
          newCustomers: prevNewCustomers,
          sampleBuyers: prevSampleStats.sampleBuyers,
          sampleRepeatBuyers: prevSampleStats.sampleRepeatBuyers,
        }
        });
    } catch (e: any) {
        console.error('GET /kpis error:', e);
        res.status(500).json({ error: e?.message || 'Internal server error' });
    }
});

export default router;
