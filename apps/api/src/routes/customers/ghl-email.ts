import { Router, Request, Response } from "express";
import OpenAI from "openai";
import { fetchContact, sendConversationEmail } from "../../lib/ghl";
import { ASSISTANT_MODEL } from "../assistant/config";

const DEFAULT_FROM_EMAIL = process.env.GHL_FROM_EMAIL || null;
const DEFAULT_FROM_NAME = process.env.GHL_FROM_NAME || null;

export function registerGhlEmailRoute(router: Router) {
  router.post("/ghl-email-draft", async (req: Request, res: Response) => {
    try {
      const apiKey =
        process.env.OPENROUTER_API_KEY || process.env.OPENAI_API_KEY || process.env.OPENAI_KEY;
      if (!apiKey) {
        return res.status(400).json({ error: "OPENROUTER_API_KEY is not configured" });
      }

      const baseURL = process.env.OPENROUTER_API_KEY
        ? process.env.OPENROUTER_BASE_URL || "https://openrouter.ai/api/v1"
        : undefined;
      const model = process.env.EMAIL_DRAFT_MODEL || ASSISTANT_MODEL;

      const toNumber = (value: unknown) => {
        if (value == null || value === "") return null;
        const num = Number(value);
        return Number.isFinite(num) ? num : null;
      };

      const payload = {
        name: typeof req.body?.name === "string" ? req.body.name : null,
        email: typeof req.body?.email === "string" ? req.body.email : null,
        pointsBalance: toNumber(req.body?.pointsBalance),
        pointsToNext: toNumber(req.body?.pointsToNext),
        nextRewardAt: toNumber(req.body?.nextRewardAt),
        nextRewardTitle: typeof req.body?.nextRewardTitle === "string" ? req.body.nextRewardTitle : null,
        lastRewardTitle: typeof req.body?.lastRewardTitle === "string" ? req.body.lastRewardTitle : null,
        topProduct: typeof req.body?.topProduct === "string" ? req.body.topProduct : null,
        topCategory: typeof req.body?.topCategory === "string" ? req.body.topCategory : null,
        lastOrderValue: toNumber(req.body?.lastOrderValue),
        lastOrderDate: typeof req.body?.lastOrderDate === "string" ? req.body.lastOrderDate : null,
        daysSinceLast: toNumber(req.body?.daysSinceLast),
        improvementArea: typeof req.body?.improvementArea === "string" ? req.body.improvementArea : null,
        mentalState: typeof req.body?.mentalState === "string" ? req.body.mentalState : null,
        routine: typeof req.body?.routine === "string" ? req.body.routine : null,
        stressCoping: typeof req.body?.stressCoping === "string" ? req.body.stressCoping : null,
        leadCouponCode: typeof req.body?.leadCouponCode === "string" ? req.body.leadCouponCode : null,
        leadCouponRemainingSpend: toNumber(req.body?.leadCouponRemainingSpend),
        leadCouponAmount: toNumber(req.body?.leadCouponAmount),
        leadCouponDiscountType:
          typeof req.body?.leadCouponDiscountType === "string"
            ? req.body.leadCouponDiscountType
            : null,
        campaignType:
          typeof req.body?.campaignType === "string" ? req.body.campaignType : null
      };

      const systemPrompt = `You are a lifecycle email copywriter for MCRDSE. Write a short, warm, human email that feels personal, calming, and inviting. Keep the tone grounded and premium, with a gentle nudge to restock and a clear reward reminder. Do not mention quizzes, surveys, "based on your answers", or "motivation". Do not mention AI. Avoid emojis and markdown. Keep it natural, simple, and genuine. Use the provided product/category if available. If a lead coupon is present, frame it as a reward milestone, not a discount. Voice anchors: "Your timing is sacred." "We’ll be here when you’re ready." "Keep the rhythm going."`;

      const userPrompt = `Return a JSON object with keys "subject" and "body".
Subject must be under 60 characters.
Body must be plain text with 6-8 short lines.
Follow this structure:
1) Friendly greeting with first name.
2) Product/category restock line (if available).
3) Points status line (use pointsBalance and pointsToNext if present).
4) Reward line (mention nextRewardTitle if present).
5) If leadCouponRemainingSpend is present, add a line like: "You’re $X away from unlocking {leadCouponCode}." Call it a reward, not a discount.
6) If campaignType is "idle" or daysSinceLast >= 30, add a gentle line like "It’s been a minute—no pressure, we’re here when you’re ready."
7) Warm, supportive nudge.
8) Signature: "Thanks for being part of MCRDSE," then "The MCRDSE Team".

Use the data below.

DATA:
${JSON.stringify(payload)}`;

      const openai = new OpenAI({ apiKey, baseURL });
      const completion = await openai.chat.completions.create({
        model,
        temperature: 0.7,
        messages: [
          { role: "system", content: systemPrompt },
          { role: "user", content: userPrompt }
        ]
      });

      const content = completion.choices[0]?.message?.content?.trim();
      if (!content) {
        return res.status(500).json({ error: "Empty draft response" });
      }

      let parsed: { subject?: string; body?: string } | null = null;
      try {
        parsed = JSON.parse(content);
      } catch (err) {
        return res.status(500).json({ error: "Draft response was not valid JSON" });
      }

      const subject = typeof parsed?.subject === "string" ? parsed.subject.trim() : "";
      const body = typeof parsed?.body === "string" ? parsed.body.trim() : "";
      if (!subject || !body) {
        return res.status(500).json({ error: "Draft response missing subject/body" });
      }

      return res.json({ subject, body });
    } catch (err: any) {
      console.error("POST /customers/ghl-email-draft error:", err);
      return res.status(500).json({ error: err?.message ?? "Internal error" });
    }
  });

  router.post("/ghl-email", async (req: Request, res: Response) => {
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

      const subject =
        typeof req.body?.subject === "string" ? req.body.subject.trim() : "";
      const message =
        typeof req.body?.message === "string" ? req.body.message.trim() : "";
      if (!subject || !message) {
        return res.status(400).json({ error: "subject and message are required" });
      }
      const html = typeof req.body?.html === "string" ? req.body.html.trim() : "";

      const contact = await fetchContact(contactId);
      if (!contact?.email) {
        return res.status(400).json({ error: "Contact has no email" });
      }

      const emailFrom =
        typeof req.body?.emailFrom === "string" && req.body.emailFrom.trim()
          ? req.body.emailFrom.trim()
          : DEFAULT_FROM_EMAIL;
      const fromName =
        typeof req.body?.fromName === "string" && req.body.fromName.trim()
          ? req.body.fromName.trim()
          : DEFAULT_FROM_NAME;

      const result = await sendConversationEmail({
        contactId,
        subject,
        message,
        html,
        locationId,
        emailFrom,
        fromName,
        emailTo: contact.email,
      });

      return res.json({ ok: true, result });
    } catch (err: any) {
      console.error("POST /customers/ghl-email error:", err);
      return res.status(500).json({ error: err?.message ?? "Internal error" });
    }
  });
}
