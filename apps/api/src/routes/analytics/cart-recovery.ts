import { Request, Response, Router } from "express";
import { prisma } from "../../prisma";
import {
  buildContinuousSeries,
  buildOrderWhere,
  parseDateQuery,
  round2,
  ymd,
} from "./utils";

const ABANDONED_STATUSES = new Set(["pending", "failed", "cancelled"]);
const SUCCESS_STATUSES = new Set(["processing", "completed"]);

function normalizeStatus(status: string | null | undefined) {
  return String(status || "").trim().toLowerCase();
}

function customerKey(order: { customerId: number | null; billingEmail: string | null }) {
  if (order.customerId != null) return `c:${order.customerId}`;
  const email = (order.billingEmail || "").trim().toLowerCase();
  if (email) return `e:${email}`;
  return null;
}

function parseRecoveryWindowDays(value: unknown) {
  const num = Number(value);
  if (!Number.isFinite(num)) return 30;
  return Math.min(Math.max(Math.round(num), 1), 120);
}

type SuccessEvent = {
  createdAtMs: number;
};

type RecoverySpeedBucketDef = {
  id: string;
  label: string;
  minHours: number;
  maxHours: number | null;
};

const RECOVERY_SPEED_BUCKETS: RecoverySpeedBucketDef[] = [
  { id: "h0_24", label: "0-24h", minHours: 0, maxHours: 24 },
  { id: "d1_3", label: "1-3d", minHours: 24, maxHours: 72 },
  { id: "d4_7", label: "4-7d", minHours: 72, maxHours: 168 },
  { id: "d8_30", label: "8-30d", minHours: 168, maxHours: 720 },
];

function firstSuccessAfter(
  events: SuccessEvent[],
  afterMs: number,
  untilMs: number
) {
  if (!events.length) return null;
  let lo = 0;
  let hi = events.length - 1;
  let idx = -1;
  while (lo <= hi) {
    const mid = Math.floor((lo + hi) / 2);
    if (events[mid].createdAtMs > afterMs) {
      idx = mid;
      hi = mid - 1;
    } else {
      lo = mid + 1;
    }
  }
  if (idx < 0) return null;
  const candidate = events[idx];
  return candidate.createdAtMs <= untilMs ? candidate : null;
}

function getSpeedBucketId(hours: number) {
  const match = RECOVERY_SPEED_BUCKETS.find((bucket) => {
    const withinMin = hours >= bucket.minHours;
    const withinMax = bucket.maxHours == null ? true : hours < bucket.maxHours;
    return withinMin && withinMax;
  });
  return match?.id || null;
}

