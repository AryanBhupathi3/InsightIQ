import type { BuyerDataset } from "./types";

/** Product catalog health. Deliberately does NOT attempt "top-selling
 *  products" — order.csv has no ProductID or line-item table, so orders
 *  and products don't actually join to anything. Anything claiming to
 *  rank products by sales would be inventing a relationship the data
 *  doesn't have. What product.csv genuinely supports on its own:
 *  category mix, catalog value, and reorder risk. */

export interface CategoryBucket {
  category: string;
  count: number;
  avgPrice: number;
  inventoryValue: number;
}

export interface CatalogResult {
  totalProducts: number;
  totalInventoryValue: number;
  discontinuedCount: number;
  byCategory: CategoryBucket[];
  reorderRiskCount: number;
  reorderRiskSample: { productId: string; name: string; category: string; unitsInStock: number; reorderLevel: number }[];
}

export function computeCatalog({ products }: BuyerDataset): CatalogResult | null {
  if (products.length === 0) return null;

  const byCategoryMap = new Map<string, { count: number; priceSum: number; inventoryValue: number }>();
  for (const p of products) {
    const bucket = byCategoryMap.get(p.category) ?? { count: 0, priceSum: 0, inventoryValue: 0 };
    bucket.count += 1;
    bucket.priceSum += p.unitPrice;
    bucket.inventoryValue += p.unitPrice * p.unitsInStock;
    byCategoryMap.set(p.category, bucket);
  }
  const byCategory: CategoryBucket[] = Array.from(byCategoryMap.entries())
    .map(([category, b]) => ({ category, count: b.count, avgPrice: b.priceSum / b.count, inventoryValue: b.inventoryValue }))
    .sort((a, b) => b.inventoryValue - a.inventoryValue);

  const atRisk = products.filter((p) => !p.discontinued && p.unitsInStock <= p.reorderLevel);

  return {
    totalProducts: products.length,
    totalInventoryValue: products.reduce((a, p) => a + p.unitPrice * p.unitsInStock, 0),
    discontinuedCount: products.filter((p) => p.discontinued).length,
    byCategory,
    reorderRiskCount: atRisk.length,
    reorderRiskSample: atRisk
      .sort((a, b) => a.unitsInStock - a.reorderLevel - (b.unitsInStock - b.reorderLevel))
      .slice(0, 5)
      .map((p) => ({ productId: p.productId, name: p.name, category: p.category, unitsInStock: p.unitsInStock, reorderLevel: p.reorderLevel })),
  };
}
