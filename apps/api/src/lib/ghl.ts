const GHL_BASE =
  process.env.GHL_API_BASE?.replace(/\/$/, "") ||
  "https://services.leadconnectorhq.com";

const defaultHeaders = () => ({
  Authorization: `Bearer ${process.env.GHL_PIT}`,
  "Content-Type": "application/json",
  Version: "2021-07-28",
});

export async function upsertContactWithTags(payload: {
  email?: string | null;
  phone?: string | null;
  firstName?: string | null;
  lastName?: string | null;
  locationId: string;
  tags: string[];
}) {
  if (!process.env.GHL_PIT) throw new Error("GHL_PIT missing");

  const res = await fetch(`${GHL_BASE}/contacts/`, {
    method: "POST",
    headers: defaultHeaders(),
    body: JSON.stringify({
      ...payload,
      locationId: payload.locationId,
      tags: payload.tags,
      email: payload.email || undefined,
      phone: payload.phone || undefined,
      firstName: payload.firstName || undefined,
      lastName: payload.lastName || undefined,
    }),
  });

  if (res.status === 429) {
    throw new Error("GHL rate limited (429)");
  }

  if (!res.ok) {
    const text = await res.text();
    throw new Error(`GHL upsert failed ${res.status}: ${text}`);
  }

  return res.json();
}
