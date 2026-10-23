import { SectionLabel, StatRow, VerdictPanel, Chip } from "../Atoms";
import AnimatedNumber from "../AnimatedNumber";
import Disclosure from "../Disclosure";
import type { FunnelResult } from "../../lib/buyer/funnel";
import { BarChart, Bar, XAxis, YAxis, Tooltip, ResponsiveContainer, CartesianGrid, Cell } from "recharts";

const STATUS_COLOR: Record<string, string> = {
  pending: "var(--color-series-4)",
  processing: "var(--color-series-2)",
  shipped: "var(--color-series-3)",
  delivered: "var(--color-good)",
};

const money = (v: number) => `$${v.toLocaleString(undefined, { maximumFractionDigits: 0 })}`;
const num = (v: number) => v.toLocaleString(undefined, { maximumFractionDigits: 0 });
const cap = (s: string) => s.charAt(0).toUpperCase() + s.slice(1);

export default function OrdersTab({ result }: { result: FunnelResult | null }) {
  if (!result) {
    return <div className="glass rounded-2xl px-6 py-12 text-center text-ink-muted">No order data loaded.</div>;
  }

  const { totalOrders, totalRevenue, avgOrderValue, byStatus, byPayment, topCountries } = result;
  const delivered = byStatus.find((s) => s.status === "delivered")?.count ?? 0;
  const pending = byStatus.find((s) => s.status === "pending")?.count ?? 0;
  const deliveredPct = (delivered / totalOrders) * 100;
  const spread = Math.max(...byStatus.map((s) => s.count)) - Math.min(...byStatus.map((s) => s.count));
  const isEven = spread < totalOrders * 0.08;

  return (
    <div>
      <div className="mb-1 font-mono text-[0.7rem] tracking-wider uppercase text-accent">Buyer side · Orders</div>
      <h1 className="font-display italic text-[2.5rem] leading-[1.02] tracking-[-0.02em] mb-3">Order funnel</h1>
      <p className="text-[0.9rem] text-ink-muted max-w-xl mb-6">
        Where every order currently sits, how it was paid for, and which markets it's coming from.
      </p>

      <VerdictPanel
        tone="info"
        headline={isEven ? "Orders are spread evenly across the funnel." : `${cap([...byStatus].sort((a, b) => b.count - a.count)[0].status)} is the largest bucket.`}
      >
        <AnimatedNumber value={totalOrders} format={num} /> orders worth <AnimatedNumber value={totalRevenue} format={money} />{" "}
        total, averaging <AnimatedNumber value={avgOrderValue} format={money} /> each.{" "}
        <AnimatedNumber value={deliveredPct} format={(v) => v.toFixed(0)} />% ({num(delivered)}) have been
        delivered, while {num(pending)} are still pending — roughly even across all four stages, which for this
        sample dataset means no single stage is obviously a bottleneck.
      </VerdictPanel>

      <SectionLabel>By status</SectionLabel>
      <div className="h-64">
        <ResponsiveContainer width="100%" height="100%">
          <BarChart data={byStatus}>
            <CartesianGrid stroke="var(--color-border)" vertical={false} />
            <XAxis dataKey="status" tickFormatter={cap} stroke="var(--color-ink-faint)" fontSize={11} tickLine={false} />
            <YAxis stroke="var(--color-ink-faint)" fontSize={11} tickLine={false} />
            <Tooltip
              contentStyle={{ background: "var(--color-surface-raised)", border: "1px solid var(--color-border-strong)", borderRadius: 8, fontSize: 12 }}
            />
            <Bar dataKey="count" name="Orders" radius={[4, 4, 0, 0]}>
              {byStatus.map((s, i) => <Cell key={i} fill={STATUS_COLOR[s.status] ?? "var(--color-accent)"} />)}
            </Bar>
          </BarChart>
        </ResponsiveContainer>
      </div>

      <div className="grid sm:grid-cols-2 gap-8 mt-8">
        <div>
          <SectionLabel>By payment method</SectionLabel>
          <div className="space-y-2">
            {byPayment.map((p) => (
              <div key={p.status} className="flex items-center gap-2.5 text-[0.82rem]">
                <span className="text-ink-soft flex-1">{cap(p.status)}</span>
                <span className="tabular text-ink-muted">{num(p.count)}</span>
                <span className="tabular text-ink-faint w-20 text-right">{money(p.revenue)}</span>
              </div>
            ))}
          </div>
        </div>
        <div>
          <SectionLabel>Top ship-to countries</SectionLabel>
          <div className="space-y-2">
            {topCountries.map((c) => (
              <div key={c.country} className="flex items-center gap-2.5 text-[0.82rem]">
                <span className="text-ink-soft flex-1 truncate">{c.country}</span>
                <span className="tabular text-ink-muted">{num(c.count)}</span>
                <span className="tabular text-ink-faint w-20 text-right">{money(c.revenue)}</span>
              </div>
            ))}
          </div>
        </div>
      </div>

      <StatRow
        items={[
          { label: "Total orders", numeric: totalOrders, format: num },
          { label: "Total revenue", numeric: totalRevenue, format: money, tone: "accent" },
          { label: "Avg order value", numeric: avgOrderValue, format: money },
        ]}
      />

      <SectionLabel>The method</SectionLabel>
      <Disclosure label="How did we determine this?">
        <p className="text-[0.86rem] text-ink-soft leading-relaxed max-w-2xl mb-4">
          Every order is bucketed by its status, payment method, and ship-to country, straight off the columns in
          order.csv — no joins, no derived assumptions.
        </p>
        <Chip
          tone="neutral"
          label="ShippedDate is intentionally never used — spot-checking it found orders 'shipped' years before they were placed, so it isn't reliable for any fulfillment-time metric"
        />
      </Disclosure>
    </div>
  );
}
