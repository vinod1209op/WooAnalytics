"use client";

type Message = { role: "user" | "assistant"; content: string };

export function MessageList({
  messages,
  loading,
  error,
  onCopy,
}: {
  messages: Message[];
  loading: boolean;
  error: string | null;
  onCopy?: (text: string) => void;
}) {
  return (
    <div className="h-full space-y-2 overflow-y-auto p-3 text-[13px]">
      {messages.length === 0 && (
        <div className="text-[13px] text-slate-500 dark:text-slate-300">
          Ask a question to get started. Try a suggestion.
        </div>
      )}
      {messages.map((msg, idx) => (
        <div key={idx} className={`group relative max-w-[85%] ${msg.role === "user" ? "ml-auto" : "mr-auto"}`}>
          {renderMessage(msg)}
          {msg.role === "assistant" && onCopy && (
            <button
              className="absolute -right-6 top-1 hidden rounded-md bg-slate-200 px-2 py-[2px] text-[11px] text-slate-700 shadow-sm group-hover:block dark:bg-slate-700 dark:text-slate-100"
              onClick={() => onCopy(msg.content)}
            >
              Copy
            </button>
          )}
        </div>
      ))}
      {loading && (
        <div className="text-[11px] text-slate-500 dark:text-slate-300">Assistant is thinking…</div>
      )}
      {error && <div className="text-[11px] text-red-500">{error}</div>}
    </div>
  );
}

function renderMessage(msg: Message) {
  if (msg.role === "assistant") {
    const match = msg.content.match(/Download CSV:\s*(https?:\/\/\S+)/i);
    if (match) {
      const link = match[1];
      const mainText = msg.content.replace(match[0], "").trim();
      return (
        <div
          className="whitespace-pre-line rounded-xl bg-slate-100 px-3 py-2 text-slate-900 dark:bg-slate-800 dark:text-slate-100"
        >
          <div>{mainText}</div>
          <a
            href={link}
            target="_blank"
            rel="noreferrer"
            className="mt-2 inline-flex items-center justify-center rounded-md bg-purple-600 px-3 py-1 text-xs font-semibold text-white shadow-sm hover:bg-purple-700 focus:outline-none focus:ring-2 focus:ring-purple-400"
          >
            Download CSV
          </a>
        </div>
      );
    }
  }
  return (
    <div
      className={`whitespace-pre-line rounded-xl px-3 py-2 ${
        msg.role === "user"
          ? "bg-purple-600 text-white dark:bg-purple-500"
          : "bg-slate-100 text-slate-900 dark:bg-slate-800 dark:text-slate-100"
      }`}
    >
      {msg.content}
    </div>
  );
}
