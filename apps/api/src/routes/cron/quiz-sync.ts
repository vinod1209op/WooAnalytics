import { Router, Request, Response } from "express";
import { prisma } from "../../prisma";
import {
  upsertContactWithTags,
  listCustomFields,
  searchContacts,
  type SearchContactsResult,
} from "../../lib/ghl";
import { normalizeFromCustomFields } from "../../lib/intent-normalizer";
import { QUIZ_FIELD_IDS } from "../../lib/quiz-field-map";

async function checkQuizFieldDrift(locationId: string) {
  const defs = await listCustomFields(locationId);
  const byId = new Map<string, any>();
  const items = Array.isArray(defs?.customFields) ? defs.customFields : defs;
  if (Array.isArray(items)) {
    for (const f of items) {
      if (f?.id) byId.set(String(f.id), f);
    }
  }
  const missing: Array<{ id: string; name?: string }> = [];
  Object.values(QUIZ_FIELD_IDS).forEach((id) => {
    if (!byId.has(id)) missing.push({ id, name: undefined });
  });
  return { missing, defs };
}

type SyncDeps = {
  requireCronAuth: (req: Request) => void;
  sleep: (ms: number) => Promise<void>;
};

export function registerQuizSyncRoute(router: Router, deps: SyncDeps) {
  const lastStats: any = {
    ts: null,
    dryRun: null,
    processed: 0,
    matched: 0,
    tagged: 0,
    updatedDb: 0,
    skipped: 0,
    missingEmail: 0,
    errors: 0,
    drift: null,
  };

  router.get("/intent-health", (_req: Request, res: Response) => {
    return res.json(lastStats);
  });

  router.post("/sync-ghl-quiz-tags", async (req: Request, res: Response) => {
    try {
      deps.requireCronAuth(req);
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
        primaryIntentFieldId,
        checkDrift,
      } = req.body as {
        storeId?: string;
        locationId?: string;
        tag?: string;
        limit?: number;
        dryRun?: boolean;
        primaryIntentFieldId?: string;
        checkDrift?: boolean;
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

      let drift: any = null;
      let fieldDefsMap: Record<string, { name?: string; fieldKey?: string }> | undefined;
      if (checkDrift !== false) {
        try {
          const driftResult = await checkQuizFieldDrift(locationId);
          drift = { missing: driftResult.missing, inspected: true };
          const defsArray = Array.isArray(driftResult?.defs?.customFields)
            ? driftResult.defs.customFields
            : Array.isArray(driftResult?.defs)
            ? driftResult.defs
            : [];
          fieldDefsMap = {};
          for (const d of defsArray) {
            if (d?.id) {
              fieldDefsMap[String(d.id)] = { name: d.name, fieldKey: d.fieldKey || d.key };
            }
          }
          if (driftResult.missing.length) {
            return res.status(428).json({
              error: "Quiz field drift detected",
              missingFields: driftResult.missing,
            });
          }
        } catch (err: any) {
          drift = { error: err?.message || String(err) };
        }
      }

  const errors: Array<{ contactId?: string; email?: string; reason: string }> = [];
  const contacts: any[] = [];

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
    await deps.sleep(200);
  }

      let processed = 0;
      let matched = 0;
      let tagged = 0;
      let updatedDb = 0;
      let skipped = 0;
      let missingEmail = 0;
      const processedIds: Array<{ contactId: string; email?: string | null }> = [];
      const preview: Array<{
        contactId: string;
        email?: string | null;
        intent: any;
        tags: string[];
        customFields: Array<{ id: string; value: any }>;
      }> = [];

      for (const contact of contacts) {
        if (processed >= limit) break;
        processed += 1;
        processedIds.push({ contactId: contact.id, email: contact.email });
        const normalized = normalizeFromCustomFields(contact.customFields || [], {
          fieldDefs: fieldDefsMap,
        });
        const hasIntent =
          normalized.primaryIntent || normalized.mentalState || normalized.improvementArea;
        if (!hasIntent) {
          skipped += 1;
          continue;
        }
        matched += 1;

        const coreTags = [...normalized.intentTags, ...normalized.safetyTags];
        const mergedTags = Array.from(new Set([...(contact.tags || []), ...coreTags]));
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
            contactId: contact.id,
          });
            tagged += 1;
          } catch (err: any) {
            const msg = err?.message || String(err);
            errors.push({ contactId: contact.id, email: contact.email, reason: msg });
            if (msg.includes("429")) {
              await deps.sleep(1500);
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
        drift,
        primaryIntentFieldId: primaryIntentField || null,
        processedIds,
      });
      Object.assign(lastStats, {
        ts: new Date().toISOString(),
        dryRun: isDryRun,
        processed,
        matched,
        tagged,
        updatedDb,
        skipped,
        missingEmail,
        errors: errors.length,
        drift,
      });
    } catch (err: any) {
      console.error("POST /cron/sync-ghl-quiz-tags error:", err);
      return res.status(500).json({ error: err?.message ?? "Internal server error" });
    }
  });
}
