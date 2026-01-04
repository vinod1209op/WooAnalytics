const GHL_BASE =
  process.env.GHL_API_BASE?.replace(/\/$/, "") ||
  "https://services.leadconnectorhq.com";

const defaultHeaders = () => ({
  Authorization: `Bearer ${process.env.GHL_PIT}`,
  "Content-Type": "application/json",
  Accept: "application/json",
  Version: "2021-07-28",
});

function sleep(ms: number) {
  return new Promise<void>((resolve) => setTimeout(resolve, ms));
}

async function fetchWithRetry(
  url: string,
  init: RequestInit,
  options: { retries?: number; baseDelayMs?: number } = {}
) {
  const retries = options.retries ?? 3;
  let delayMs = options.baseDelayMs ?? 400;
  for (let attempt = 0; attempt <= retries; attempt += 1) {
    const res = await fetch(url, init);
    if (res.status !== 429 || attempt === retries) return res;
    const retryAfter = res.headers.get("retry-after");
    let waitMs = retryAfter ? Number.parseInt(retryAfter, 10) * 1000 : delayMs;
    if (!Number.isFinite(waitMs) || waitMs <= 0) waitMs = delayMs;
    await sleep(waitMs);
    delayMs *= 2;
  }
  return fetch(url, init);
}

type GhlContact = {
  id: string;
  email?: string | null;
  phone?: string | null;
  firstName?: string | null;
  lastName?: string | null;
  dateAdded?: string | null;
  dateUpdated?: string | null;
  address?: string | null;
  address1?: string | null;
  address2?: string | null;
  city?: string | null;
  state?: string | null;
  postalCode?: string | null;
  zip?: string | null;
  country?: string | null;
  tags?: string[];
  customFields?: Array<{ id: string; value: any }>;
};

async function handleGhlResponse(res: Response, action: string) {
  if (res.status === 429) {
    throw new Error("GHL rate limited (429)");
  }
  if (!res.ok) {
    const text = await res.text();
    throw new Error(`${action} failed ${res.status}: ${text}`);
  }
  return res.json();
}

type UpsertPayload = {
  contactId?: string;
  email?: string | null;
  phone?: string | null;
  firstName?: string | null;
  lastName?: string | null;
  locationId: string;
  tags: string[];
  customFields?: Array<{ id: string; value: any }>;
};

async function updateContactById(payload: UpsertPayload) {
  if (!payload.contactId) throw new Error("contactId is required for update");
  const res = await fetchWithRetry(`${GHL_BASE}/contacts/${payload.contactId}`, {
    method: "PUT",
    headers: defaultHeaders(),
    body: JSON.stringify({
      email: payload.email || undefined,
      phone: payload.phone || undefined,
      firstName: payload.firstName || undefined,
      lastName: payload.lastName || undefined,
      tags: payload.tags,
      customFields: payload.customFields,
    }),
  });
  return handleGhlResponse(res, "GHL update contact");
}

export async function upsertContactWithTags(payload: UpsertPayload) {
  if (!process.env.GHL_PIT) throw new Error("GHL_PIT missing");

  // If we already have the contactId, prefer update to avoid duplicate errors.
  if (payload.contactId) {
    return updateContactById(payload);
  }

  const res = await fetchWithRetry(`${GHL_BASE}/contacts/`, {
    method: "POST",
    headers: defaultHeaders(),
    body: JSON.stringify({
      ...payload,
      locationId: payload.locationId,
      tags: payload.tags,
      customFields: payload.customFields,
      email: payload.email || undefined,
      phone: payload.phone || undefined,
      firstName: payload.firstName || undefined,
      lastName: payload.lastName || undefined,
    }),
  });

  const text = await res.text();
  // Handle duplicate-contact rule: fall back to update if email already exists.
  if (res.status === 400 && text.includes("does not allow duplicated contacts")) {
    const parsed: any = (() => {
      try {
        return JSON.parse(text);
      } catch {
        return null;
      }
    })();
    const contactId = parsed?.meta?.contactId;
    if (contactId) {
      return updateContactById({ ...payload, contactId });
    }
    // If we cannot extract contactId, rethrow with context.
    throw new Error(`GHL duplicate contact and no id returned: ${text}`);
  }

  // If not duplicate, handle normally.
  if (!res.ok) {
    throw new Error(`GHL upsert failed ${res.status}: ${text}`);
  }
  return JSON.parse(text);
}

export async function fetchContact(contactId: string): Promise<GhlContact> {
  if (!process.env.GHL_PIT) throw new Error("GHL_PIT missing");
  const res = await fetchWithRetry(`${GHL_BASE}/contacts/${contactId}`, {
    method: "GET",
    headers: defaultHeaders(),
  });
  const json = await handleGhlResponse(res, "GHL fetch contact");
  return json?.contact ?? json;
}

export async function listCustomFields(locationId: string) {
  if (!process.env.GHL_PIT) throw new Error("GHL_PIT missing");
  const url = `${GHL_BASE}/locations/${locationId}/customFields`;
  const res = await fetchWithRetry(url, {
    method: "GET",
    headers: defaultHeaders(),
  });
  return handleGhlResponse(res, "GHL list custom fields");
}

