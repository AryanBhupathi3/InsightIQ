import type { BuyerDataset } from "./types";

/** Order status, payment method, and geography breakdowns. All three come
 *  straight off columns order.csv actually has — no join, no derived
 *  assumption. ShippedDate is deliberately never used anywhere in this
 *  file: spot-checking it against OrderDate turned up orders "shipped"
 *  years before they were placed, so it's unreliable for any
 *  fulfillment-time metric and nothing here depends on it. */

export interface StatusBucket {
  status: string;
  count: number;
  revenue: number;
}

export interface CountryBucket {
  country: string;
  count: number;
  revenue: number;
}

export interface FunnelResult {
  totalOrders: number;
  totalRevenue: number;
  avgOrderValue: number;
  stdOrderValue: number;
  byStatus: StatusBucket[];
  byPayment: StatusBucket[];
  topCountries: CountryBucket[];
  chebyshev: ChebyshevCheck[];
}

/** Chebyshev's inequality: for ANY distribution (no normality assumption,
 *  unlike most other bounds), at least 1 - 1/k^2 of values lie within k
 *  standard deviations of the mean. It's deliberately a loose, worst-case
 *  guarantee rather than an estimate — checked here against what this
 *  dataset's order values actually do, which is usually far inside the
 *  bound, and that gap is the point: the guarantee holds for any shape
 *  the distribution could have taken, not just this one. */
export interface ChebyshevCheck {
  k: number;
  guaranteedPct: number; // 100 * (1 - 1/k^2)
  actualPct: number;
  lowerBound: number;
  upperBound: number;
}

const CHEBYSHEV_K = [1.5, 2, 3];


const STATUS_ORDER = ["pending", "processing", "shipped", "delivered"];

function groupBy<T>(items: T[], keyFn: (item: T) => string, amountFn: (item: T) => number): StatusBucket[] {
  const map = new Map<string, StatusBucket>();
  for (const item of items) {
    const key = keyFn(item);
    const bucket = map.get(key) ?? { status: key, count: 0, revenue: 0 };
    bucket.count += 1;
    bucket.revenue += amountFn(item);
    map.set(key, bucket);
  }
  return Array.from(map.values());
}

export function computeFunnel({ orders }: BuyerDataset): FunnelResult | null {
  if (orders.length === 0) return null;

  const totalRevenue = orders.reduce((a, o) => a + o.totalAmount, 0);

  const byStatus = groupBy(orders, (o) => o.status, (o) => o.totalAmount).sort(
    (a, b) => STATUS_ORDER.indexOf(a.status) - STATUS_ORDER.indexOf(b.status)
  );
  const byPayment = groupBy(orders, (o) => o.paymentMethod, (o) => o.totalAmount).sort((a, b) => b.count - a.count);

  const countryMap = groupBy(orders, (o) => o.shipCountry, (o) => o.totalAmount);
  const topCountries: CountryBucket[] = countryMap
    .map((b) => ({ country: b.status, count: b.count, revenue: b.revenue }))
    .sort((a, b) => b.revenue - a.revenue)
    .slice(0, 8);

  const avgOrderValue = totalRevenue / orders.length;
  const variance = orders.reduce((a, o) => a + (o.totalAmount - avgOrderValue) ** 2, 0) / orders.length;
  const stdOrderValue = Math.sqrt(variance);

  const chebyshev: ChebyshevCheck[] = CHEBYSHEV_K.map((k) => {
    const lowerBound = avgOrderValue - k * stdOrderValue;
    const upperBound = avgOrderValue + k * stdOrderValue;
    const within = orders.filter((o) => o.totalAmount >= lowerBound && o.totalAmount <= upperBound).length;
    return {
      k,
      guaranteedPct: 100 * (1 - 1 / (k * k)),
      actualPct: (within / orders.length) * 100,
      lowerBound,
      upperBound,
    };
  });

  return {
    totalOrders: orders.length,
    totalRevenue,
    avgOrderValue,
    stdOrderValue,
    byStatus,
    byPayment,
    topCountries,
    chebyshev,
  };
}
