import { round2 } from "../analytics/utils";

export function deriveCategoryFromProductName(name: string) {
  const lower = name.toLowerCase();
  if (lower.includes("gummi")) return "Gummies";
  if (lower.includes("chocolate")) return "Chocolates";
  if (lower.includes("dose")) return "Dose";
  if (lower.includes("hydration")) return "Hydration";
  if (lower.includes("bundle")) return "Bundle";
  if (lower.includes("journal")) return "Journal";
  if (lower.includes("coaching")) return "Coaching";
  if (lower.includes("tea")) return "Tea";
  if (lower.includes("pack")) return "Pack";
  if (lower.includes("kit")) return "Kit";
  return null;
}

export function extractCategories(products: string[]) {
  const set = new Set<string>();
  for (const product of products) {
    const category = deriveCategoryFromProductName(product);
    if (category) set.add(category);
  }
  return Array.from(set.values());
}

export function pickTopCategory(categories: string[]) {
  if (!categories.length) return null;
  const counts = new Map<string, number>();
  categories.forEach((cat) => counts.set(cat, (counts.get(cat) || 0) + 1));
  return Array.from(counts.entries()).sort((a, b) => b[1] - a[1])[0]?.[0] ?? null;
}

export function buildTopProductsFromGhl(products: string[]) {
  const productMap = new Map<
    string,
    { name: string; quantity: number; revenue: number | null; categories: string[] }
  >();
  products.forEach((raw) => {
    const name = raw?.trim();
    if (!name) return;
    const entry = productMap.get(name);
    const category = deriveCategoryFromProductName(name);
    if (entry) {
      entry.quantity += 1;
      if (category && !entry.categories.includes(category)) {
        entry.categories.push(category);
      }
    } else {
      productMap.set(name, {
        name,
        quantity: 1,
        revenue: null,
        categories: category ? [category] : [],
      });
    }
  });

  return Array.from(productMap.values())
    .sort((a, b) => b.quantity - a.quantity || a.name.localeCompare(b.name))
    .slice(0, 6)
    .map((product) => ({
      ...product,
      revenue: product.revenue != null ? round2(product.revenue) : null,
    }));
}

export function buildTopCategoriesFromGhl(products: string[]) {
  const categoryMap = new Map<string, { name: string; quantity: number; revenue: number | null }>();
  products.forEach((raw) => {
    const name = raw?.trim();
    if (!name) return;
    const category = deriveCategoryFromProductName(name);
    if (!category) return;
    const entry = categoryMap.get(category);
    if (entry) {
      entry.quantity += 1;
    } else {
      categoryMap.set(category, { name: category, quantity: 1, revenue: null });
    }
  });

  return Array.from(categoryMap.values())
    .sort((a, b) => b.quantity - a.quantity || a.name.localeCompare(b.name))
    .slice(0, 6)
    .map((category) => ({
      ...category,
      revenue: category.revenue != null ? round2(category.revenue) : null,
    }));
}
