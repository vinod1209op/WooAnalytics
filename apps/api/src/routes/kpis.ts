// apps/api/routes/kpis.ts
import { Router, Request, Response } from 'express';
import { prisma } from '../prisma';
import { parseDateRange } from './analytics/utils';

const router = Router();

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
        }
        });
    } catch (e: any) {
        console.error('GET /kpis error:', e);
        res.status(500).json({ error: e?.message || 'Internal server error' });
    }
});

export default router;
