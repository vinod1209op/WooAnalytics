"use client";

import { useEffect, useState } from "react";
import { MessageList } from "./message-list";
import { ChatInput } from "./chat-input";
import { ChatSuggestions } from "./chat-suggestions";
import { useAssistantChat } from "@/hooks/useAssistantChat";
import { useHasMounted } from "@/hooks/useHasMounted";
import { Sparkles, X } from "lucide-react";

const suggestions = [
  "Revenue last 7 days vs previous 7",
  "Top 5 products this month",
  "Are refunds trending up?",
  "New vs returning customers last week"
];

export function ChatWidget() {
  const hasMounted = useHasMounted();
  const { messages, sendMessage, clearMessages, loading, error } = useAssistantChat();
  const [open, setOpen] = useState(false);
  const [input, setInput] = useState("");
  const [showSuggestions, setShowSuggestions] = useState(false);

  useEffect(() => {
    const handler = (e: KeyboardEvent) => {
      if (e.ctrlKey && e.key.toLowerCase() === "k") {
        e.preventDefault();
        setOpen((v) => !v);
      }
    };
    window.addEventListener("keydown", handler);
    return () => window.removeEventListener("keydown", handler);
  }, []);

  if (!hasMounted) return null;

  const handleSend = async () => {
    if (!input.trim()) return;
    await sendMessage({ message: input.trim() });
    setInput("");
  };

  return (
    <>
      <button
        onClick={() => setOpen((v) => !v)}
        className="fixed bottom-4 right-4 z-50 flex h-11 w-11 items-center justify-center rounded-full bg-purple-600 text-white shadow-lg hover:bg-purple-700 focus:outline-none focus:ring-2 focus:ring-purple-400"
        aria-label="Open chat"
      >
        <Sparkles className="h-5 w-5" />
      </button>

      {open && (
        <div className="fixed bottom-16 right-4 z-50 flex w-full max-w-sm flex-col overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-2xl dark:border-slate-800 dark:bg-slate-900 max-h-[60vh] h-[400px] text-sm">
          <div className="flex items-center justify-between border-b border-slate-200 bg-purple-600 px-3 py-2 text-white text-sm font-semibold dark:border-slate-800">
            <div className="flex items-center gap-2">
              <Sparkles className="h-5 w-5" />
              <div className="text-sm">AI Assistant</div>
            </div>
            <div className="flex items-center gap-2">
              <button
                onClick={() => clearMessages()}
                className="rounded-md bg-white/20 px-2 py-[2px] text-[11px] text-white hover:bg-white/30 focus:outline-none focus:ring-2 focus:ring-white/60"
                aria-label="Clear chat"
              >
                Clear
              </button>
              <button
                onClick={() => setOpen(false)}
                className="rounded-full p-1 hover:bg-white/10 focus:outline-none focus:ring-2 focus:ring-white/60"
                aria-label="Close chat"
              >
                <X className="h-4 w-4" />
              </button>
            </div>
          </div>
          <div className="flex-1 overflow-hidden">
            <MessageList messages={messages} loading={loading} error={error} />
          </div>
          <div className="relative border-t border-slate-200 bg-white px-2 pb-2 pt-1 dark:border-slate-800 dark:bg-slate-900">
            <div
              className="mb-2 flex cursor-pointer items-center gap-2 rounded-lg border border-slate-200 px-2 py-1 text-xs text-slate-700 hover:border-purple-400 dark:border-slate-700 dark:text-slate-100 dark:hover:border-purple-400"
              onClick={() => setShowSuggestions((v) => !v)}
            >
              <span>Suggestions</span>
              <span className="ml-auto rounded-full bg-slate-100 px-2 py-0.5 text-[11px] text-slate-700 shadow-sm dark:bg-slate-800 dark:text-slate-100">
                {showSuggestions ? "⋁" : "⋀"}
              </span>
            </div>
            {showSuggestions && (
              <div className="mb-2 rounded-lg border border-slate-200 bg-white p-2 shadow-sm dark:border-slate-700 dark:bg-slate-900">
                <ChatSuggestions
                  items={suggestions}
                  onSelect={(s) => {
                    setInput("");
                    sendMessage({ message: s });
                    setShowSuggestions(false);
                  }}
                  disabled={loading}
                  dense
                />
              </div>
            )}
            <ChatInput
              value={input}
              onChange={setInput}
              onSend={handleSend}
              loading={loading}
            />
          </div>
        </div>
      )}
    </>
  );
}
