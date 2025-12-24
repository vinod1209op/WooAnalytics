const GHL_BASE =
  process.env.GHL_API_BASE?.replace(/\/$/, "") ||
  "https://services.leadconnectorhq.com";

const defaultHeaders = () => ({
  Authorization: `Bearer ${process.env.GHL_PIT}`,
  "Content-Type": "application/json",
  Accept: "application/json",
  Version: "2021-07-28",
});

type GhlContact = {
  id: string;
  email?: string | null;
  phone?: string | null;
  firstName?: string | null;
  lastName?: string | null;
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
  const res = await fetch(`${GHL_BASE}/contacts/${payload.contactId}`, {
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

  const res = await fetch(`${GHL_BASE}/contacts/`, {
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
  const res = await fetch(`${GHL_BASE}/contacts/${contactId}`, {
    method: "GET",
    headers: defaultHeaders(),
  });
  const json = await handleGhlResponse(res, "GHL fetch contact");
  return json?.contact ?? json;
}

export async function listCustomFields(locationId: string) {
  if (!process.env.GHL_PIT) throw new Error("GHL_PIT missing");
  const url = `${GHL_BASE}/locations/${locationId}/customFields`;
  const res = await fetch(url, {
    method: "GET",
    headers: defaultHeaders(),
  });
  return handleGhlResponse(res, "GHL list custom fields");
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

  const res = await fetch(`${GHL_BASE}/contacts/search`, {
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
