import { Router, Request, Response } from "express";
import { prisma } from "../../prisma";
import { round2 } from "../analytics/utils";
import { fullName, mapOrderItemsWithCategories } from "./utils";
import { fetchContact, searchContactsByQuery } from "../../lib/ghl";

const MS_DAY = 1000 * 60 * 60 * 24;

function toIso(value: Date | null | undefined) {
  return value ? value.toISOString() : null;
}

export function registerCustomerProfileRoute(router: Router) {
  router.get("/:id/profile", async (req: Request, res: Response) => {
    try {
      const storeId = String(req.query.storeId || "");
      const customerId = Number(req.params.id);
      const locationId =
        typeof req.query.locationId === "string" && req.query.locationId.trim()
          ? req.query.locationId.trim()
          : process.env.GHL_LOCATION_ID;

      if (!storeId) return res.status(400).json({ error: "storeId is required" });
      if (!Number.isFinite(customerId)) {
        return res.status(400).json({ error: "Invalid customer id" });
      }

      const customer = await prisma.customer.findFirst({
        where: { id: customerId, storeId },
        select: {
          id: true,
          wooId: true,
          email: true,
          firstName: true,
          lastName: true,
          phone: true,
          createdAt: true,
          lastActiveAt: true,
          primaryIntent: true,
          mentalState: true,
          improvementArea: true,
          intentUpdatedAt: true,
          rawQuizAnswers: true,
        },
      });

      if (!customer) return res.status(404).json({ error: "Customer not found" });

      const orders = await prisma.order.findMany({
        where: { storeId, customerId },
        orderBy: { createdAt: "desc" },
        select: {
          id: true,
          createdAt: true,
          status: true,
          currency: true,
          paymentMethod: true,
          shippingCountry: true,
          shippingCity: true,
          total: true,
          subtotal: true,
          discountTotal: true,
          shippingTotal: true,
          taxTotal: true,
          coupons: {
            select: {
              coupon: { select: { code: true, discountType: true, amount: true } },
            },
          },
          items: {
            select: {
              productId: true,
              name: true,
              sku: true,
              quantity: true,
              lineTotal: true,
              product: {
                select: {
                  categories: {
                    select: { category: { select: { id: true, name: true } } },
                  },
                },
              },
            },
          },
        },
      });

      const ordersCount = orders.length;
      const firstOrderAt = ordersCount ? orders[ordersCount - 1].createdAt : null;
      const lastOrderAt = ordersCount ? orders[0].createdAt : null;
      const totalSpend = round2(
        orders.reduce((sum, order) => sum + (order.total ?? 0), 0)
      );
      const avgOrderValue =
        ordersCount > 0 ? round2(totalSpend / ordersCount) : null;
      const avgDaysBetweenOrders =
        ordersCount > 1 && firstOrderAt && lastOrderAt
          ? round2(
              (lastOrderAt.getTime() - firstOrderAt.getTime()) /
                (ordersCount - 1) /
                MS_DAY
            )
          : null;
      const daysSinceLastOrder =
        lastOrderAt != null
          ? round2((Date.now() - lastOrderAt.getTime()) / MS_DAY)
          : null;
      const monthsActive =
        firstOrderAt && lastOrderAt
          ? Math.max(
              1,
              (lastOrderAt.getTime() - firstOrderAt.getTime()) / (MS_DAY * 30)
            )
          : null;
      const ordersPerMonth =
        monthsActive && monthsActive > 0 ? round2(ordersCount / monthsActive) : null;

      const productMap = new Map<
        string,
        {
          productId: number | null;
          name: string;
          sku: string | null;
          quantity: number;
          revenue: number;
          categories: string[];
        }
      >();
      const categoryMap = new Map<string, { name: string; quantity: number; revenue: number }>();
      let totalItems = 0;

      const ordersWithItems = orders.map((order) => {
        const items = mapOrderItemsWithCategories(order.items);
        const itemCount = items.reduce((sum, item) => sum + item.quantity, 0);
        totalItems += itemCount;

        for (const item of items) {
          const key = item.productId != null ? `id:${item.productId}` : `name:${item.name}`;
          const existing = productMap.get(key);
          const revenue = round2(item.lineTotal ?? 0);
          const categories = item.categories ?? [];
          if (!existing) {
            productMap.set(key, {
              productId: item.productId ?? null,
              name: item.name ?? "Item",
              sku: item.sku ?? null,
              quantity: item.quantity,
              revenue,
              categories: [...categories],
            });
          } else {
            existing.quantity += item.quantity;
            existing.revenue = round2(existing.revenue + revenue);
            existing.categories = Array.from(
              new Set([...existing.categories, ...categories])
            );
          }

          for (const category of categories) {
            const cat = categoryMap.get(category) ?? {
              name: category,
              quantity: 0,
              revenue: 0,
            };
            cat.quantity += item.quantity;
            cat.revenue = round2(cat.revenue + revenue);
            categoryMap.set(category, cat);
          }
        }

        return {
          id: order.id,
          createdAt: toIso(order.createdAt),
          status: order.status,
          currency: order.currency,
          paymentMethod: order.paymentMethod,
          shippingCountry: order.shippingCountry,
          shippingCity: order.shippingCity,
          total: round2(order.total ?? 0),
          subtotal: order.subtotal != null ? round2(order.subtotal) : null,
          discountTotal: order.discountTotal != null ? round2(order.discountTotal) : null,
          shippingTotal: order.shippingTotal != null ? round2(order.shippingTotal) : null,
          taxTotal: order.taxTotal != null ? round2(order.taxTotal) : null,
          coupons: (order.coupons || [])
            .map((coupon) => coupon.coupon)
            .filter(Boolean),
          itemCount,
          items,
        };
      });

      const products = Array.from(productMap.values()).sort(
        (a, b) => b.quantity - a.quantity || b.revenue - a.revenue
      );
      const categories = Array.from(categoryMap.values()).sort(
        (a, b) => b.quantity - a.quantity || b.revenue - a.revenue
      );

      let ghl: any = null;
      if (locationId && process.env.GHL_PIT) {
        try {
          let matchedBy: "email" | "phone" | "query" | null = null;
          let contactId: string | null = null;
          const email = customer.email?.trim().toLowerCase();
          const phone = customer.phone?.trim();
          const phoneDigits = phone ? phone.replace(/\D/g, "") : "";

          if (email) {
            const result = await searchContactsByQuery({
              locationId,
              query: email,
              pageLimit: 10,
            });
            const exact = result.contacts.find(
              (c) => c.email && c.email.toLowerCase() === email
            );
            const fallback = result.contacts[0] ?? null;
            contactId = exact?.id ?? fallback?.id ?? null;
            matchedBy = contactId ? (exact ? "email" : "query") : null;
          }

          if (!contactId && phoneDigits) {
            const result = await searchContactsByQuery({
              locationId,
              query: phoneDigits,
              pageLimit: 10,
            });
            const exact = result.contacts.find((c) => {
              const digits = c.phone ? c.phone.replace(/\D/g, "") : "";
              return digits === phoneDigits;
            });
            const fallback = result.contacts[0] ?? null;
            contactId = exact?.id ?? fallback?.id ?? null;
            matchedBy = contactId ? (exact ? "phone" : "query") : null;
          }

          if (contactId) {
            const contact = await fetchContact(contactId);
            ghl = { contact, matchedBy, locationId };
          } else {
            ghl = { contact: null, matchedBy: null, locationId };
          }
        } catch (err) {
          const message = err instanceof Error ? err.message : "GHL fetch failed";
          ghl = { contact: null, error: message, locationId };
        }
      } else {
        ghl = { contact: null, error: "GHL not configured", locationId };
      }

      return res.json({
        customer: {
          id: customer.id,
          wooId: customer.wooId,
          email: customer.email,
          name: fullName(customer.firstName, customer.lastName) || null,
          firstName: customer.firstName,
          lastName: customer.lastName,
          phone: customer.phone,
          createdAt: toIso(customer.createdAt),
          lastActiveAt: toIso(customer.lastActiveAt),
          intent: {
            primaryIntent: customer.primaryIntent ?? null,
            mentalState: customer.mentalState ?? null,
            improvementArea: customer.improvementArea ?? null,
            updatedAt: toIso(customer.intentUpdatedAt),
          },
          rawQuizAnswers: customer.rawQuizAnswers ?? null,
        },
        insights: {
          ordersCount,
          repeatBuyer: ordersCount > 1,
          totalSpend,
          avgOrderValue,
          avgDaysBetweenOrders,
          daysSinceLastOrder,
          ordersPerMonth,
          firstOrderAt: toIso(firstOrderAt),
          lastOrderAt: toIso(lastOrderAt),
        },
        products: {
          totalItems,
          products,
          categories,
        },
        orders: ordersWithItems,
        ghl,
      });
    } catch (err) {
      console.error("GET /customers/:id/profile error:", err);
      return res.status(500).json({ error: "Internal error" });
    }
  });
}
