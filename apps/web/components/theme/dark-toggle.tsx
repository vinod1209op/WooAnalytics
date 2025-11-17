'use client';

import { useTheme } from 'next-themes';
import { useHasMounted } from '@/hooks/useHasMounted';

export default function DarkToggle() {
  const { theme, systemTheme, setTheme } = useTheme();
  const resolvedTheme = theme ==='system' ?  systemTheme: theme;
  const hasMounted = useHasMounted();
  
  
  if (typeof window === 'undefined' || !resolvedTheme) {
    return null;
  }

  const isDark = resolvedTheme === 'dark';

  if (!hasMounted) return null;

  return (
    <button
      type="button"
      onClick={() => setTheme(isDark ? 'light' : 'dark')}
      className="inline-flex items-center gap-2 rounded-full border border-slate-200 bg-white px-3 py-1 text-sm text-slate-700 shadow-sm hover:bg-slate-50 dark:border-slate-700 dark:bg-slate-900 dark:text-slate-100"
    >
      {isDark ? (
       <> 🌙 <span>Dark</span> </>
      ):(
       <> ☀️ <span>Light</span></> 
      )}
    </button>
  );
}