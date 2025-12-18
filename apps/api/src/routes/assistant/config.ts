export const ASSISTANT_MODEL =
  process.env.ASSISTANT_MODEL ||
  process.env.OPENROUTER_MODEL ||
  process.env.OPENAI_MODEL ||
  "gpt-4.1-mini";

export const INTERNAL_API_BASE =
  process.env.INTERNAL_API_BASE ||
  (process.env.VERCEL_URL ? `https://${process.env.VERCEL_URL}` : undefined) ||
  process.env.NEXT_PUBLIC_API_BASE ||
  `http://localhost:${process.env.PORT || 3001}`;
