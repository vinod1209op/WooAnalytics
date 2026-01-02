"use client";

import { useState, useCallback } from "react";
import { useStore } from "@/providers/store-provider";
import type { FilterState } from "@/components/filters/filter-bar";

type ChatMessage = { role: "user" | "assistant"; content: string };

type SendParams = {
  message: string;
  filters?: FilterState;
};

export function useAssistantChat() {
  const { store, loading: storeLoading, error: storeError } = useStore();
  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const apiBase =
    (typeof window !== "undefined"
      ? process.env.NEXT_PUBLIC_API_BASE
      : process.env.NEXT_PUBLIC_API_BASE) || "http://localhost:3001";

  const sendMessage = useCallback(
    async ({ message, filters }: SendParams) => {
      if (!message.trim()) return;
      if (storeLoading) return;
      if (!store?.id || storeError) {
        setError(storeError || "No store configured");
        return;
      }

      setMessages((prev) => [...prev, { role: "user", content: message }]);
      setLoading(true);
      setError(null);

      try {
        const controller = new AbortController();
        const timeout = setTimeout(() => controller.abort(), 30000);

        const res = await fetch(`${apiBase}/assistant/query`, {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            message,
            storeId: store.id,
            filters: filters
              ? {
                  from: filters.date?.from
                    ? filters.date.from.toISOString().slice(0, 10)
                    : undefined,
                  to: filters.date?.to
                    ? filters.date.to.toISOString().slice(0, 10)
                    : undefined,
                  category:
                    filters.type === "category" ? filters.category || undefined : undefined,
                  coupon:
                    filters.type === "coupon" ? filters.coupon || undefined : undefined,
                }
              : undefined,
          }),
          signal: controller.signal,
        });
        clearTimeout(timeout);

        if (!res.ok) {
          const text = await res.text();
          throw new Error(text || "Assistant request failed");
        }

        const data = (await res.json()) as { answer?: string; error?: string };
        if (data.error) throw new Error(data.error);

        const answer = data.answer ?? "No answer returned.";
        setMessages((prev) => [...prev, { role: "assistant", content: answer }]);
      } catch (e: unknown) {
        const error = e instanceof Error ? e : null;
        const msg =
          error?.name === "AbortError"
            ? "Request timed out. Please try again."
            : error?.message || "Assistant request failed";
        setError(msg);
      } finally {
        setLoading(false);
      }
    },
    [store?.id, storeLoading, storeError, apiBase]
  );

  const clearMessages = useCallback(() => setMessages([]), []);

  return { messages, sendMessage, clearMessages, loading: loading || storeLoading, error: error || storeError };
}
