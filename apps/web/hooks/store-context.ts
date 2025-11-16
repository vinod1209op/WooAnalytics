'use client';

import { createContext, useContext, useEffect, useState } from "react";

interface Store {
  id: string;
  name: string;
}

interface StoreContextValue {
  store: Store | null;
  loading: boolean;
  error: string | null;
}

const StoreContext = createContext<StoreContextValue>({
  store: null,
  loading: true,
  error: null
});

export function StoreProvider({ children }: { children: React.ReactNode }) {
  const [store, setStore] = useState<Store | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    (async () => {
      try {
        const res = await fetch(`${process.env.NEXT_PUBLIC_API_BASE_URL}/stores/default`);
        if (!res.ok) throw new Error("Failed to load store");

        const data = await res.json();
        setStore(data);
      } catch (err: any) {
        setError(err.message || "Error");
      } finally {
        setLoading(false);
      }
    })();
  }, []);

  return (
    <StoreContext.Provider value={{ store, loading, error }}>
      {children}
    </StoreContext.Provider>
  );
}

export function useStore() {
  return useContext(StoreContext);
}