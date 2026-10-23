import type { BuyerDataset } from "./types";

/** Customer-value segmentation — deliberately Recency x Monetary, not the
 *  full RFM. This dataset has exactly one order per customer (verified:
 *  1,000 customers, 1,000 orders, no repeats), so a Frequency dimension
 *  would never vary and scoring on it would be decoration, not signal.
 *  Dropping it instead of faking it. */

export interface CustomerValue {
  customerId: string;
  country: string;
  recencyDays: number;
  monetary: number;
  rScore: number; // 1 (long ago) .. 5 (most recent)
  mScore: number; // 1 (lowest spend) .. 5 (highest spend)
  segment: string;
}

export interface SegmentSummary {
  segment: string;
  count: number;
  totalRevenue: number;
  avgRecencyDays: number;
}

export interface SegmentResult {
  customers: CustomerValue[];
  summary: SegmentSummary[];
  referenceDateMs: number;
}

export const SEGMENT_ORDER = ["Champions", "Loyal / high value", "Core", "At risk", "Lost / low value"] as const;

/** Rank-based quintile scores (1-5), so each bucket has an equal share of
 *  customers regardless of how the raw values are distributed — the same
 *  quantile-threshold idea markov.ts uses to build its Low/Medium/High
 *  demand bands, applied here to customers instead of time periods. */
function quintileScores(values: number[], higherRawIsBetter: boolean): number[] {
  const n = values.length;
  const order = values.map((_, i) => i).sort((a, b) => values[a] - values[b]);
  const scores = new Array<number>(n);
  order.forEach((originalIndex, rank) => {
    const quintile = Math.min(4, Math.floor((rank / n) * 5)); // 0 (lowest raw value) .. 4 (highest)
    scores[originalIndex] = higherRawIsBetter ? quintile + 1 : 5 - quintile;
  });
  return scores;
}

function segmentFor(rScore: number, mScore: number): string {
  const total = rScore + mScore;
  if (total >= 9) return "Champions";
  if (total >= 7) return "Loyal / high value";
  if (total >= 5) return "Core";
  if (total >= 3) return "At risk";
  return "Lost / low value";
}

export function computeSegments({ customers, orders }: BuyerDataset): SegmentResult | null {
  if (orders.length === 0) return null;

  const customerById = new Map(customers.map((c) => [c.customerId, c]));
  // One order per customer in this dataset, so "most recent order" and
  // "this customer's one order" are the same thing — but written as a
  // reduce rather than assumed, so it stays correct if that ever changes.
  const latestOrderByCustomer = new Map<string, (typeof orders)[number]>();
  for (const o of orders) {
    const existing = latestOrderByCustomer.get(o.customerId);
    if (!existing || o.orderDateMs > existing.orderDateMs) latestOrderByCustomer.set(o.customerId, o);
  }

  // "Today" is the most recent order date in the data, not the real
  // wall-clock date — this is historical/synthetic data spanning
  // 2010-2022, so recency is relative to the dataset, not to now.
  const referenceDateMs = Math.max(...orders.map((o) => o.orderDateMs));
  const DAY_MS = 86_400_000;

  const rows = Array.from(latestOrderByCustomer.values()).map((o) => ({
    customerId: o.customerId,
    country: customerById.get(o.customerId)?.country ?? "Unknown",
    recencyDays: (referenceDateMs - o.orderDateMs) / DAY_MS,
    monetary: o.totalAmount,
  }));

  const rScores = quintileScores(rows.map((r) => r.recencyDays), false);
  const mScores = quintileScores(rows.map((r) => r.monetary), true);

  const customersOut: CustomerValue[] = rows.map((r, i) => ({
    ...r,
    rScore: rScores[i],
    mScore: mScores[i],
    segment: segmentFor(rScores[i], mScores[i]),
  }));

  const summary: SegmentSummary[] = SEGMENT_ORDER.map((segment) => {
    const inSegment = customersOut.filter((c) => c.segment === segment);
    return {
      segment,
      count: inSegment.length,
      totalRevenue: inSegment.reduce((a, c) => a + c.monetary, 0),
      avgRecencyDays: inSegment.length ? inSegment.reduce((a, c) => a + c.recencyDays, 0) / inSegment.length : 0,
    };
  });

  return { customers: customersOut, summary, referenceDateMs };
}
