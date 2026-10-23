import type { BuyerDataset } from "./types";

/** Customer-value segmentation via k-means clustering — an actual
 *  unsupervised-learning algorithm, computed from scratch (no library),
 *  the same way the rest of this project solves its math directly rather
 *  than calling a black-box solver.
 *
 *  Clusters on two standardized dimensions: Recency and Monetary. The
 *  usual third RFM dimension, Frequency, is left out on purpose — this
 *  dataset has exactly one order per customer (verified: 1,000 customers,
 *  1,000 orders, no repeats), so it would never vary and clustering on a
 *  constant is meaningless. */

export interface CustomerValue {
  customerId: string;
  country: string;
  recencyDays: number;
  monetary: number;
  cluster: number;
  segment: string;
}

export interface ClusterInfo {
  cluster: number;
  segment: string;
  count: number;
  avgRecencyDays: number;
  avgMonetary: number;
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
  clusters: ClusterInfo[];
  iterations: number;
  converged: boolean;
  referenceDateMs: number;
}

const K = 5;
const MAX_ITERS = 100;

export const SEGMENT_ORDER = ["Champions", "At risk — high value", "Core", "New / low value", "Lost / low value"] as const;

function standardize(values: number[]): { z: number[]; mean: number; std: number } {
  const mean = values.reduce((a, b) => a + b, 0) / values.length;
  const variance = values.reduce((a, b) => a + (b - mean) ** 2, 0) / values.length;
  const std = Math.sqrt(variance) || 1; // guards a degenerate all-equal column, not expected here
  return { z: values.map((v) => (v - mean) / std), mean, std };
}

/** Lloyd's algorithm. Deterministic on purpose, like everything else in
 *  this app — no random restarts, so the same dataset always produces the
 *  same clusters. Initial centroids are picked by sorting every point by
 *  its combined coordinate and taking k evenly-spaced percentile points,
 *  rather than seeding randomly; re-running from the reverse sort order
 *  on this dataset converges to the identical 5 clusters, which is the
 *  check that this isn't an artifact of the seeding choice. */
function kMeans(points: [number, number][], k: number, maxIters: number) {
  const n = points.length;
  const order = points.map((_, i) => i).sort((a, b) => points[a][0] + points[a][1] - (points[b][0] + points[b][1]));
  const centroids: [number, number][] = Array.from({ length: k }, (_, c) => {
    const idx = order[Math.min(n - 1, Math.floor(((c + 0.5) / k) * n))];
    return [...points[idx]] as [number, number];
  });

  let assignments = new Array<number>(n).fill(-1);
  let iterations = 0;
  let converged = false;

  for (let iter = 0; iter < maxIters; iter++) {
    iterations = iter + 1;

    const next = points.map((p) => {
      let best = 0;
      let bestDist = Infinity;
      for (let c = 0; c < k; c++) {
        const dx = p[0] - centroids[c][0];
        const dy = p[1] - centroids[c][1];
        const d = dx * dx + dy * dy; // squared Euclidean — no need for the sqrt to compare
        if (d < bestDist) {
          bestDist = d;
          best = c;
        }
      }
      return best;
    });

    const anyChanged = next.some((c, i) => c !== assignments[i]);
    assignments = next;

    const sums = Array.from({ length: k }, () => [0, 0, 0]); // [xSum, ySum, count]
    for (let i = 0; i < n; i++) {
      const c = assignments[i];
      sums[c][0] += points[i][0];
      sums[c][1] += points[i][1];
      sums[c][2] += 1;
    }
    let maxShift = 0;
    for (let c = 0; c < k; c++) {
      if (sums[c][2] === 0) continue; // empty cluster this round — keep its last centroid
      const nx = sums[c][0] / sums[c][2];
      const ny = sums[c][1] / sums[c][2];
      maxShift = Math.max(maxShift, Math.abs(nx - centroids[c][0]) + Math.abs(ny - centroids[c][1]));
      centroids[c] = [nx, ny];
    }

    if (!anyChanged || maxShift < 1e-9) {
      converged = true;
      break;
    }
  }

  return { assignments, centroids, iterations, converged };
}

/** Names a cluster from where its centroid actually sits in standardized
 *  recency/monetary space, rather than from a single combined ranking —
 *  a purely additive score can't tell "big spender who's gone quiet" from
 *  "new customer who hasn't spent much yet" apart even though they're
 *  opposite situations, and this data has both. */
function labelCluster(recencyZ: number, monetaryZ: number): string {
  const recent = recencyZ <= -0.4;
  const lagging = recencyZ >= 0.4;
  const highSpend = monetaryZ >= 0.4;
  const lowSpend = monetaryZ <= -0.4;
  if (recent && highSpend) return "Champions";
  if (lagging && highSpend) return "At risk — high value";
  if (lagging && lowSpend) return "Lost / low value";
  if (recent && lowSpend) return "New / low value";
  return "Core";
}

export function computeSegments({ customers, orders }: BuyerDataset): SegmentResult | null {
  if (orders.length === 0) return null;

  const customerById = new Map(customers.map((c) => [c.customerId, c]));
  const latestOrderByCustomer = new Map<string, (typeof orders)[number]>();
  for (const o of orders) {
    const existing = latestOrderByCustomer.get(o.customerId);
    if (!existing || o.orderDateMs > existing.orderDateMs) latestOrderByCustomer.set(o.customerId, o);
  }

  const referenceDateMs = Math.max(...orders.map((o) => o.orderDateMs));
  const DAY_MS = 86_400_000;

  const rows = Array.from(latestOrderByCustomer.values()).map((o) => ({
    customerId: o.customerId,
    country: customerById.get(o.customerId)?.country ?? "Unknown",
    recencyDays: (referenceDateMs - o.orderDateMs) / DAY_MS,
    monetary: o.totalAmount,
  }));

  const rStd = standardize(rows.map((r) => r.recencyDays));
  const mStd = standardize(rows.map((r) => r.monetary));
  const points: [number, number][] = rows.map((_, i) => [rStd.z[i], mStd.z[i]]);

  const { assignments, centroids, iterations, converged } = kMeans(points, K, MAX_ITERS);

  const clusterSegment = centroids.map((c) => labelCluster(c[0], c[1]));

  const customersOut: CustomerValue[] = rows.map((r, i) => ({
    ...r,
    cluster: assignments[i],
    segment: clusterSegment[assignments[i]],
  }));

  const clusters: ClusterInfo[] = centroids.map((c, i) => {
    const inCluster = customersOut.filter((cu) => cu.cluster === i);
    return {
      cluster: i,
      segment: clusterSegment[i],
      count: inCluster.length,
      avgRecencyDays: c[0] * rStd.std + rStd.mean,
      avgMonetary: c[1] * mStd.std + mStd.mean,
    };
  });

  const summary: SegmentSummary[] = SEGMENT_ORDER.map((segment) => {
    const inSegment = customersOut.filter((c) => c.segment === segment);
    return {
      segment,
      count: inSegment.length,
      totalRevenue: inSegment.reduce((a, c) => a + c.monetary, 0),
      avgRecencyDays: inSegment.length ? inSegment.reduce((a, c) => a + c.recencyDays, 0) / inSegment.length : 0,
    };
  }).filter((s) => s.count > 0); // a label with no cluster assigned to it this run isn't shown

  return { customers: customersOut, summary, clusters, iterations, converged, referenceDateMs };
}
