import { promises as fs } from "fs";
import path from "path";
import { timingSafeEqual } from "crypto";
import { Request, Response, Router } from "express";
import OpenAI from "openai";
import { ASSISTANT_MODEL } from "../assistant/config";
import { fetchContact, upsertContactWithTags } from "../../lib/ghl";

type WorkflowEventType =
  | "inbound"
  | "outbound_reply"
  | "booked_call"
  | "sale"
  | "followup_completed"
  | "pipeline_moved"
  | "call_outcome";

type WorkflowEvent = {
  id: string;
  eventType: WorkflowEventType;
  timestamp: string;
  conversationId: string;
  contactId?: string | null;
  locationId?: string | null;
  channel?: string | null;
  repId?: string | null;
  repName?: string | null;
  firstResponseSeconds?: number | null;
  repliedWithinMinutes?: number | null;
  sentiment?: "positive" | "neutral" | "negative" | null;
  intent?:
    | "lead"
    | "interested"
    | "question"
    | "complaint"
    | "sale"
    | "other"
    | null;
  leadTemperature?: "hot" | "warm" | "cold" | null;
  engaged?: boolean | null;
  booked?: boolean | null;
  saleValue?: number | null;
  metadata?: Record<string, any> | null;
};

type EventStore = {
  events: WorkflowEvent[];
};

type ConversationAggregate = {
  conversationId: string;
  firstInboundAt?: Date;
  firstReplyAt?: Date;
  lastEventAt?: Date;
  contactId?: string | null;
  repId?: string | null;
  repName?: string | null;
  channel?: string | null;
  sentiment?: "positive" | "neutral" | "negative" | null;
  intent?:
    | "lead"
    | "interested"
    | "question"
    | "complaint"
    | "sale"
    | "other"
    | null;
  leadTemperature?: "hot" | "warm" | "cold" | null;
  engaged?: boolean | null;
  booked?: boolean | null;
  saleValueTotal: number;
  followupCompleted: boolean;
  replied: boolean;
  bookedCount: number;
  saleCount: number;
};

const EVENT_FILE =
  process.env.GHL_WORKFLOW_EVENTS_FILE?.trim() ||
  path.resolve(__dirname, "../../../data/ghl-workflow-events.json");

const MAX_EVENTS = 25000;
const VALID_EVENT_TYPES: Set<string> = new Set([
  "inbound",
  "outbound_reply",
  "booked_call",
  "sale",
  "followup_completed",
  "pipeline_moved",
  "call_outcome",
]);

const VALID_SENTIMENTS: Set<string> = new Set(["positive", "neutral", "negative"]);
const VALID_INTENTS: Set<string> = new Set([
  "lead",
  "interested",
  "question",
  "complaint",
  "sale",
  "other",
]);
const VALID_TEMPERATURES: Set<string> = new Set(["hot", "warm", "cold"]);

function toStringOrNull(value: unknown) {
  if (typeof value !== "string") return null;
  const trimmed = value.trim();
  return trimmed || null;
}

function toFiniteNumberOrNull(value: unknown) {
  if (value == null || value === "") return null;
  const num = Number(value);
  return Number.isFinite(num) ? num : null;
}

function toBooleanOrNull(value: unknown) {
  if (typeof value === "boolean") return value;
  if (typeof value === "string") {
    const lower = value.toLowerCase();
    if (["true", "1", "yes"].includes(lower)) return true;
    if (["false", "0", "no"].includes(lower)) return false;
  }
  return null;
}

function normalizeSentiment(value: unknown): "positive" | "neutral" | "negative" | null {
  const text = toStringOrNull(value)?.toLowerCase() || null;
  if (!text || !VALID_SENTIMENTS.has(text)) return null;
  return text as "positive" | "neutral" | "negative";
}

function normalizeIntent(
  value: unknown
):
  | "lead"
  | "interested"
  | "question"
  | "complaint"
  | "sale"
  | "other"
  | null {
  const text = toStringOrNull(value)?.toLowerCase() || null;
  if (!text || !VALID_INTENTS.has(text)) return null;
  return text as "lead" | "interested" | "question" | "complaint" | "sale" | "other";
}

function normalizeTemperature(value: unknown): "hot" | "warm" | "cold" | null {
  const text = toStringOrNull(value)?.toLowerCase() || null;
  if (!text || !VALID_TEMPERATURES.has(text)) return null;
  return text as "hot" | "warm" | "cold";
}

