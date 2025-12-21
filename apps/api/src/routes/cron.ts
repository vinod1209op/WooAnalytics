import { Router, Request, Response } from "express";
import { prisma } from "../prisma";
import { classifyIdle, IdleMetrics } from "./customers/utils";
import { INTERNAL_API_BASE } from "./assistant/config";
import {
  upsertContactWithTags,
  fetchContact,
  listCustomFields,
  searchContacts,
  type SearchContactsResult,
} from "../lib/ghl";
import { QUIZ_FIELD_IDS } from "../lib/quiz-field-map";
import { normalizeFromCustomFields } from "../lib/intent-normalizer";
import { registerQuizSyncRoute } from "./cron/quiz-sync";

const router = Router();

function sleep(ms: number): Promise<void> {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

function requireCronAuth(req: Request) {
  const auth = req.headers.authorization;
  const secret = process.env.CRON_SECRET;
  if (secret && auth !== `Bearer ${secret}`) {
    throw new Error("Unauthorized");
  }
}

router.get("/debug/ghl/contact/:id", async (req: Request, res: Response) => {
  try {
    requireCronAuth(req);
  } catch (err: any) {
    return res.status(401).json({ error: err?.message ?? "Unauthorized" });
  }

  const contactId = req.params.id;
  const locationId =
    (req.query.locationId as string | undefined) || process.env.GHL_LOCATION_ID;
  if (!contactId) return res.status(400).json({ error: "contactId is required" });
  if (!process.env.GHL_PIT) {
    return res.status(400).json({ error: "GHL_PIT is not configured" });
  }

  try {
    const contact = await fetchContact(contactId);
    let fields: any = null;
    if (locationId) {
      try {
        fields = await listCustomFields(locationId);
      } catch (err: any) {
        fields = { error: err?.message || String(err) };
      }
    }
    return res.json({ contact, customFields: fields, fieldIds: QUIZ_FIELD_IDS });
  } catch (err: any) {
    console.error("GET /cron/debug/ghl/contact error:", err);
    return res.status(500).json({ error: err?.message ?? "Internal server error" });
  }
});

router.get("/idle-snapshot", async (req: Request, res: Response) => {
  try {
    const { storeId, days: daysParam } = req.query as {
      storeId?: string;
      days?: string;
    };
    const auth = req.headers.authorization;
    const secret = process.env.CRON_SECRET;

    if (secret && auth !== `Bearer ${secret}`) {
      return res.status(401).json({ error: "Unauthorized" });
    }
    if (!storeId) return res.status(400).json({ error: "storeId is required" });

    const days = Math.min(Math.max(Number(daysParam) || 30, 1), 365);
    const cutoff = new Date(Date.now() - days * 24 * 60 * 60 * 1000);

    // Aggregate orders per customer for this store
    const aggregates = await prisma.order.groupBy({
      by: ["customerId"],
      where: { storeId },
      _count: { _all: true },
      _sum: { total: true },
      _max: { createdAt: true },
    });

    const segments: Record<string, number> = {};

    for (const agg of aggregates) {
      if (!agg.customerId) continue;
      const last = agg._max.createdAt ?? null;
      const metrics: IdleMetrics = {
        ordersCount: agg._count._all ?? 0,
        firstOrderAt: null,
        lastOrderAt: last,
        ltv: agg._sum.total ?? 0,
        avgDaysBetweenOrders: null,
        daysSinceLastOrder: last
          ? Math.round((Date.now() - last.getTime()) / (1000 * 60 * 60 * 24))
          : null,
      };
      const seg = classifyIdle(metrics, days);
      segments[seg] = (segments[seg] || 0) + 1;
    }

    const base =
      INTERNAL_API_BASE ||
      (process.env.VERCEL_URL ? `https://${process.env.VERCEL_URL}` : undefined) ||
      `http://localhost:${process.env.PORT || 3001}`;

    const csvUrl = new URL("/customers/inactive", base);
    csvUrl.searchParams.set("storeId", storeId);
    csvUrl.searchParams.set("days", String(days));
    csvUrl.searchParams.set("format", "csv");

    const csvBySegment: Record<string, string> = {};
    Object.keys(segments).forEach((seg) => {
      const url = new URL(csvUrl.toString());
      url.searchParams.set("segment", seg);
      csvBySegment[seg] = url.toString();
    });

    return res.json({
      storeId,
      days,
      cutoff: cutoff.toISOString(),
      segments,
      csv: csvUrl.toString(),
      csvBySegment,
    });
  } catch (err: any) {
    console.error("GET /cron/idle-snapshot error:", err);
    return res.status(500).json({ error: err?.message ?? "Internal server error" });
  }
});

router.post("/idle-sync-ghl", async (req: Request, res: Response) => {
  try {
    const {
      storeId,
      days: daysParam,
      segment,
      locationId: locationOverride,
      batchSize: batchParam,
      dryRun,
      previewLimit: previewLimitParam,
    } = req.body as {
      storeId?: string;
      days?: number;
      segment?: string;
      locationId?: string;
      batchSize?: number;
      dryRun?: boolean;
      previewLimit?: number;
    };

    const auth = req.headers.authorization;
    const secret = process.env.CRON_SECRET;
    if (secret && auth !== `Bearer ${secret}`) {
      return res.status(401).json({ error: "Unauthorized" });
    }

    if (!storeId) return res.status(400).json({ error: "storeId is required" });
    const locationId = locationOverride || process.env.GHL_LOCATION_ID;
    if (!locationId) {
      return res.status(400).json({ error: "GHL_LOCATION_ID is required (env or payload)" });
    }
    if (!process.env.GHL_PIT) {
      return res.status(400).json({ error: "GHL_PIT is not configured" });
    }

    const days = Math.min(Math.max(Number(daysParam) || 30, 1), 365);
    const batchSize = Math.min(Math.max(Number(batchParam) || 200, 1), 500);
    const previewLimit = Math.min(Math.max(Number(previewLimitParam) || 100, 1), 1000);
    const isDryRun = Boolean(dryRun);

    const base =
      INTERNAL_API_BASE ||
      (process.env.VERCEL_URL ? `https://${process.env.VERCEL_URL}` : undefined) ||
      `http://localhost:${process.env.PORT || 3001}`;

    let cursor = 0;
    let totalProcessed = 0;
    let totalTagged = 0;
    let skipped = 0;
    const errors: Array<{ id?: number; email?: string; reason: string }> = [];
    const preview: Array<{
      customerId: number;
      email?: string;
      phone?: string;
      firstName?: string;
      lastName?: string;
      tags: string[];
    }> = [];

    while (true) {
      const url = new URL("/customers/inactive", base);
      url.searchParams.set("storeId", storeId);
      url.searchParams.set("days", String(days));
      url.searchParams.set("limit", String(batchSize));
      url.searchParams.set("cursor", String(cursor));
      if (segment) url.searchParams.set("segment", segment);

      const resp = await fetch(url.toString());
      if (!resp.ok) {
        const text = await resp.text();
        return res
          .status(502)
          .json({ error: `Failed to load inactive customers: ${resp.status}: ${text}` });
      }

      const json = await resp.json();
      const rows = (json?.data || []) as Array<{
        customerId: number;
        email?: string;
        phone?: string;
        name?: string | null;
        segment?: string;
        tags?: string[];
      }>;

      if (!rows.length) break;

      for (const row of rows) {
        totalProcessed += 1;
        const email = row.email?.trim();
        const phone = row.phone?.trim();
        if (!email && !phone) {
          skipped += 1;
          continue;
        }

        const tags = row.tags ?? [];
        const [firstName, ...rest] = (row.name || "").split(" ").filter(Boolean);
        const lastName = rest.join(" ") || undefined;

        if (isDryRun && preview.length < previewLimit) {
          preview.push({
            customerId: row.customerId,
            email,
            phone,
            firstName: firstName || undefined,
            lastName,
            tags,
          });
          totalTagged += 1; // counted as would-be tagged
        } else if (!isDryRun) {
          try {
            await upsertContactWithTags({
              locationId,
              email,
              phone,
              firstName: firstName || undefined,
              lastName,
              tags,
            });
            totalTagged += 1;
          } catch (err: any) {
            const msg = String(err?.message || err);
            errors.push({ id: row.customerId, email, reason: msg });
            if (msg.includes("429")) {
              await sleep(1500);
            }
          }
        }
      }

      const next = json?.nextCursor;
      if (next == null) break;
      cursor = next;
      // light pause between pages
      await sleep(300);
    }

    return res.json({
      storeId,
      locationId,
      days,
      processed: totalProcessed,
      tagged: totalTagged,
      skipped,
      errors,
      dryRun: isDryRun,
      preview: isDryRun ? preview : undefined,
    });
  } catch (err: any) {
    console.error("POST /cron/idle-sync-ghl error:", err);
    return res.status(500).json({ error: err?.message ?? "Internal server error" });
  }
});

router.post("/normalize-intent", async (req: Request, res: Response) => {
  try {
    requireCronAuth(req);
  } catch (err: any) {
    return res.status(401).json({ error: err?.message ?? "Unauthorized" });
  }

  try {
    const {
      storeId,
      locationId: locationOverride,
      tag,
      limit: limitParam,
      dryRun,
      contactIds,
      primaryIntentFieldId,
    } = req.body as {
      storeId?: string;
      locationId?: string;
      tag?: string;
      limit?: number;
      dryRun?: boolean;
      contactIds?: string[];
      primaryIntentFieldId?: string;
    };

    if (!storeId) return res.status(400).json({ error: "storeId is required" });
    const locationId = locationOverride || process.env.GHL_LOCATION_ID;
    if (!locationId) {
      return res.status(400).json({ error: "GHL_LOCATION_ID is required (env or payload)" });
    }
    if (!process.env.GHL_PIT) {
      return res.status(400).json({ error: "GHL_PIT is not configured" });
    }

    const limit = Math.min(Math.max(Number(limitParam) || 50, 1), 500);
    const isDryRun = Boolean(dryRun);
    const tagFilter = tag || "quiz submitted";
    const primaryIntentField =
      primaryIntentFieldId || process.env.GHL_PRIMARY_INTENT_FIELD_ID;

    const contacts: any[] = [];
    const errors: Array<{ contactId?: string; email?: string; reason: string }> = [];

    if (Array.isArray(contactIds) && contactIds.length) {
      for (const cid of contactIds.slice(0, limit)) {
        try {
          const c = await fetchContact(cid);
          contacts.push(c);
        } catch (err: any) {
          errors.push({ contactId: cid, reason: err?.message || String(err) });
        }
      }
    } else {
      let page = 1;
      while (contacts.length < limit) {
        const batch = await searchContacts({
          locationId,
          tag: tagFilter,
          page,
          pageLimit: Math.min(50, limit - contacts.length),
        });
        if (batch.contacts?.length) {
          contacts.push(...batch.contacts);
        }
        if (!batch.nextPage || !batch.contacts?.length) break;
        page = batch.nextPage;
        await sleep(200); // gentle pacing
      }
    }

    let processed = 0;
    let matched = 0;
    let tagged = 0;
    let updatedDb = 0;
    let skipped = 0;
    let missingEmail = 0;
    const preview: Array<{
      contactId: string;
      email?: string | null;
      intent: any;
      tags: string[];
      customFields: Array<{ id: string; value: any }>;
    }> = [];

    for (const contact of contacts.slice(0, limit)) {
      processed += 1;
      const normalized = normalizeFromCustomFields(contact.customFields || []);
      const hasIntent =
        normalized.primaryIntent || normalized.mentalState || normalized.improvementArea;
      if (!hasIntent) {
        skipped += 1;
        continue;
      }
      matched += 1;

      const coreTags = [...normalized.intentTags, ...normalized.safetyTags];
      const mergedTags = Array.from(
        new Set([...(contact.tags || []), ...coreTags])
      );

    const customFieldsPayload: Array<{ id: string; value: any }> = [];
    if (primaryIntentField && normalized.primaryIntent) {
      customFieldsPayload.push({ id: primaryIntentField, value: normalized.primaryIntent });
    }

      if (isDryRun) {
        preview.push({
          contactId: contact.id,
          email: contact.email,
          intent: normalized,
          tags: mergedTags,
          customFields: customFieldsPayload,
        });
      } else {
        try {
          await upsertContactWithTags({
            locationId,
            email: contact.email,
            phone: contact.phone,
            firstName: contact.firstName,
            lastName: contact.lastName,
            tags: mergedTags,
            customFields: customFieldsPayload.length ? customFieldsPayload : undefined,
          });
          tagged += 1;
        } catch (err: any) {
          const msg = err?.message || String(err);
          errors.push({ contactId: contact.id, email: contact.email, reason: msg });
          if (msg.includes("429")) {
            await sleep(1500);
          }
        }
      }

      const email = contact.email?.trim() || null;
      if (!email) {
        missingEmail += 1;
        continue;
      }

      if (!isDryRun) {
        try {
          const result = await prisma.customer.updateMany({
            where: { storeId, email },
            data: {
              primaryIntent: (normalized.primaryIntent as string | null) ?? null,
              mentalState: (normalized.mentalState as string | null) ?? null,
              improvementArea: (normalized.improvementArea as string | null) ?? null,
              intentUpdatedAt: new Date(),
              rawQuizAnswers: {
                raw: normalized.raw,
                rawFields: normalized.rawFields,
                messaging: normalized.messaging,
                derived: normalized.derived,
              },
            } as any,
          });
          if (result.count > 0) {
            updatedDb += result.count;
          }
        } catch (err: any) {
          errors.push({ contactId: contact.id, email, reason: err?.message || String(err) });
        }
      }
    }

    return res.json({
      storeId,
      locationId,
      tag: tagFilter,
      limit,
      dryRun: isDryRun,
      processed,
      matched,
      tagged,
      updatedDb,
      skipped,
      missingEmail,
      errors,
      preview: isDryRun ? preview : undefined,
      fieldIds: QUIZ_FIELD_IDS,
      primaryIntentFieldId: primaryIntentField || null,
    });
  } catch (err: any) {
    console.error("POST /cron/normalize-intent error:", err);
    return res.status(500).json({ error: err?.message ?? "Internal server error" });
  }
});

registerQuizSyncRoute(router, { requireCronAuth, sleep });

export default router;
