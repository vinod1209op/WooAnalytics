import { Request, Response } from "express";
import OpenAI from "openai";
import { resolveDateRange } from "./date-utils";
import { systemPrompt } from "./prompt";
import {
  ASSISTANT_MODEL,
  INTERNAL_API_BASE,
  ToolExecutor,
  toolExecutors,
  toolSchemas
} from "./tools";

async function resolveStoreId(passed: string | undefined) {
  if (passed) return passed;
  if (process.env.STORE_ID) return process.env.STORE_ID;
  const res = await fetch(`${INTERNAL_API_BASE}/stores/default`);
  if (!res.ok) throw new Error("Failed to resolve default store");
  const store = (await res.json()) as { id?: string };
  if (!store?.id) throw new Error("Default store missing id");
  return store.id;
}

function sanitizeAnswer(text: string | null | undefined) {
  if (!text) return text;
  return text
    .replace(/\*\*(.*?)\*\*/g, "$1") // strip bold
    .replace(/^#{1,6}\s*/gm, "") // strip markdown headings
    .trim();
}

export async function handleAssistantQuery(req: Request, res: Response) {
  try {
    const apiKey = process.env.OPENROUTER_API_KEY;
    const baseURL = process.env.OPENROUTER_BASE_URL || "https://openrouter.ai/api/v1";
    const { message, storeId: bodyStoreId, filters = {}, history = [] } = req.body || {};
    const mockMode = process.env.ASSISTANT_MOCK === "1" || req.body?.mock === true;

    if (!message || typeof message !== "string") {
      return res.status(400).json({ error: "message is required" });
    }

    const storeId = await resolveStoreId(bodyStoreId);
    const { finalFrom, finalTo } = resolveDateRange(message, filters);
    const baseArgs = {
      storeId,
      from: finalFrom,
      to: finalTo,
      category: filters.category,
      coupon: filters.coupon
    };

    if (mockMode || !apiKey) {
      const dataUsed: any[] = [];
      let summary = "Assistant mock mode: no LLM available.";
      try {
        const kpis = await toolExecutors.get_kpis(baseArgs);
        dataUsed.push({ tool: "get_kpis", args: baseArgs, result: kpis });
        summary = `Revenue: ${kpis.revenue ?? "n/a"}, Orders: ${kpis.orders ?? "n/a"}, AOV: ${
          kpis.aov ?? "n/a"
        }.`;
      } catch (e: any) {
        summary += ` (KPI fetch failed: ${e?.message || e})`;
      }
      return res.json({ answer: summary, dataUsed });
    }

    const openai = new OpenAI({ apiKey, baseURL });
    const lower = message.toLowerCase();
    let allowedTools = toolSchemas;
    const mentionsProduct = lower.includes("product");
    const mentionsCategory = lower.includes("category");
    if (mentionsProduct && !mentionsCategory) {
      allowedTools = toolSchemas.filter((t) => t.name !== "get_top_categories");
    } else if (mentionsCategory && !mentionsProduct) {
      allowedTools = toolSchemas.filter((t) => t.name !== "get_top_products");
    }
    const messages: any[] = [
      { role: "system", content: systemPrompt },
      {
        role: "system",
        content: `Use these filters unless the user overrides them explicitly: storeId=${storeId}, from=${finalFrom}, to=${finalTo}, category=${
          baseArgs.category ?? "none"
        }, coupon=${baseArgs.coupon ?? "none"}. Always reflect these dates/filters in the answer.`
      },
      ...(Array.isArray(history) ? history : []),
      {
        role: "user",
        content: message
      }
    ];

    const completion = await openai.chat.completions.create({
      model: ASSISTANT_MODEL,
      messages,
      tools: allowedTools.map((t) => ({
        type: "function",
        function: {
          name: t.name,
          description: t.description,
          parameters: t.parameters as any
        }
      })),
      tool_choice: "auto"
    });

    const choice = completion.choices[0];
    const toolCalls = choice.message.tool_calls || [];
    const dataUsed: any[] = [];
    const toolMessages: any[] = [];

    for (const call of toolCalls) {
      const name = call.function.name;
      const args = JSON.parse(call.function.arguments || "{}");
      const exec: ToolExecutor | undefined = toolExecutors[name];
      if (!exec) continue;
      const mergedArgs = {
        ...args,
        storeId,
        from: finalFrom,
        to: finalTo,
        category: baseArgs.category,
        coupon: baseArgs.coupon
      };
      const result = await exec(mergedArgs);
      dataUsed.push({ tool: name, args: mergedArgs, result });
      toolMessages.push({
        role: "tool",
        tool_call_id: call.id,
        content: JSON.stringify(result)
      });
    }

    let finalMessage = choice.message.content;
    if (toolMessages.length > 0) {
      const followUp = await openai.chat.completions.create({
        model: ASSISTANT_MODEL,
        messages: [
          ...messages,
          {
            role: "assistant",
            tool_calls: toolCalls,
            content: choice.message.content || ""
          },
          ...toolMessages
        ]
      });
      finalMessage = followUp.choices[0].message.content;
    }

    res.json({
      answer: sanitizeAnswer(finalMessage),
      dataUsed
    });
  } catch (err: any) {
    console.error("POST /assistant/query error:", err);
    res.status(500).json({ error: err?.message || "Assistant query failed" });
  }
}