function isObject(value: unknown): value is Record<string, any> {
  return Boolean(value) && typeof value === "object" && !Array.isArray(value);
}

function parsePositiveInt(value: unknown, fallback: number, min: number, max: number) {
  const num = Number(value);
  if (!Number.isFinite(num)) return fallback;
  return Math.min(Math.max(Math.round(num), min), max);
}

function toIsoTimestampOrNow(value: unknown) {
  const raw = toStringOrNull(value);
  if (!raw) return new Date().toISOString();
  const date = new Date(raw);
  if (Number.isNaN(date.getTime())) return new Date().toISOString();
  return date.toISOString();
}

function uid(prefix: string) {
  return `${prefix}_${Date.now()}_${Math.random().toString(36).slice(2, 10)}`;
}

function safeConstantEqual(left: string, right: string) {
  const a = Buffer.from(left);
  const b = Buffer.from(right);
  if (a.length !== b.length) return false;
  return timingSafeEqual(a, b);
}

function readBearerToken(req: Request) {
  const authHeader = (req.get("Authorization") || "").trim();
  if (!authHeader) return null;
  if (/^Bearer\s+/i.test(authHeader)) {
    return authHeader.replace(/^Bearer\s+/i, "").trim() || null;
  }
  return authHeader;
}

function requireWorkflowWebhookAuth(req: Request) {
  const configuredSecret = process.env.GHL_WORKFLOW_WEBHOOK_SECRET?.trim();
  if (!configuredSecret) return;

  const candidates = [
    req.get("x-webhook-secret"),
    req.get("x-ghl-webhook-secret"),
    readBearerToken(req),
  ]
    .map((value) => (typeof value === "string" ? value.trim() : ""))
    .filter(Boolean);

  const isValid = candidates.some((value) => safeConstantEqual(value, configuredSecret));
  if (!isValid) {
    throw new Error("Invalid workflow webhook secret");
  }
}

function extractTagsFromAnalysis(analysis: {
  intent: string;
  sentiment: string;
  leadTemperature: string;
  engaged: boolean;
  booked: boolean;
}) {
  const tags = [
    `intent:${analysis.intent}`,
    `sentiment:${analysis.sentiment}`,
    `temp:${analysis.leadTemperature}`,
    `engaged:${analysis.engaged ? "yes" : "no"}`,
    `booked:${analysis.booked ? "yes" : "no"}`,
  ];
  return Array.from(new Set(tags));
}

async function ensureEventDir() {
  const dir = path.dirname(EVENT_FILE);
  await fs.mkdir(dir, { recursive: true });
}

async function readEvents() {
  try {
    const raw = await fs.readFile(EVENT_FILE, "utf8");
    if (!raw.trim()) return [] as WorkflowEvent[];
    const parsed = JSON.parse(raw) as EventStore | WorkflowEvent[];
    const source = Array.isArray(parsed) ? parsed : parsed.events;
    if (!Array.isArray(source)) return [] as WorkflowEvent[];
    return source.filter((item) => item && typeof item === "object");
  } catch (err: any) {
    if (err?.code === "ENOENT") return [] as WorkflowEvent[];
    throw err;
  }
}

async function writeEvents(events: WorkflowEvent[]) {
  await ensureEventDir();
  const trimmed = events
    .sort((a, b) => a.timestamp.localeCompare(b.timestamp))
    .slice(-MAX_EVENTS);
  const payload: EventStore = { events: trimmed };
  await fs.writeFile(EVENT_FILE, JSON.stringify(payload, null, 2), "utf8");
}

async function appendWorkflowEvent(event: WorkflowEvent) {
  const events = await readEvents();
  events.push(event);
  await writeEvents(events);
  return events.length;
}

