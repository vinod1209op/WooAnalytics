"use client";

export function ChatInput({
  value,
  onChange,
  onSend,
  loading,
  toggleSuggestions,
}: {
  value: string;
  onChange: (v: string) => void;
  onSend: () => void;
  loading: boolean;
  toggleSuggestions?: () => void;
}) {
  return (
    <div className="border-t border-slate-200 p-2 dark:border-slate-800">
      <div className="flex items-center gap-2">
        {toggleSuggestions && (
          <button
            className="rounded-lg border border-slate-300 bg-white px-2 py-2 text-xs text-slate-700 shadow-sm hover:border-purple-400 dark:border-slate-700 dark:bg-slate-900 dark:text-slate-100 dark:hover:border-purple-400"
            type="button"
            onClick={toggleSuggestions}
            disabled={loading}
            aria-label="Toggle suggestions"
          >
            ⋀
          </button>
        )}
        <input
          className="flex-1 rounded-lg border border-slate-300 bg-white px-3 py-2 text-sm text-slate-900 shadow-sm focus:outline-none focus:ring-2 focus:ring-purple-500 dark:border-slate-700 dark:bg-slate-900 dark:text-slate-100"
          placeholder="Ask about revenue, orders, products..."
          value={value}
          onChange={(e) => onChange(e.target.value)}
          onKeyDown={(e) => {
            if (e.key === "Enter" && !e.shiftKey) {
              e.preventDefault();
              onSend();
              onChange("");
            }
          }}
          disabled={loading}
        />
        <button
          className="rounded-lg bg-purple-600 px-3 py-2 text-sm font-semibold text-white shadow-sm hover:bg-purple-700 disabled:cursor-not-allowed disabled:bg-purple-300"
          onClick={() => {
            onSend();
            onChange("");
          }}
          disabled={loading}
        >
          Send
        </button>
      </div>
    </div>
  );
}
