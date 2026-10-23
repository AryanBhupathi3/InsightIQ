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
  byStatus: StatusBucket[];
  byPayment: StatusBucket[];
  topCountries: CountryBucket[];
}

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

  return {
    totalOrders: orders.length,
    totalRevenue,
    avgOrderValue: totalRevenue / orders.length,
    byStatus,
    byPayment,
    topCountries,
  };
}