function buildAnalysisCustomFields(analysis: {
  intent: string;
  sentiment: string;
  leadTemperature: string;
  engaged: boolean;
  booked: boolean;
  summary: string;
  recommendedAction: string;
}) {
  const envPairs: Array<[string, string | number | boolean]> = [
    ["GHL_AI_INTENT_FIELD_ID", analysis.intent],
    ["GHL_AI_SENTIMENT_FIELD_ID", analysis.sentiment],
    ["GHL_AI_LEAD_TEMPERATURE_FIELD_ID", analysis.leadTemperature],
    ["GHL_AI_ENGAGED_FIELD_ID", analysis.engaged ? "yes" : "no"],
    ["GHL_AI_BOOKED_FIELD_ID", analysis.booked ? "yes" : "no"],
    ["GHL_AI_SUMMARY_FIELD_ID", analysis.summary],
    ["GHL_AI_RECOMMENDED_ACTION_FIELD_ID", analysis.recommendedAction],
  ];

  return envPairs
    .map(([envKey, value]) => {
      const id = process.env[envKey]?.trim();
      if (!id) return null;
      return { id, value };
    })
    .filter((item): item is { id: string; value: string | number | boolean } => !!item);
}

function heuristicAnalyzeMessage(message: string) {
  const text = message.toLowerCase();
  const complaintWords = ["refund", "issue", "problem", "angry", "bad", "complaint"];
  const saleWords = ["buy", "checkout", "price", "order", "purchase", "cart"];
  const questionWords = ["?", "how", "what", "when", "where", "can i", "does this"];
  const positiveWords = ["great", "love", "thanks", "awesome", "good"];
  const negativeWords = ["hate", "bad", "worst", "upset", "angry"];
  const bookedWords = ["booked", "appointment", "call booked", "scheduled"];

  const contains = (arr: string[]) => arr.some((word) => text.includes(word));
  const intent = contains(complaintWords)
    ? "complaint"
    : contains(saleWords)
    ? "sale"
    : contains(questionWords)
    ? "question"
    : "interested";
  const sentiment = contains(negativeWords)
    ? "negative"
    : contains(positiveWords)
    ? "positive"
    : "neutral";
  const leadTemperature =
    intent === "sale" ? "hot" : intent === "interested" || intent === "question" ? "warm" : "cold";
  const engaged = message.trim().length > 0;
  const booked = contains(bookedWords);
  const recommendedAction =
    intent === "complaint"
      ? "Escalate to support and respond within 15 minutes."
      : intent === "sale"
      ? "Send offer + booking link immediately."
      : "Reply with clarifying question and CTA.";

  return {
    intent,
    sentiment,
    leadTemperature,
    engaged,
    booked,
    summary: message.slice(0, 220),
    recommendedAction,
    replySuggestion:
      intent === "sale"
        ? "Happy to help. I can send the direct order link and best option for you."
        : "Thanks for reaching out. Can you share a bit more so I can guide you quickly?",
    topics: [],
    source: "heuristic" as const,
  };
}

async function aiAnalyzeMessage(message: string) {
  const apiKey =
    process.env.OPENROUTER_API_KEY || process.env.OPENAI_API_KEY || process.env.OPENAI_KEY;
  if (!apiKey) return heuristicAnalyzeMessage(message);

  const baseURL = process.env.OPENROUTER_API_KEY
    ? process.env.OPENROUTER_BASE_URL || "https://openrouter.ai/api/v1"
    : undefined;
  const model = process.env.GHL_AI_ANALYSIS_MODEL || ASSISTANT_MODEL;
  const openai = new OpenAI({ apiKey, baseURL });

  const systemPrompt =
    "You classify inbound lead messages for CRM workflows. Return strict JSON only.";
  const userPrompt = `Analyze this message and return JSON:
{
  "intent": "lead|interested|question|complaint|sale|other",
  "sentiment": "positive|neutral|negative",
  "leadTemperature": "hot|warm|cold",
  "engaged": boolean,
  "booked": boolean,
  "summary": string,
  "recommendedAction": string,
  "replySuggestion": string,
  "topics": string[]
}

Message:
${message}`;

  const completion = await openai.chat.completions.create({
    model,
    temperature: 0.2,
    messages: [
      { role: "system", content: systemPrompt },
      { role: "user", content: userPrompt },
    ],
  });

  const content = completion.choices[0]?.message?.content?.trim();
  if (!content) return heuristicAnalyzeMessage(message);

  try {
    const parsed = JSON.parse(content);
    return {
      intent: normalizeIntent(parsed?.intent) || "other",
      sentiment: normalizeSentiment(parsed?.sentiment) || "neutral",
      leadTemperature: normalizeTemperature(parsed?.leadTemperature) || "warm",
      engaged: Boolean(parsed?.engaged),
      booked: Boolean(parsed?.booked),
      summary: toStringOrNull(parsed?.summary) || message.slice(0, 220),
      recommendedAction:
        toStringOrNull(parsed?.recommendedAction) || "Follow up with a clear CTA.",
      replySuggestion:
        toStringOrNull(parsed?.replySuggestion) || "Thanks for reaching out. Happy to help.",
      topics: Array.isArray(parsed?.topics)
        ? parsed.topics.map((item: any) => String(item)).filter(Boolean).slice(0, 10)
        : [],
      source: "ai" as const,
    };
  } catch {
    return heuristicAnalyzeMessage(message);
  }
}

