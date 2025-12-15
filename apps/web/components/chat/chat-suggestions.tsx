"use client";

export function ChatSuggestions({
  items,
  onSelect,
  disabled,
  dense = false,
}: {
  items: string[];
  onSelect: (text: string) => void;
  disabled: boolean;
  dense?: boolean;
}) {
  return (
    <div>
      <div className={`flex flex-wrap ${dense ? "gap-1.5" : "gap-2"}`}>
        {items.map((s) => (
          <button
            key={s}
            className="rounded-lg border border-slate-200 px-3 py-1 text-xs text-slate-700 hover:border-purple-400 hover:bg-purple-50 dark:border-slate-700 dark:text-slate-100 dark:hover:border-purple-400 dark:hover:bg-purple-900/30"
            onClick={() => onSelect(s)}
            disabled={disabled}
          >
            {s}
          </button>
        ))}
      </div>
    </div>
  );
}
