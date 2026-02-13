import { Request, Response, Router } from "express";
import {
  exportConversationMessages,
  listEmailTemplates,
  searchContactsByQuery,
  type GhlConversationMessage,
} from "../../lib/ghl";
import { round2, ymd } from "../analytics/utils";

const DM_STEPS = [20, 25, 30];

const EMAIL_KEYWORDS = [
  "email",
  "mail",
];

const INSTAGRAM_KEYWORDS = [
  "instagram",
  "insta",
  "ig",
  "dm",
  "messenger",
  "facebook",
  "fb",
];

const SPAM_KEYWORDS = [
  "spam",
  "complaint",
  "junk",
  "abuse",
  "blocked",
  "blacklist",
  "suppression",
];

const OPEN_KEYWORDS = ["open", "opened", "read"];

function includesAny(text: string, keywords: string[]) {
  return keywords.some((keyword) => text.includes(keyword));
}

function normalizeText(value: unknown) {
  return String(value ?? "").toLowerCase();
}

function parsePositiveInt(
  value: unknown,
  fallback: number,
  min: number,
  max: number
) {
  const num = Number(value);
  if (!Number.isFinite(num)) return fallback;
  return Math.min(Math.max(Math.round(num), min), max);
}

function safePct(numerator: number, denominator: number) {
  if (!denominator) return null;
  return round2((numerator / denominator) * 100);
}

function isoDateWindow(days: number) {
  const now = new Date();
  const from = new Date(now);
  from.setDate(now.getDate() - (days - 1));
  return {
    from,
    to: now,
    fromYmd: ymd(from),
    toYmd: ymd(now),
  };
}

function buildEmptyDashboardPayload(params: {
  days: number;
  locationId: string | null;
  warning: string;
}) {
  const { fromYmd, toYmd } = isoDateWindow(params.days);
  return {
    days: params.days,
    from: fromYmd,
    to: toYmd,
    locationId: params.locationId ?? "",
    summary: {
      email: {
        sent: 0,
        spam: 0,
        opens: 0,
        spamOpens: 0,
        spamRate: null,
        openRate: null,
        spamOpenRate: null,
      },
      dm: {
        sent: 0,
        replies: 0,
        replyRate: null,
        avgPerActiveDay: null,
        maxPerDay: null,
        currentTarget: DM_STEPS[0],
        nextTarget: DM_STEPS[1],
        checkpoints: DM_STEPS,
        targetMetDays: 0,
        activeDays: 0,
      },
      instagram: {
        dmSent: 0,
        dmReplies: 0,
        comments: 0,
        likes: 0,
        engagementScore: 0,
      },
      channels: {
        email: 0,
        instagram: 0,
        sms: 0,
        call: 0,
        other: 0,
      },
      ghl: {
        pitConfigured: Boolean(process.env.GHL_PIT?.trim()),
        locationConfigured: Boolean(params.locationId),
        customerSampleCount: null,
        templateSampleCount: null,
      },
    },
    diagnostics: {
      messagesScanned: 0,
      pageLimit: 0,
      pagesFetched: 0,
      totalHint: null,
      statusBreakdown: [] as Array<{ value: string; count: number }>,
      messageTypeBreakdown: [] as Array<{ value: string; count: number }>,
      directionBreakdown: [] as Array<{ value: string; count: number }>,
      warnings: [params.warning],
    },
  };
}

function pickCurrentDmTarget(maxPerDay: number | null) {
  if (maxPerDay == null) return DM_STEPS[0];
  let current = DM_STEPS[0];
  for (const step of DM_STEPS) {
    if (maxPerDay >= step) current = step;
  }
  return current;
}

function pickNextDmTarget(current: number) {
  const next = DM_STEPS.find((step) => step > current);
  return next ?? null;
}

function summarizeCounts(map: Map<string, number>, limit = 12) {
  return Array.from(map.entries())
    .sort((a, b) => b[1] - a[1])
    .slice(0, limit)
    .map(([value, count]) => ({ value, count }));
}

function messageSignalText(message: GhlConversationMessage) {
  const parts = [
    message.status,
    message.direction,
    message.type,
    message.messageType,
    message.contentType,
    message.channel,
    message.provider,
    message.providerType,
    message.source,
    message.messageChannel,
  ];
  return parts.map((value) => normalizeText(value)).join(" ");
}

function messageDay(message: GhlConversationMessage) {
  const raw = message.dateAdded || message.dateUpdated;
  if (!raw) return null;
  const ts = new Date(raw);
  if (Number.isNaN(ts.getTime())) return null;
  return ymd(ts);
}