function buildConversationAggregates(events: WorkflowEvent[]) {
  const byConversation = new Map<string, ConversationAggregate>();

  for (const event of events) {
    const timestamp = new Date(event.timestamp);
    if (Number.isNaN(timestamp.getTime())) continue;
    const key = event.conversationId;
    if (!key) continue;

    if (!byConversation.has(key)) {
      byConversation.set(key, {
        conversationId: key,
        saleValueTotal: 0,
        followupCompleted: false,
        replied: false,
        bookedCount: 0,
        saleCount: 0,
      });
    }
    const agg = byConversation.get(key)!;
    agg.lastEventAt = agg.lastEventAt && agg.lastEventAt > timestamp ? agg.lastEventAt : timestamp;
    agg.contactId = agg.contactId || event.contactId || null;
    agg.repId = agg.repId || event.repId || null;
    agg.repName = agg.repName || event.repName || null;
    agg.channel = agg.channel || event.channel || null;
    agg.sentiment = agg.sentiment || event.sentiment || null;
    agg.intent = agg.intent || event.intent || null;
    agg.leadTemperature = agg.leadTemperature || event.leadTemperature || null;
    agg.engaged = agg.engaged ?? event.engaged ?? null;
    agg.booked = agg.booked ?? event.booked ?? null;

    if (event.eventType === "inbound") {
      if (!agg.firstInboundAt || timestamp < agg.firstInboundAt) agg.firstInboundAt = timestamp;
    }
    if (event.eventType === "outbound_reply") {
      agg.replied = true;
      if (!agg.firstReplyAt || timestamp < agg.firstReplyAt) agg.firstReplyAt = timestamp;
    }
    if (event.eventType === "booked_call") {
      agg.booked = true;
      agg.bookedCount += 1;
    }
    if (event.eventType === "sale") {
      agg.saleCount += 1;
      agg.saleValueTotal += Math.max(0, event.saleValue || 0);
    }
    if (event.eventType === "followup_completed") {
      agg.followupCompleted = true;
    }
  }

  return Array.from(byConversation.values());
}

function average(values: number[]) {
  if (!values.length) return null;
  return values.reduce((sum, n) => sum + n, 0) / values.length;
}

