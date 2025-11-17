// apps/api/routes/kpis.ts
import { Router, Request, Response } from 'express';
import { prisma } from './prisma';

const router = Router();

router.get('/', async(req: Request, res: Response) => {
    try{
        const { storeId, type = 'date', from, to, category, coupon } = req.query;

        if (!storeId || typeof storeId !== 'string') {
        return res.status(400).json({ error: 'storeId is required' });
        }

        // ----- 1) Date range -----
        const now = new Date();

        let fromDate =
        typeof from === 'string' && from
            ? new Date(from + 'T00:00:00')
            : new Date(now);
        let toDate =
        typeof to === 'string' && to
            ? new Date(to + 'T23:59:59.999')
            : new Date(now);

        // default to "last 30 days" if no from/to
        if (!from || !to) {
        toDate = new Date(now);
        toDate.setHours(23, 59, 59, 999);
        fromDate = new Date(now);
        fromDate.setDate(fromDate.getDate() - 29);
        fromDate.setHours(0, 0, 0, 0);
        }

        if (Number.isNaN(+fromDate) || Number.isNaN(+toDate)) {
        return res.status(400).json({ error: 'Invalid from/to date' });
        }

        // ----- 2) Base where for orders -----
        const whereOrders: any = {
        storeId,
        createdAt: {
            gte: fromDate,
            lte: toDate,
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
        }
        // ----- 3) Run aggregates in parallel -----
        const [agg, itemsAgg, customers] = await Promise.all([
        prisma.order.aggregate({
            _count: { _all: true },
            _sum: { total: true },
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
        ]);

        const orders = agg._count._all || 0;
        const revenue = agg._sum.total || 0;
        const units = itemsAgg._sum.quantity || 0;

        const uniqueCustomers = new Set(
        customers.map((c) => c.customerId).filter((id) => id != null)
        ).size;

        const aov = orders ? revenue / orders : 0;

        // ----- 4) Send payload -----
        res.json({
        revenue: Number(revenue.toFixed(2)),
        orders,
        aov: Number(aov.toFixed(2)),
        units,
        customers: uniqueCustomers,
        });
    } catch (e: any) {
        console.error('GET /kpis error:', e);
        res.status(500).json({ error: e?.message || 'Internal server error' });
    }
});

export default router;