async function fetchMessagesWindow(params: {
  locationId: string;
  startDate: string;
  endDate: string;
  pageLimit: number;
  maxPages: number;
}) {
  const all: GhlConversationMessage[] = [];
  let pagesFetched = 0;
  let cursor: string | null = null;
  let totalHint: number | null = null;
  let fetchError: string | null = null;
  const seenCursors = new Set<string>();

  while (pagesFetched < params.maxPages) {
    let page;
    try {
      page = await exportConversationMessages({
        locationId: params.locationId,
        startDate: params.startDate,
        endDate: params.endDate,
        limit: params.pageLimit,
        lastMessageId: cursor,
      });
    } catch (err: any) {
      fetchError = err?.message ?? "Failed to pull GHL messages";
      break;
    }

    pagesFetched += 1;
    all.push(...page.messages);
    totalHint = page.total ?? totalHint;

    if (!page.nextCursor) break;
    if (seenCursors.has(page.nextCursor)) break;
    seenCursors.add(page.nextCursor);
    cursor = page.nextCursor;
    if (page.messages.length === 0) break;
  }

  const byId = new Map<string, GhlConversationMessage>();
  all.forEach((message) => {
    if (!message?.id) return;
    byId.set(message.id, message);
  });

  return {
    messages: Array.from(byId.values()),
    pagesFetched,
    totalHint,
    fetchError,
  };
}

