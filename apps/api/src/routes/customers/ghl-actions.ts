import { Router, Request, Response } from "express";
import { fetchContact, upsertContactWithTags } from "../../lib/ghl";

const ACTION_TAGS: Record<string, string> = {
  email_nudge: "loyalty_nudge_email",
  reward_unlocked: "loyalty_reward_unlocked",
};

export function registerGhlActionsRoute(router: Router) {
  router.post("/ghl-action", async (req: Request, res: Response) => {
    try {
      if (!process.env.GHL_PIT) {
        return res.status(400).json({ error: "GHL_PIT is not configured" });
      }

      const locationId =
        typeof req.body?.locationId === "string" && req.body.locationId.trim()
          ? req.body.locationId.trim()
          : process.env.GHL_LOCATION_ID;

      if (!locationId) {
        return res.status(400).json({ error: "GHL_LOCATION_ID is required" });
      }

      const contactId =
        typeof req.body?.contactId === "string" ? req.body.contactId.trim() : "";
      if (!contactId) {
        return res.status(400).json({ error: "contactId is required" });
      }

      const action =
        typeof req.body?.action === "string" ? req.body.action.trim() : "";
      const extraTags = Array.isArray(req.body?.tags)
        ? req.body.tags.map((tag: any) => String(tag)).filter(Boolean)
        : [];

      const actionTag = ACTION_TAGS[action] ?? null;
      if (!actionTag && extraTags.length === 0) {
        return res.status(400).json({ error: "action or tags are required" });
      }

      const contact = await fetchContact(contactId);
      const currentTags = new Set((contact?.tags || []).map((tag) => tag.toLowerCase()));
      const nextTags = contact?.tags ? [...contact.tags] : [];

      const pushTag = (tag: string) => {
        const normalized = tag.toLowerCase();
        if (!currentTags.has(normalized)) {
          currentTags.add(normalized);
          nextTags.push(tag);
        }
      };

      if (actionTag) pushTag(actionTag);
      extraTags.forEach((tag) => pushTag(tag));

      await upsertContactWithTags({
        contactId,
        locationId,
        tags: nextTags,
        email: contact?.email ?? null,
        phone: contact?.phone ?? null,
        firstName: contact?.firstName ?? null,
        lastName: contact?.lastName ?? null,
      });

      return res.json({ ok: true, tags: nextTags });
    } catch (err: any) {
      console.error("POST /customers/ghl-action error:", err);
      return res.status(500).json({ error: err?.message ?? "Internal error" });
    }
  });
}
