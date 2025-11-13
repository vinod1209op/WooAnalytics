// hooks/usePopularProducts.ts
'use client';

import { useState } from 'react';
import type { Product } from '@/types/product';

const MOCK_PRODUCTS: Product[] = [
  { id: 1, name: 'FUN GUY Mushroom Gummies', sku: null, price: 75, total_sales: 919 },
  { id: 2, name: 'MCRDSE Gummies', sku: null, price: 35, total_sales: 774 },
  { id: 3, name: 'FUN GUY Chocolates', sku: null, price: 75, total_sales: 751 },
  { id: 4, name: 'Awaken Dark Chocolate', sku: null, price: 55.5, total_sales: 653 },
  { id: 5, name: 'Bliss Dose', sku: null, price: 90, total_sales: 549 },
];

export function usePopularProducts() {
  const [data] = useState<Product[]>(MOCK_PRODUCTS);

  return {
    products: data,
    loading: false,
  };
}
