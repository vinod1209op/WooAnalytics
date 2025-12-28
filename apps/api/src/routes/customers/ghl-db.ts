import { prisma } from "../../prisma";

type ContactLike = { email?: string | null };

export type DbCustomerFallback = {
  id: number;
  wooId?: string | null;
  email: string;
  firstName?: string | null;
  lastName?: string | null;
  phone?: string | null;
  createdAt?: Date;
  lastActiveAt?: Date | null;
};

export async function buildDbFallback(params: {
  storeId?: string;
  contacts: ContactLike[];
}) {
  if (!params.storeId) return new Map<string, DbCustomerFallback>();

  const emails = Array.from(
    new Set(params.contacts.map((c) => c.email?.toLowerCase()).filter(Boolean))
  ) as string[];

  if (!emails.length) return new Map();

  const rows = await prisma.customer.findMany({
    where: { storeId: params.storeId, email: { in: emails } },
    select: {
      id: true,
      wooId: true,
      email: true,
      firstName: true,
      lastName: true,
      phone: true,
      createdAt: true,
      lastActiveAt: true,
    },
  });

  return new Map(
    rows.map((row) => [row.email.toLowerCase(), row as DbCustomerFallback])
  );
}

export async function buildDbAggregates(params: {
  storeId?: string;
  customerIds: number[];
}) {
  if (!params.storeId || !params.customerIds.length) return new Map<number, any>();

  const aggregates = await prisma.order.groupBy({
    by: ["customerId"],
    where: { storeId: params.storeId, customerId: { in: params.customerIds } },
    _count: { _all: true },
    _sum: { total: true },
    _min: { createdAt: true },
    _max: { createdAt: true },
  });

  return new Map(
    aggregates.map((row) => [
      row.customerId!,
      {
        ordersCount: row._count._all ?? 0,
        totalSpend: row._sum.total ?? 0,
        firstOrderAt: row._min.createdAt ?? null,
        lastOrderAt: row._max.createdAt ?? null,
      },
    ])
  );
}
