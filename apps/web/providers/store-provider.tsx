'use client';

import { createContext, useContext, useEffect, useState } from 'react';

type Store = {
  id: string;
  name?: string;
};

interface StoreContextValue {
  store: Store| null;
  loading: boolean;
  error: string | null;
}

const StoreContext = createContext<StoreContextValue>({
  store: null,
  loading: true,
  error: null,
});

export function StoreProvider({ children }: { children: React.ReactNode }) {
  const [store, setStore] = useState<Store | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    let cancelled = false;

    async function load() {
      setLoading(true);
      setError(null);

      try {
        const res = await fetch(
          `${process.env.NEXT_PUBLIC_API_BASE}/stores/default`,
          { cache: 'no-store' }
        );

        if (!res.ok) throw new Error('Failed to load store');

        const data = await res.json();
        if (!cancelled) setStore(data);
      } catch (err) {
        if (!cancelled) {
          const message = err instanceof Error ? err.message : 'Error';
          setError(message);
        }
      } finally {
        if (!cancelled) setLoading(false);
      }
    }

    load();
    return () => {
      cancelled = true;
    };
  }, []);

  return (
    <StoreContext.Provider value={{ store, loading, error }}>
      {children}
    </StoreContext.Provider>
  );
}

export function useStore() {
  const ctx =  useContext(StoreContext);
  if (!ctx) throw new Error('useStore must be used within StoreProvider')
  return ctx;
}