export function registerGhlDashboardRoute(router: Router) {
  router.get("/ghl-dashboard", async (req: Request, res: Response) => {
    const days = parsePositiveInt(req.query.days, 60, 7, 180);
    const requestedLocationId =
      typeof req.query.locationId === "string" && req.query.locationId.trim()
        ? req.query.locationId.trim()
        : process.env.GHL_LOCATION_ID?.trim() || null;

    try {
      const pitConfigured = Boolean(process.env.GHL_PIT?.trim());
      if (!pitConfigured) {
        return res.status(400).json({ error: "GHL_PIT is not configured" });
      }

      const locationId = requestedLocationId;
      if (!locationId) {
        return res.status(400).json({ error: "GHL_LOCATION_ID is required" });
      }

      const envPageLimit = parsePositiveInt(
        process.env.GHL_DASHBOARD_MSG_PAGE_LIMIT,
        200,
        10,
        500
      );
      const envMaxPages = parsePositiveInt(
        process.env.GHL_DASHBOARD_MAX_PAGES,
        25,
        1,
        200
      );
      const pageLimit = parsePositiveInt(req.query.pageLimit, envPageLimit, 10, 500);
      const maxPages = parsePositiveInt(req.query.maxPages, envMaxPages, 1, 200);
      const { from, to, fromYmd, toYmd } = isoDateWindow(days);

      const startDateIso = from.toISOString();
      const endDateIso = to.toISOString();

      const [
        messagesWindow,
        connectivityContacts,
        connectivityTemplates,
      ] = await Promise.all([
        fetchMessagesWindow({
          locationId,
          startDate: startDateIso,
          endDate: endDateIso,
          pageLimit,
          maxPages,
        }),
        searchContactsByQuery({
          locationId,
          query: "customer",
          page: 1,
          pageLimit: 1,
        }).catch(() => null),
        listEmailTemplates({ locationId, limit: 1 }).catch(() => null),
      ]);

      const messages = messagesWindow.messages;
      const byStatus = new Map<string, number>();
      const byMessageType = new Map<string, number>();
      const byDirection = new Map<string, number>();

      let emailSent = 0;
      let emailSpam = 0;
      let emailOpens = 0;
      let emailSpamOpens = 0;

      let dmSent = 0;
      let dmReplies = 0;
      let igComments = 0;
      let igLikes = 0;

      let channelEmail = 0;
      let channelInstagram = 0;
      let channelSms = 0;
      let channelCall = 0;
      let channelOther = 0;

      const dmByDay = new Map<string, number>();
      let hasSpamSignal = false;
      let hasSpamOpenSignal = false;
      let hasEmailSignal = false;
      let hasInstagramSignal = false;

      for (const message of messages) {
        const status = normalizeText(message.status) || "(none)";
        const direction = normalizeText(message.direction) || "(none)";
        const messageType = normalizeText(message.messageType) || "(none)";
        const signalText = messageSignalText(message);
        const day = messageDay(message);

        byStatus.set(status, (byStatus.get(status) || 0) + 1);
        byMessageType.set(messageType, (byMessageType.get(messageType) || 0) + 1);
        byDirection.set(direction, (byDirection.get(direction) || 0) + 1);

        const isEmail = includesAny(signalText, EMAIL_KEYWORDS);
        const isInstagram = includesAny(signalText, INSTAGRAM_KEYWORDS);
        const isSms = signalText.includes("sms");
        const isCall = signalText.includes("call");
        const isOutbound = direction.includes("outbound");
        const isInbound = direction.includes("inbound");

        if (isEmail) {
          channelEmail += 1;
          hasEmailSignal = true;
        } else if (isInstagram) {
          channelInstagram += 1;
          hasInstagramSignal = true;
        } else if (isSms) {
          channelSms += 1;
        } else if (isCall) {
          channelCall += 1;
        } else {
          channelOther += 1;
        }

        if (isEmail && isOutbound) {
          emailSent += 1;
        }

        if (isEmail && includesAny(signalText, SPAM_KEYWORDS)) {
          emailSpam += 1;
          hasSpamSignal = true;
        }

        const isOpenSignal = isEmail && includesAny(signalText, OPEN_KEYWORDS);
        if (isOpenSignal) {
          emailOpens += 1;
        }
        if (
          isOpenSignal &&
          (includesAny(signalText, SPAM_KEYWORDS) ||
            signalText.includes("spam_open") ||
            signalText.includes("opened_in_spam"))
        ) {
          emailSpamOpens += 1;
          hasSpamOpenSignal = true;
        }

        if (isInstagram && isOutbound) {
          dmSent += 1;
          if (day) dmByDay.set(day, (dmByDay.get(day) || 0) + 1);
        }
        if (isInstagram && isInbound) {
          dmReplies += 1;
        }
        if (isInstagram && signalText.includes("comment")) {
          igComments += 1;
        }
        if (isInstagram && signalText.includes("like")) {
          igLikes += 1;
        }
      }

      const dmDayValues = Array.from(dmByDay.values());
      const dmMaxPerDay = dmDayValues.length ? Math.max(...dmDayValues) : null;
      const dmAvgPerDay = dmDayValues.length
        ? round2(dmDayValues.reduce((sum, value) => sum + value, 0) / dmDayValues.length)
        : null;
      const currentDmTarget = pickCurrentDmTarget(dmMaxPerDay);
      const nextDmTarget = pickNextDmTarget(currentDmTarget);
      const dmTargetMetDays = dmDayValues.filter(
        (count) => count >= currentDmTarget
      ).length;

      const warnings: string[] = [];
      if (!hasEmailSignal) {
        warnings.push(
          "No GHL email-channel messages found in this window. Verify the location or PIT permissions for email traffic."
        );
      }
      if (messagesWindow.fetchError) {
        warnings.push(`GHL message pull warning: ${messagesWindow.fetchError}`);
      }
      if (!hasInstagramSignal) {
        warnings.push(
          "No Instagram/DM-channel messages found in this window. Verify channel connection and location context."
        );
      }
      if (hasEmailSignal && !hasSpamSignal) {
        warnings.push(
          "No explicit spam-status signal found in email messages. Spam rate may remain 0 unless your location emits spam events."
        );
      }
      if (hasEmailSignal && !hasSpamOpenSignal) {
        warnings.push(
          "No explicit spam-folder open signal found. Spam-folder open rate may be unavailable for this location."
        );
      }

      return res.json({
        days,
        from: fromYmd,
        to: toYmd,
        locationId,
        summary: {
          email: {
            sent: emailSent,
            spam: emailSpam,
            opens: emailOpens,
            spamOpens: emailSpamOpens,
            spamRate: safePct(emailSpam, emailSent),
            openRate: safePct(emailOpens, emailSent),
            spamOpenRate: safePct(emailSpamOpens, emailSpam),
          },
          dm: {
            sent: dmSent,
            replies: dmReplies,
            replyRate: safePct(dmReplies, dmSent),
            avgPerActiveDay: dmAvgPerDay,
            maxPerDay: dmMaxPerDay,
            currentTarget: currentDmTarget,
            nextTarget: nextDmTarget,
            checkpoints: DM_STEPS,
            targetMetDays: dmTargetMetDays,
            activeDays: dmDayValues.length,
          },
          instagram: {
            dmSent,
            dmReplies,
            comments: igComments,
            likes: igLikes,
            engagementScore: dmReplies + igComments + igLikes,
          },
          channels: {
            email: channelEmail,
            instagram: channelInstagram,
            sms: channelSms,
            call: channelCall,
            other: channelOther,
          },
          ghl: {
            pitConfigured,
            locationConfigured: Boolean(locationId),
            customerSampleCount:
              connectivityContacts?.total ??
              connectivityContacts?.contacts?.length ??
              null,
            templateSampleCount:
              connectivityTemplates?.templates?.length ?? null,
          },
        },
        diagnostics: {
          messagesScanned: messages.length,
          pageLimit,
          pagesFetched: messagesWindow.pagesFetched,
          totalHint: messagesWindow.totalHint,
          statusBreakdown: summarizeCounts(byStatus),
          messageTypeBreakdown: summarizeCounts(byMessageType),
          directionBreakdown: summarizeCounts(byDirection),
          warnings,
        },
      });
    } catch (err: any) {
      console.error("GET /customers/ghl-dashboard error:", err);
      const message = String(err?.message ?? "Internal error");
      if (message.includes("429")) {
        return res.status(200).json(
          buildEmptyDashboardPayload({
            days,
            locationId: requestedLocationId,
            warning:
              "GHL rate limit reached (429). Returning safe empty dashboard; retry in 30-90 seconds or reduce pull size.",
          })
        );
      }
      return res.status(500).json({ error: err?.message ?? "Internal error" });
    }
  });
}