export function registerGhlWorkflowRoute(router: Router) {
  router.post("/ghl-ai-analyze", async (req: Request, res: Response) => {
    try {
      requireWorkflowWebhookAuth(req);
    } catch (err: any) {
      return res.status(401).json({ error: err?.message ?? "Unauthorized" });
    }

    try {
      const message =
        typeof req.body?.message === "string" ? req.body.message.trim() : "";
      if (!message) {
        return res.status(400).json({ error: "message is required" });
      }

      const autoTag = Boolean(req.body?.autoTag);
      const storeCustomFields = req.body?.storeCustomFields !== false;
      const recordInboundEvent = req.body?.recordInboundEvent !== false;
      const contactId = toStringOrNull(req.body?.contactId);
      const locationId =
        toStringOrNull(req.body?.locationId) || process.env.GHL_LOCATION_ID || null;
      const conversationId = toStringOrNull(req.body?.conversationId);
      const channel = toStringOrNull(req.body?.channel);
      const repId = toStringOrNull(req.body?.repId);
      const repName = toStringOrNull(req.body?.repName);

      const analysis = await aiAnalyzeMessage(message);
      const tags = extractTagsFromAnalysis(analysis);
      const customFields = buildAnalysisCustomFields(analysis);

      let updateResult:
        | {
            ok: boolean;
            tags?: string[];
            customFieldsUpdated?: number;
            error?: string;
          }
        | null = null;
      if ((autoTag || storeCustomFields) && contactId && locationId && process.env.GHL_PIT) {
        try {
          const contact = await fetchContact(contactId);
          const existing = new Set((contact?.tags || []).map((tag) => tag.toLowerCase()));
          const mergedTags = contact?.tags ? [...contact.tags] : [];
          if (autoTag) {
            for (const tag of tags) {
              if (!existing.has(tag.toLowerCase())) {
                existing.add(tag.toLowerCase());
                mergedTags.push(tag);
              }
            }
          }

          let mergedCustomFields = Array.isArray(contact?.customFields)
            ? [...contact.customFields]
            : [];
          if (storeCustomFields && customFields.length) {
            const byId = new Map<string, { id: string; value: any }>();
            for (const field of mergedCustomFields) {
              if (!field?.id) continue;
              byId.set(String(field.id), { id: String(field.id), value: field.value });
            }
            for (const field of customFields) {
              byId.set(String(field.id), { id: String(field.id), value: field.value });
            }
            mergedCustomFields = Array.from(byId.values());
          }

          await upsertContactWithTags({
            contactId,
            locationId,
            tags: mergedTags,
            email: contact?.email ?? null,
            phone: contact?.phone ?? null,
            firstName: contact?.firstName ?? null,
            lastName: contact?.lastName ?? null,
            customFields:
              storeCustomFields && mergedCustomFields.length ? mergedCustomFields : undefined,
          });
          updateResult = {
            ok: true,
            tags: mergedTags,
            customFieldsUpdated: storeCustomFields ? customFields.length : 0,
          };
        } catch (err: any) {
          updateResult = { ok: false, error: err?.message ?? "Failed to update contact" };
        }
      }

      let eventResult:
        | { ok: boolean; eventId?: string; totalEvents?: number; skipped?: boolean; error?: string }
        | null = null;
      if (recordInboundEvent) {
        if (!conversationId) {
          eventResult = {
            ok: false,
            skipped: true,
            error: "conversationId missing; inbound event not recorded",
          };
        } else {
          try {
            const event: WorkflowEvent = {
              id: uid("wf"),
              eventType: "inbound",
              timestamp: toIsoTimestampOrNow(req.body?.timestamp),
              conversationId,
              contactId,
              locationId,
              channel,
              repId,
              repName,
              sentiment: normalizeSentiment(analysis.sentiment),
              intent: normalizeIntent(analysis.intent),
              leadTemperature: normalizeTemperature(analysis.leadTemperature),
              engaged: analysis.engaged,
              booked: analysis.booked,
              metadata: {
                source: "ghl-ai-analyze",
                summary: analysis.summary,
                recommendedAction: analysis.recommendedAction,
              },
            };
            const totalEvents = await appendWorkflowEvent(event);
            eventResult = { ok: true, eventId: event.id, totalEvents };
          } catch (err: any) {
            eventResult = { ok: false, error: err?.message ?? "Failed to record inbound event" };
          }
        }
      }

      return res.json({
        ok: true,
        analysis,
        tags,
        customFields,
        updateResult,
        eventResult,
      });
    } catch (err: any) {
      console.error("POST /customers/ghl-ai-analyze error:", err);
      return res.status(500).json({ error: err?.message ?? "Internal error" });
    }
  });

  router.post("/ghl-workflow-event", async (req: Request, res: Response) => {
    try {
      requireWorkflowWebhookAuth(req);
    } catch (err: any) {
      return res.status(401).json({ error: err?.message ?? "Unauthorized" });
    }

    try {
      const eventType = toStringOrNull(req.body?.eventType)?.toLowerCase() || "";
      if (!VALID_EVENT_TYPES.has(eventType)) {
        return res.status(400).json({ error: "Invalid eventType" });
      }
      const conversationId = toStringOrNull(req.body?.conversationId);
      if (!conversationId) {
        return res.status(400).json({ error: "conversationId is required" });
      }

      const next: WorkflowEvent = {
        id: uid("wf"),
        eventType: eventType as WorkflowEventType,
        timestamp: toIsoTimestampOrNow(req.body?.timestamp),
        conversationId,
        contactId: toStringOrNull(req.body?.contactId),
        locationId:
          toStringOrNull(req.body?.locationId) || process.env.GHL_LOCATION_ID || null,
        channel: toStringOrNull(req.body?.channel),
        repId: toStringOrNull(req.body?.repId),
        repName: toStringOrNull(req.body?.repName),
        firstResponseSeconds: toFiniteNumberOrNull(req.body?.firstResponseSeconds),
        repliedWithinMinutes: toFiniteNumberOrNull(req.body?.repliedWithinMinutes),
        sentiment: normalizeSentiment(req.body?.sentiment),
        intent: normalizeIntent(req.body?.intent),
        leadTemperature: normalizeTemperature(req.body?.leadTemperature),
        engaged: toBooleanOrNull(req.body?.engaged),
        booked: toBooleanOrNull(req.body?.booked),
        saleValue: toFiniteNumberOrNull(req.body?.saleValue),
        metadata: isObject(req.body?.metadata) ? req.body.metadata : null,
      };

      const totalEvents = await appendWorkflowEvent(next);
      return res.json({ ok: true, event: next, totalEvents });
    } catch (err: any) {
      console.error("POST /customers/ghl-workflow-event error:", err);
      return res.status(500).json({ error: err?.message ?? "Internal error" });
    }
  });

  router.get("/ghl-workflow-events", async (req: Request, res: Response) => {
    try {
      const days = parsePositiveInt(req.query.days, 30, 1, 3650);
      const limit = parsePositiveInt(req.query.limit, 200, 1, 2000);
      const now = Date.now();
      const cutoff = now - days * 24 * 60 * 60 * 1000;
      const events = (await readEvents())
        .filter((event) => {
          const ts = new Date(event.timestamp).getTime();
          return Number.isFinite(ts) && ts >= cutoff;
        })
        .sort((a, b) => b.timestamp.localeCompare(a.timestamp))
        .slice(0, limit);
      return res.json({ days, count: events.length, data: events });
    } catch (err: any) {
      console.error("GET /customers/ghl-workflow-events error:", err);
      return res.status(500).json({ error: err?.message ?? "Internal error" });
    }
  });

  router.get("/ghl-workflow-kpis", async (req: Request, res: Response) => {
    try {
      const days = parsePositiveInt(req.query.days, 30, 1, 3650);
      const slaMinutes = parsePositiveInt(req.query.slaMinutes, 30, 1, 720);
      const now = Date.now();
      const cutoff = now - days * 24 * 60 * 60 * 1000;

      const events = (await readEvents())
        .filter((event) => {
          const ts = new Date(event.timestamp).getTime();
          return Number.isFinite(ts) && ts >= cutoff;
        })
        .sort((a, b) => a.timestamp.localeCompare(b.timestamp));

      const conversations = buildConversationAggregates(events);
      const inboundEvents = events.filter((event) => event.eventType === "inbound");
      const repliedEvents = events.filter((event) => event.eventType === "outbound_reply");
      const bookedEvents = events.filter((event) => event.eventType === "booked_call");
      const saleEvents = events.filter((event) => event.eventType === "sale");
      const followupEvents = events.filter((event) => event.eventType === "followup_completed");

      const responseTimesMin: number[] = [];
      const repliedWithinSlaCount = conversations.filter((conv) => {
        if (!conv.firstInboundAt || !conv.firstReplyAt) return false;
        const diffMin = (conv.firstReplyAt.getTime() - conv.firstInboundAt.getTime()) / (60 * 1000);
        if (Number.isFinite(diffMin) && diffMin >= 0) {
          responseTimesMin.push(diffMin);
        }
        return diffMin <= slaMinutes;
      }).length;

      const sentimentCounts = { positive: 0, neutral: 0, negative: 0 };
      const trendMap = new Map<
        string,
        {
          date: string;
          inbound: number;
          replied: number;
          booked: number;
          sales: number;
          revenue: number;
          positive: number;
          neutral: number;
          negative: number;
        }
      >();
      const hotLeadCount = conversations.filter((conv) => conv.leadTemperature === "hot").length;
      for (const conv of conversations) {
        if (conv.sentiment === "positive") sentimentCounts.positive += 1;
        else if (conv.sentiment === "negative") sentimentCounts.negative += 1;
        else sentimentCounts.neutral += 1;
      }

      const teamMap = new Map<
        string,
        {
          repId: string;
          repName: string;
          replies: number;
          booked: number;
          sales: number;
          responseTimes: number[];
        }
      >();
      for (const conv of conversations) {
        const repId = conv.repId || "unassigned";
        const repName = conv.repName || "Unassigned";
        if (!teamMap.has(repId)) {
          teamMap.set(repId, {
            repId,
            repName,
            replies: 0,
            booked: 0,
            sales: 0,
            responseTimes: [],
          });
        }
        const row = teamMap.get(repId)!;
        if (conv.replied) row.replies += 1;
        row.booked += conv.bookedCount;
        row.sales += conv.saleCount;
        if (conv.firstInboundAt && conv.firstReplyAt) {
          const diff = (conv.firstReplyAt.getTime() - conv.firstInboundAt.getTime()) / (60 * 1000);
          if (Number.isFinite(diff) && diff >= 0) row.responseTimes.push(diff);
        }
      }

      const team = Array.from(teamMap.values()).map((row) => {
        const avgResp = average(row.responseTimes);
        const outcomeRate = row.replies ? ((row.booked + row.sales) / row.replies) * 100 : null;
        return {
          repId: row.repId,
          repName: row.repName,
          replies: row.replies,
          booked: row.booked,
          sales: row.sales,
          avgFirstResponseMinutes: avgResp == null ? null : Number(avgResp.toFixed(2)),
          outcomeRate: outcomeRate == null ? null : Number(outcomeRate.toFixed(2)),
        };
      });

      const overdue = conversations
        .filter((conv) => conv.firstInboundAt && !conv.firstReplyAt)
        .map((conv) => {
          const ageMinutes = Math.floor((now - conv.firstInboundAt!.getTime()) / (60 * 1000));
          return {
            conversationId: conv.conversationId,
            contactId: conv.contactId || null,
            ageMinutes,
            repName: conv.repName || "Unassigned",
            channel: conv.channel || null,
          };
        })
        .filter((item) => item.ageMinutes > slaMinutes)
        .sort((a, b) => b.ageMinutes - a.ageMinutes)
        .slice(0, 100);

      const leaderboardTopResponders = [...team]
        .sort((a, b) => b.replies - a.replies)
        .slice(0, 10);
      const leaderboardFastest = [...team]
        .filter((row) => row.avgFirstResponseMinutes != null)
        .sort((a, b) => (a.avgFirstResponseMinutes! - b.avgFirstResponseMinutes!))
        .slice(0, 10);

      for (const event of events) {
        const day = event.timestamp.slice(0, 10);
        if (!trendMap.has(day)) {
          trendMap.set(day, {
            date: day,
            inbound: 0,
            replied: 0,
            booked: 0,
            sales: 0,
            revenue: 0,
            positive: 0,
            neutral: 0,
            negative: 0,
          });
        }
        const row = trendMap.get(day)!;
        if (event.eventType === "inbound") row.inbound += 1;
        if (event.eventType === "outbound_reply") row.replied += 1;
        if (event.eventType === "booked_call") row.booked += 1;
        if (event.eventType === "sale") {
          row.sales += 1;
          row.revenue += Math.max(0, event.saleValue || 0);
        }
        if (event.sentiment === "positive") row.positive += 1;
        else if (event.sentiment === "negative") row.negative += 1;
        else row.neutral += 1;
      }
      const trends = Array.from(trendMap.values())
        .sort((a, b) => a.date.localeCompare(b.date))
        .map((row) => ({
          ...row,
          revenue: Number(row.revenue.toFixed(2)),
          responseRate: row.inbound ? Number(((row.replied / row.inbound) * 100).toFixed(2)) : null,
        }));

      const engagement = {
        inboundMessages: inboundEvents.length,
        repliedMessages: repliedEvents.length,
        responseRate:
          inboundEvents.length > 0
            ? Number(((repliedEvents.length / inboundEvents.length) * 100).toFixed(2))
            : null,
        averageFirstResponseMinutes:
          responseTimesMin.length > 0
            ? Number((average(responseTimesMin) || 0).toFixed(2))
            : null,
        repliedWithinSlaPct:
          conversations.length > 0
            ? Number(((repliedWithinSlaCount / conversations.length) * 100).toFixed(2))
            : null,
        sentiment: sentimentCounts,
        hotLeadPct:
          conversations.length > 0
            ? Number(((hotLeadCount / conversations.length) * 100).toFixed(2))
            : null,
      };

      const conversion = {
        dmToBookedRate:
          inboundEvents.length > 0
            ? Number(((bookedEvents.length / inboundEvents.length) * 100).toFixed(2))
            : null,
        dmToSaleRate:
          inboundEvents.length > 0
            ? Number(((saleEvents.length / inboundEvents.length) * 100).toFixed(2))
            : null,
        bookedCalls: bookedEvents.length,
        sales: saleEvents.length,
        salesValueTotal: Number(
          saleEvents.reduce((sum, event) => sum + Math.max(0, event.saleValue || 0), 0).toFixed(2)
        ),
        followupCompletionRate:
          inboundEvents.length > 0
            ? Number(((followupEvents.length / inboundEvents.length) * 100).toFixed(2))
            : null,
      };

      return res.json({
        days,
        slaMinutes,
        totals: {
          events: events.length,
          conversations: conversations.length,
        },
        engagement,
        conversion,
        team,
        sla: {
          overdueCount: overdue.length,
          overdue,
        },
        leaderboard: {
          topResponders: leaderboardTopResponders,
          fastestResponders: leaderboardFastest,
        },
        trends,
      });
    } catch (err: any) {
      console.error("GET /customers/ghl-workflow-kpis error:", err);
      return res.status(500).json({ error: err?.message ?? "Internal error" });
    }
  });

  router.get("/ghl-workflow-daily-summary", async (req: Request, res: Response) => {
    try {
      const slaMinutes = parsePositiveInt(req.query.slaMinutes, 30, 1, 720);
      const now = new Date();
      const start = new Date(now);
      start.setHours(0, 0, 0, 0);
      const startMs = start.getTime();
      const nowMs = now.getTime();

      const events = (await readEvents())
        .filter((event) => {
          const ts = new Date(event.timestamp).getTime();
          return Number.isFinite(ts) && ts >= startMs && ts <= nowMs;
        })
        .sort((a, b) => a.timestamp.localeCompare(b.timestamp));

      const conversations = buildConversationAggregates(events);
      const inboundEvents = events.filter((event) => event.eventType === "inbound");
      const repliedEvents = events.filter((event) => event.eventType === "outbound_reply");
      const bookedEvents = events.filter((event) => event.eventType === "booked_call");
      const saleEvents = events.filter((event) => event.eventType === "sale");

      const repliedWithinSlaCount = conversations.filter((conv) => {
        if (!conv.firstInboundAt || !conv.firstReplyAt) return false;
        const diffMin = (conv.firstReplyAt.getTime() - conv.firstInboundAt.getTime()) / (60 * 1000);
        return Number.isFinite(diffMin) && diffMin >= 0 && diffMin <= slaMinutes;
      }).length;

      const overdue = conversations
        .filter((conv) => conv.firstInboundAt && !conv.firstReplyAt)
        .filter((conv) => (nowMs - conv.firstInboundAt!.getTime()) / (60 * 1000) > slaMinutes);

      const salesValue = saleEvents.reduce((sum, event) => sum + Math.max(0, event.saleValue || 0), 0);
      const responseRate =
        inboundEvents.length > 0 ? Number(((repliedEvents.length / inboundEvents.length) * 100).toFixed(2)) : null;

      const summaryLines = [
        `Date: ${start.toISOString().slice(0, 10)}`,
        `Inbound: ${inboundEvents.length}`,
        `Replied: ${repliedEvents.length}`,
        `Response rate: ${responseRate == null ? "-" : `${responseRate}%`}`,
        `Booked calls: ${bookedEvents.length}`,
        `Sales: ${saleEvents.length}`,
        `Sales value: ${Number(salesValue.toFixed(2))}`,
        `SLA<=${slaMinutes}m met: ${repliedWithinSlaCount}/${conversations.length}`,
        `Overdue unreplied: ${overdue.length}`,
      ];

      return res.json({
        date: start.toISOString().slice(0, 10),
        slaMinutes,
        metrics: {
          inbound: inboundEvents.length,
          replied: repliedEvents.length,
          responseRate,
          bookedCalls: bookedEvents.length,
          sales: saleEvents.length,
          salesValue: Number(salesValue.toFixed(2)),
          conversations: conversations.length,
          repliedWithinSla: repliedWithinSlaCount,
          overdueUnreplied: overdue.length,
        },
        summaryText: summaryLines.join("\n"),
      });
    } catch (err: any) {
      console.error("GET /customers/ghl-workflow-daily-summary error:", err);
      return res.status(500).json({ error: err?.message ?? "Internal error" });
    }
  });
}
