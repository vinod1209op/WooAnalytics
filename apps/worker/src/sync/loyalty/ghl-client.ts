import type { GhlContact, GhlFieldDef } from "./types";

const GHL_BASE =
  process.env.GHL_API_BASE?.replace(/\/$/, "") ||
  "https://services.leadconnectorhq.com";

function defaultHeaders() {
  return {
    Authorization: `Bearer ${process.env.GHL_PIT}`,
    "Content-Type": "application/json",
    Accept: "application/json",
    Version: "2021-07-28",
  };
}

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

async function handleGhlResponse(res: Response, action: string): Promise<any> {
  if (res.status === 429) {
    throw new Error("GHL rate limited (429)");
  }
  if (!res.ok) {
    const text = await res.text();
    throw new Error(`${action} failed ${res.status}: ${text}`);
  }
  return res.json();
}

export async function listCustomFields(locationId: string): Promise<GhlFieldDef[]> {
  const res = await fetchWithRetry(`${GHL_BASE}/locations/${locationId}/customFields`, {
    method: "GET",
    headers: defaultHeaders(),
  });
  const json = await handleGhlResponse(res, "GHL list custom fields");
  const items = Array.isArray(json?.customFields) ? json.customFields : [];
  return items
    .map((item: any) => {
      if (!item?.id) return null;
      return {
        id: String(item.id),
        name: item.name,
        fieldKey: item.fieldKey || item.key,
      } as GhlFieldDef;
    })
    .filter(Boolean) as GhlFieldDef[];
}

export async function createCustomField(params: {
  locationId: string;
  name: string;
  dataType: "NUMERICAL" | "TEXT";
  model?: "contact";
}) {
  const res = await fetchWithRetry(`${GHL_BASE}/locations/${params.locationId}/customFields`, {
    method: "POST",
    headers: defaultHeaders(),
    body: JSON.stringify({
      name: params.name,
      dataType: params.dataType,
      model: params.model ?? "contact",
      placeholder: "",
    }),
  });
  return handleGhlResponse(res, "GHL create custom field");
}

export async function searchContactsByQuery(params: {
  locationId: string;
  query: string;
  page?: number;
  pageLimit?: number;
}) {
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
  const contacts = Array.isArray(json?.contacts) ? (json.contacts as GhlContact[]) : [];
  return {
    contacts: contacts.filter((c) => c && (c as any).id),
    total: json?.total ?? contacts.length,
    nextPage: contacts.length ? (body.page ?? 1) + 1 : null,
  };
}

export async function updateContactCustomFields(
  contactId: string,
  customFields: Array<{ id: string; value: any }>
) {
  const res = await fetchWithRetry(`${GHL_BASE}/contacts/${contactId}`, {
    method: "PUT",
    headers: defaultHeaders(),
    body: JSON.stringify({ customFields }),
  });
  return handleGhlResponse(res, "GHL update contact");
}
