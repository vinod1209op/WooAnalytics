import { fetchContact, listCustomFields, searchContacts } from "../../lib/ghl";
import { QUIZ_FIELD_IDS } from "../../lib/quiz-field-map";

export type FieldDefMap = Record<string, { name?: string; fieldKey?: string }>;

export async function fetchQuizFieldDrift(locationId: string) {
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

export function buildFieldDefsMap(defs: any): FieldDefMap {
  const defsArray = Array.isArray(defs?.customFields)
    ? defs.customFields
    : Array.isArray(defs)
    ? defs
    : [];
  const fieldDefsMap: FieldDefMap = {};
  for (const d of defsArray) {
    if (d?.id) {
      fieldDefsMap[String(d.id)] = { name: d.name, fieldKey: d.fieldKey || d.key };
    }
  }
  return fieldDefsMap;
}

export async function fetchContactsByTag(opts: {
  locationId: string;
  tag: string;
  limit: number;
  sleep: (ms: number) => Promise<void>;
}) {
  const contacts: any[] = [];
  let page = 1;
  while (contacts.length < opts.limit) {
    const batch = await searchContacts({
      locationId: opts.locationId,
      tag: opts.tag,
      page,
      pageLimit: Math.min(50, opts.limit - contacts.length),
    });
    if (batch.contacts?.length) {
      contacts.push(...batch.contacts);
    }
    if (!batch.nextPage || !batch.contacts?.length) break;
    page = batch.nextPage;
    await opts.sleep(200);
  }
  return contacts;
}

export async function ensureContactFields(contact: any) {
  if (Array.isArray(contact.customFields) && contact.customFields.length > 0) {
    return contact;
  }
  return fetchContact(contact.id);
}