export function registerCartRecoveryRoute(router: Router) {
  router.get("/cart-recovery", async (req: Request, res: Response) => {
    try {
      const { storeId } = req.query as { storeId?: string };
      if (!storeId) return res.status(400).json({ error: "Missing storeId" });

      const { fromDate, toDate } = parseDateQuery(req);
      const recoveryWindowDays = parseRecoveryWindowDays(
        (req.query as { recoveryWindowDays?: string }).recoveryWindowDays
      );

      const recoveryToDate = new Date(toDate);
      recoveryToDate.setDate(recoveryToDate.getDate() + recoveryWindowDays);

      const orders = await prisma.order.findMany({
        where: buildOrderWhere(req, fromDate, recoveryToDate),
        select: {
          createdAt: true,
          status: true,
          customerId: true,
          billingEmail: true,
        },
        orderBy: { createdAt: "asc" },
      });

      const successByCustomer = new Map<string, SuccessEvent[]>();
      for (const order of orders) {
        const status = normalizeStatus(order.status);
        if (!SUCCESS_STATUSES.has(status)) continue;
        const key = customerKey(order);
        if (!key) continue;
        if (!successByCustomer.has(key)) successByCustomer.set(key, []);
        successByCustomer.get(key)!.push({ createdAtMs: order.createdAt.getTime() });
      }

      const inRangeStart = fromDate.getTime();
      const inRangeEnd = toDate.getTime();

      const abandonedCandidates = orders.filter((order) => {
        const ts = order.createdAt.getTime();
        if (ts < inRangeStart || ts > inRangeEnd) return false;
        return ABANDONED_STATUSES.has(normalizeStatus(order.status));
      });

      let unattributedAbandonedOrders = 0;
      let recoveredOrders = 0;
      const abandonedCustomerKeys = new Set<string>();
      const customerFirstAbandoned = new Map<string, number>();

      const byDay = new Map<
        string,
        {
          abandonedOrders: number;
          recoveredOrders: number;
          abandonedCustomers: Set<string>;
          recoveredCustomers: Set<string>;
        }
      >();

      for (const order of abandonedCandidates) {
        const day = ymd(order.createdAt);
        if (!byDay.has(day)) {
          byDay.set(day, {
            abandonedOrders: 0,
            recoveredOrders: 0,
            abandonedCustomers: new Set<string>(),
            recoveredCustomers: new Set<string>(),
          });
        }
        const bucket = byDay.get(day)!;
        bucket.abandonedOrders += 1;

        const key = customerKey(order);
        if (!key) {
          unattributedAbandonedOrders += 1;
          continue;
        }

        const abandonmentTs = order.createdAt.getTime();
        abandonedCustomerKeys.add(key);
        if (!customerFirstAbandoned.has(key)) {
          customerFirstAbandoned.set(key, abandonmentTs);
        } else if (abandonmentTs < customerFirstAbandoned.get(key)!) {
          customerFirstAbandoned.set(key, abandonmentTs);
        }
        bucket.abandonedCustomers.add(key);

        const recoverUntilTs =
          abandonmentTs + recoveryWindowDays * 24 * 60 * 60 * 1000;
        const successEvents = successByCustomer.get(key) || [];
        const match = firstSuccessAfter(successEvents, abandonmentTs, recoverUntilTs);
        if (!match) continue;

        recoveredOrders += 1;
        bucket.recoveredOrders += 1;
        bucket.recoveredCustomers.add(key);
      }

      const recoveredCustomerKeys = new Set<string>();
      const customerRecoveryHours: number[] = [];
      const speedBucketCounts = new Map<string, number>(
        RECOVERY_SPEED_BUCKETS.map((bucket) => [bucket.id, 0])
      );

      for (const [key, abandonmentTs] of customerFirstAbandoned.entries()) {
        const successEvents = successByCustomer.get(key) || [];
        const recoverUntilTs = abandonmentTs + recoveryWindowDays * 24 * 60 * 60 * 1000;
        const match = firstSuccessAfter(successEvents, abandonmentTs, recoverUntilTs);
        if (!match) continue;
        recoveredCustomerKeys.add(key);
        const hours = (match.createdAtMs - abandonmentTs) / (60 * 60 * 1000);
        customerRecoveryHours.push(hours);
        const bucketId = getSpeedBucketId(hours);
        if (bucketId) {
          speedBucketCounts.set(bucketId, (speedBucketCounts.get(bucketId) || 0) + 1);
        }
      }

      customerRecoveryHours.sort((a, b) => a - b);
      const medianRecoveryHours = customerRecoveryHours.length
        ? customerRecoveryHours[Math.floor(customerRecoveryHours.length / 2)]
        : null;
      const averageRecoveryHours = customerRecoveryHours.length
        ? customerRecoveryHours.reduce((sum, n) => sum + n, 0) / customerRecoveryHours.length
        : null;

      const points = buildContinuousSeries(fromDate, toDate, byDay, (date, bucket) => {
        const abandonedOrders = bucket?.abandonedOrders ?? 0;
        const recoveredOrdersForDay = bucket?.recoveredOrders ?? 0;
        const abandonedCustomersForDay = bucket?.abandonedCustomers?.size ?? 0;
        const recoveredCustomersForDay = bucket?.recoveredCustomers?.size ?? 0;
        return {
          date,
          abandonedOrders,
          recoveredOrders: recoveredOrdersForDay,
          abandonedCustomers: abandonedCustomersForDay,
          recoveredCustomers: recoveredCustomersForDay,
          orderRecoveryRate: abandonedOrders
            ? round2((recoveredOrdersForDay / abandonedOrders) * 100)
            : 0,
          customerRecoveryRate: abandonedCustomersForDay
            ? round2((recoveredCustomersForDay / abandonedCustomersForDay) * 100)
            : 0,
        };
      });

      const abandonedOrdersTotal = abandonedCandidates.length;
      const abandonedCustomersTotal = abandonedCustomerKeys.size;
      const recoveredCustomersTotal = recoveredCustomerKeys.size;
      const unrecoveredCustomersTotal = Math.max(
        0,
        abandonedCustomersTotal - recoveredCustomersTotal
      );
      const recoveredWithin24h = customerRecoveryHours.filter((hours) => hours <= 24).length;
      const speedBuckets = RECOVERY_SPEED_BUCKETS.map((bucket) => {
        const count = speedBucketCounts.get(bucket.id) || 0;
        return {
          id: bucket.id,
          label: bucket.label,
          count,
          shareRecovered: recoveredCustomersTotal
            ? round2((count / recoveredCustomersTotal) * 100)
            : 0,
          shareAbandoned: abandonedCustomersTotal
            ? round2((count / abandonedCustomersTotal) * 100)
            : 0,
        };
      });

      return res.json({
        summary: {
          abandonedOrders: abandonedOrdersTotal,
          recoveredOrders,
          orderRecoveryRate: abandonedOrdersTotal
            ? round2((recoveredOrders / abandonedOrdersTotal) * 100)
            : 0,
          abandonedCustomers: abandonedCustomersTotal,
          recoveredCustomers: recoveredCustomersTotal,
          unrecoveredCustomers: unrecoveredCustomersTotal,
          customerRecoveryRate: abandonedCustomersTotal
            ? round2((recoveredCustomersTotal / abandonedCustomersTotal) * 100)
            : 0,
          averageRecoveryHours:
            averageRecoveryHours == null ? null : round2(averageRecoveryHours),
          medianRecoveryHours:
            medianRecoveryHours == null ? null : round2(medianRecoveryHours),
          recoveredWithin24h,
          recoveryWindowDays,
          statuses: {
            abandoned: Array.from(ABANDONED_STATUSES),
            success: Array.from(SUCCESS_STATUSES),
          },
        },
        points,
        speedBuckets,
        diagnostics: {
          unattributedAbandonedOrders,
        },
      });
    } catch (err: any) {
      console.error("GET /analytics/cart-recovery error:", err);
      return res.status(500).json({ error: err?.message ?? "Internal server error" });
    }
  });
}
