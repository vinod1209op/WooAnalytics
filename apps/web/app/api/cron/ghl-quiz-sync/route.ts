"use server";

import { NextResponse } from "next/server";

const API_BASE =
  process.env.NEXT_PUBLIC_API_BASE?.trim() || "http://localhost:3001";
const CRON_SECRET = process.env.CRON_SECRET;

async function resolveStoreId() {
  const res = await fetch(`${API_BASE}/stores/default`, { cache: "no-store" });
  if (!res.ok) {
    const text = await res.text();
    throw new Error(
      `Failed to resolve default store: ${res.status} ${res.statusText} ${text}`
    );
  }
  const store = (await res.json()) as { id?: string };
  if (!store?.id) throw new Error("Default store did not return an id");
  return store.id;
}

export async function POST(req: Request) {
  try {
    if (!CRON_SECRET) {
      return NextResponse.json(
        { error: "CRON_SECRET is not configured" },
        { status: 500 }
      );
    }

    const body = await req.json();
    const storeId = await resolveStoreId();
    const res = await fetch(`${API_BASE}/cron/sync-ghl-quiz-tags`, {
      method: "POST",
      headers: {
        Authorization: `Bearer ${CRON_SECRET}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        ...body,
        storeId,
      }),
      cache: "no-store",
    });

    const text = await res.text();
    let payload: any = { raw: text };
    try {
      payload = JSON.parse(text);
    } catch {
      payload = { raw: text };
    }

    return NextResponse.json(payload, { status: res.status });
  } catch (err: any) {
    console.error("api/cron/ghl-quiz-sync error:", err);
    return NextResponse.json(
      { error: err?.message ?? "Request failed" },
      { status: 500 }
    );
  }
}