export async function sendConversationEmail(params: {
  contactId: string;
  subject: string;
  message: string;
  locationId?: string | null;
  emailFrom?: string | null;
  fromName?: string | null;
  emailTo?: string | null;
}) {
  if (!process.env.GHL_PIT) throw new Error("GHL_PIT missing");
  const toHtml = (value: string) =>
    value
      .replace(/&/g, "&amp;")
      .replace(/</g, "&lt;")
      .replace(/>/g, "&gt;")
      .replace(/\n/g, "<br />");
  const body: Record<string, any> = {
    type: "Email",
    contactId: params.contactId,
    subject: params.subject,
    message: params.message,
    html: toHtml(params.message),
    text: params.message,
  };
  if (params.locationId) body.locationId = params.locationId;
  if (params.emailFrom) body.emailFrom = params.emailFrom;
  if (params.fromName) body.fromName = params.fromName;
  if (params.emailTo) body.emailTo = params.emailTo;

  const res = await fetchWithRetry(`${GHL_BASE}/conversations/messages`, {
    method: "POST",
    headers: defaultHeaders(),
    body: JSON.stringify(body),
  });
  return handleGhlResponse(res, "GHL send email");
}

type GhlEmailTemplate = {
  id: string;
  name?: string | null;
  subject?: string | null;
  updatedAt?: string | null;
};

async function fetchTemplateCandidates(candidates: string[]) {
  for (const url of candidates) {
    const res = await fetchWithRetry(url, {
      method: "GET",
      headers: defaultHeaders(),
    });
    if (!res.ok) {
      continue;
    }
    try {
      const json = await handleGhlResponse(res, "GHL list templates");
      return { json, url };
    } catch {
      continue;
    }
  }
  return null;
}

function normalizeTemplates(payload: any, limit: number) {
  const candidates = [
    payload?.builders,
    payload?.templates,
    payload?.emails,
    payload?.items,
    payload?.data,
    payload?.data?.templates,
    payload?.data?.emails,
    payload?.data?.items,
    payload?.templates?.data,
    payload?.templates?.items,
    payload?.templates?.templates,
    payload?.emails?.data,
    payload?.items?.items,
    payload?.items?.data,
    payload?.data?.templates?.data,
    payload?.data?.templates?.items,
    payload?.data?.items?.data,
    payload?.data?.items?.items,
  ];
  const raw = (candidates.find(Array.isArray) as any[]) || (Array.isArray(payload) ? payload : []);

  const templates = (raw as any[])
    .map((item) => {
      const itemType = String(item?.type || item?.templateType || "").toLowerCase();
      if (item?.isFolder || itemType === "folder") return null;
      const id = item?.id || item?._id || item?.templateId;
      if (!id) return null;
      const name =
        item?.name ||
        item?.title ||
        item?.templateName ||
        item?.subject ||
        null;
      const subject = item?.subject || item?.emailSubject || name || null;
      return {
        id: String(id),
        name,
        subject,
        updatedAt:
          item?.updatedAt ||
          item?.updated_at ||
          item?.modifiedAt ||
          item?.dateUpdated ||
          null,
        previewUrl: item?.previewUrl || item?.preview_url || null,
      } as GhlEmailTemplate;
    })
    .filter((item): item is GhlEmailTemplate => !!item);

  return templates.slice(0, Math.max(limit, 1));
}

export async function listEmailTemplates(params: {
  locationId: string;
  limit?: number;
  debug?: boolean;
}) {
  if (!process.env.GHL_PIT) throw new Error("GHL_PIT missing");
  const limit = params.limit ?? 3;

  const overridePath = process.env.GHL_TEMPLATES_PATH?.trim();
  const candidates: string[] = [];

  if (overridePath) {
    const path = overridePath.replace("{locationId}", params.locationId);
    if (/^https?:\/\//i.test(path)) {
      candidates.push(path);
    } else {
      candidates.push(`${GHL_BASE}${path.startsWith("/") ? "" : "/"}${path}`);
    }
  } else {
    candidates.push(
      `${GHL_BASE}/locations/${params.locationId}/templates?type=email`,
      `${GHL_BASE}/templates?locationId=${params.locationId}&type=email`,
      `${GHL_BASE}/emails/templates?locationId=${params.locationId}`
    );
  }

  const result = await fetchTemplateCandidates(candidates);
  if (!result) {
    throw new Error("GHL email templates endpoint not found");
  }

  const templates = normalizeTemplates(result.json, limit);
  if (params.debug) {
    return {
      templates,
      sourceUrl: result.url,
      raw: result.json,
    };
  }
  return { templates };
}

export type SearchContactsResult = {
  contacts: GhlContact[];
  total?: number;
  nextPage?: number | null;
};

export async function searchContactsByQuery(params: {
  locationId: string;
  query: string;
  page?: number;
  pageLimit?: number;
}) {
  if (!process.env.GHL_PIT) throw new Error("GHL_PIT missing");
  const body: any = {
    locationId: params.locationId,
    page: params.page ?? 1,
    pageLimit: Math.min(Math.max(params.pageLimit || 50, 1), 200),
    query: params.query || "",
  };

  const res = await fetchWithRetry(`${GHL_BASE}/contacts/search`, {
    method: "POST",
    headers: defaultHeaders(),
    body: JSON.stringify(body),
  });

  const json = await handleGhlResponse(res, "GHL search contacts");
  if (Array.isArray(json?.contacts)) {
    const validContacts = (json.contacts as GhlContact[]).filter((c) => c && (c as any).id);
    return {
      contacts: validContacts,
      total: json.total,
      nextPage: validContacts.length ? (body.page ?? 1) + 1 : null,
    } as SearchContactsResult;
  }
  return { contacts: [], total: 0 };
}

export async function searchContacts(params: {
  locationId: string;
  tag?: string;
  page?: number;
  pageLimit?: number;
}) {
  return searchContactsByQuery({
    locationId: params.locationId,
    query: params.tag || "",
    page: params.page,
    pageLimit: params.pageLimit,
  });
}

export type { GhlContact };
