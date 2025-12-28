export type GhlFieldDef = {
  id: string;
  name?: string;
  fieldKey?: string;
};

export type GhlMappedField = {
  id: string;
  name?: string;
  fieldKey?: string;
  value: any;
};

export type GhlCommerceFields = {
  totalOrdersCount: number | null;
  totalSpend: number | null;
  lastOrderDate: string | null;
  lastOrderValue: number | null;
  firstOrderDate: string | null;
  firstOrderValue: number | null;
  orderSubscription: string | null;
  productsOrdered: string[];
};

export function normalizeFieldDefs(defs: any): GhlFieldDef[] {
  const items = Array.isArray(defs?.customFields)
    ? defs.customFields
    : Array.isArray(defs)
    ? defs
    : [];
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

export function buildFieldDefMap(defs: GhlFieldDef[]) {
  const map = new Map<string, GhlFieldDef>();
  defs.forEach((def) => map.set(def.id, def));
  return map;
}

export function mapCustomFields(
  customFields: Array<{ id: string; value: any }> | undefined,
  defMap: Map<string, GhlFieldDef>
): GhlMappedField[] {
  return (customFields || []).map((field) => {
    const id = String(field.id);
    const def = defMap.get(id);
    return {
      id,
      name: def?.name,
      fieldKey: def?.fieldKey,
      value: field.value,
    };
  });
}

function normalizeText(value?: string | null) {
  return (value || '')
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, ' ')
    .replace(/\s+/g, ' ')
    .trim();
}

function matchesTokens(text: string, tokens: string[]) {
  return tokens.every((token) => text.includes(token));
}

function findFieldValue(fields: GhlMappedField[], tokenSets: string[][]) {
  for (const tokens of tokenSets) {
    const match = fields.find((field) => {
      const text = `${normalizeText(field.name)} ${normalizeText(field.fieldKey)}`;
      return matchesTokens(text, tokens);
    });
    if (match) return match.value;
  }
  return null;
}

function toNumber(value: any): number | null {
  if (value == null || value === '') return null;
  const num = Number(value);
  return Number.isFinite(num) ? num : null;
}

function toIso(value: any): string | null {
  if (!value) return null;
  const d = new Date(value);
  if (Number.isNaN(+d)) return null;
  return d.toISOString();
}

function toStringArray(value: any): string[] {
  if (!value) return [];
  if (Array.isArray(value)) return value.map((item) => String(item));
  return [String(value)];
}

export function extractCommerceFields(fields: GhlMappedField[]): GhlCommerceFields {
  const totalOrdersCount = toNumber(
    findFieldValue(fields, [
      ['total', 'orders', 'count'],
      ['orders', 'count'],
      ['total', 'orders'],
    ])
  );
  const totalSpend = toNumber(
    findFieldValue(fields, [
      ['total', 'spend'],
      ['total', 'spent'],
      ['lifetime', 'value'],
    ])
  );
  const lastOrderDate = toIso(
    findFieldValue(fields, [
      ['last', 'order', 'date'],
      ['last', 'order'],
    ])
  );
  const lastOrderValue = toNumber(
    findFieldValue(fields, [
      ['last', 'order', 'value'],
      ['last', 'order', 'total'],
    ])
  );
  const firstOrderDate = toIso(
    findFieldValue(fields, [
      ['first', 'order', 'date'],
      ['first', 'order'],
    ])
  );
  const firstOrderValue = toNumber(
    findFieldValue(fields, [
      ['first', 'order', 'value'],
      ['first', 'order', 'total'],
    ])
  );
  const orderSubscription = String(
    findFieldValue(fields, [['order', 'subscription']]) ?? ''
  ).trim();
  const productsOrdered = toStringArray(
    findFieldValue(fields, [['products', 'ordered']])
  ).filter(Boolean);

  return {
    totalOrdersCount,
    totalSpend,
    lastOrderDate,
    lastOrderValue,
    firstOrderDate,
    firstOrderValue,
    orderSubscription: orderSubscription || null,
    productsOrdered,
  };
}

export function extractWooId(fields: GhlMappedField[]) {
  const wooId = findFieldValue(fields, [
    ['woo', 'customer', 'id'],
    ['woocommerce', 'customer', 'id'],
    ['woo', 'id'],
    ['woocommerce', 'id'],
  ]);
  if (wooId == null || wooId === '') return null;
  const asString = String(wooId).trim();
  return asString ? asString : null;
}

export function formatGhlAddress(contact: {
  address?: string | null;
  address1?: string | null;
  address2?: string | null;
  city?: string | null;
  state?: string | null;
  postalCode?: string | null;
  zip?: string | null;
  country?: string | null;
}) {
  const parts: string[] = [];
  const seen = new Set<string>();
  const push = (value?: string | null) => {
    const trimmed = value?.trim();
    if (!trimmed) return;
    const key = trimmed.toLowerCase();
    if (seen.has(key)) return;
    seen.add(key);
    parts.push(trimmed);
  };
  push(contact.address);
  push(contact.address1);
  push(contact.address2);
  push(contact.city);
  push(contact.state);
  push(contact.postalCode);
  push(contact.zip);
  push(contact.country);
  return parts.length ? parts.join(', ') : null;
}
