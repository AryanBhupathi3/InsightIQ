import type { BuyerDataset } from "./types";

/** Restocking budget allocation — a genuine Linear Program, not the
 *  quadratic program the seller side already has. Given a fixed budget,
 *  decide which at-risk products to restock (up to their own reorder
 *  level) to bring the most units back into safe stock for the money:
 *
 *    maximize   sum_i shortfall_i * x_i
 *    subject to sum_i cost_i * x_i <= Budget,   0 <= x_i <= 1
 *
 *  This is the continuous (fractional) knapsack problem — a standard LP
 *  with a closed-form optimal solution: sort by value-per-dollar
 *  (shortfall_i / cost_i) descending and fund items greedily until the
 *  budget runs out, funding the breaking item fractionally. That greedy
 *  order is provably optimal for this LP (any swap of a lower-ratio item
 *  for an excluded higher-ratio one strictly improves the objective
 *  without using more budget), so no search or iteration is needed — the
 *  sort itself is the solve. */

export interface RestockItem {
  productId: string;
  name: string;
  category: string;
  unitsInStock: number;
  reorderLevel: number;
  shortfall: number; // units needed to reach reorderLevel
  cost: number; // $ to fully restock this item
  ratio: number; // shortfall / cost — value density, what the sort is on
  fundedFraction: number; // 0..1, this budget's allocation (the LP's x_i)
  unitsRestocked: number;
  dollarsSpent: number;
}

export interface RestockPlan {
  budget: number;
  items: RestockItem[]; // sorted by ratio desc — the order the budget is spent in
  totalCost: number; // cost to fully fund every at-risk item (budget needed for 100% coverage)
  dollarsSpent: number;
  unitsRestocked: number;
  totalShortfallUnits: number;
  fullyFundedCount: number;
  partiallyFundedCount: number;
  unfundedCount: number;
}

export function buildRestockItems({ products }: BuyerDataset): Omit<RestockItem, "fundedFraction" | "unitsRestocked" | "dollarsSpent">[] {
  return products
    .filter((p) => !p.discontinued && p.unitsInStock <= p.reorderLevel)
    .map((p) => {
      const shortfall = p.reorderLevel - p.unitsInStock;
      const cost = shortfall * p.unitPrice;
      return {
        productId: p.productId,
        name: p.name,
        category: p.category,
        unitsInStock: p.unitsInStock,
        reorderLevel: p.reorderLevel,
        shortfall,
        cost,
        ratio: cost > 0 ? shortfall / cost : 0,
      };
    })
    .sort((a, b) => b.ratio - a.ratio);
}

export function solveRestockLP(dataset: BuyerDataset, budget: number): RestockPlan | null {
  const base = buildRestockItems(dataset);
  if (base.length === 0) return null;

  const totalCost = base.reduce((a, p) => a + p.cost, 0);
  let remaining = Math.max(0, budget);

  const items: RestockItem[] = base.map((p) => {
    if (remaining <= 0 || p.cost === 0) {
      return { ...p, fundedFraction: 0, unitsRestocked: 0, dollarsSpent: 0 };
    }
    if (p.cost <= remaining) {
      remaining -= p.cost;
      return { ...p, fundedFraction: 1, unitsRestocked: p.shortfall, dollarsSpent: p.cost };
    }
    const fraction = remaining / p.cost;
    const spent = remaining;
    remaining = 0;
    return { ...p, fundedFraction: fraction, unitsRestocked: p.shortfall * fraction, dollarsSpent: spent };
  });

  return {
    budget,
    items,
    totalCost,
    dollarsSpent: items.reduce((a, i) => a + i.dollarsSpent, 0),
    unitsRestocked: items.reduce((a, i) => a + i.unitsRestocked, 0),
    totalShortfallUnits: items.reduce((a, i) => a + i.shortfall, 0),
    fullyFundedCount: items.filter((i) => i.fundedFraction >= 1).length,
    partiallyFundedCount: items.filter((i) => i.fundedFraction > 0 && i.fundedFraction < 1).length,
    unfundedCount: items.filter((i) => i.fundedFraction === 0).length,
  };
}
