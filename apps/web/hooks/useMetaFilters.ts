'use client';

import { useEffect, useState } from 'react';

export function useMetaFilters() {
  const [categories, setCategories] = useState<string[]>([]);
  const [coupons, setCoupons] = useState<string[]>([]);
  const [loadingMeta, setLoadingMeta] = useState(true);

  useEffect(() => {
    let cancelled = false;
    
    // For now: mock data + small fake delay so the UI can show a loading state.
    // Later we’ll replace this with a real API call.
    const timeout = setTimeout(() => {
        if (cancelled) return;

       setCategories([ 
        'All products',
        'Mushrooms',
        'Chocolate',
        'Gummies',
        'Bundles',
      ]);

      setCoupons([
        'WELCOME10',
        'BLACKFRIDAY',
        'FREESHIP',
        'VIP20',
      ]);

      setLoadingMeta(false);
    }, 300);

    return () => {
        cancelled = true;
        clearTimeout(timeout);
    }
  }, []);

  return { categories, coupons, loadingMeta };
}