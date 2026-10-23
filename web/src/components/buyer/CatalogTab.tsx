import { SectionLabel, StatRow, VerdictPanel, Chip, Callout } from "../Atoms";
import AnimatedNumber from "../AnimatedNumber";
import Disclosure from "../Disclosure";
import type { CatalogResult } from "../../lib/buyer/catalog";
import { BarChart, Bar, XAxis, YAxis, Tooltip, ResponsiveContainer, CartesianGrid, Cell } from "recharts";

const SERIES = ["var(--color-series-1)", "var(--color-series-2)", "var(--color-series-3)"];

const money = (v: number) => `$${v.toLocaleString(undefined, { maximumFractionDigits: 0 })}`;
const num = (v: number) => v.toLocaleString(undefined, { maximumFractionDigits: 0 });

export default function CatalogTab({ result }: { result: CatalogResult | null }) {
  if (!result) {
    return <div className="glass rounded-2xl px-6 py-12 text-center text-ink-muted">No product catalog loaded.</div>;
  }

  const { totalProducts, totalInventoryValue, discontinuedCount, byCategory, reorderRiskCount, reorderRiskSample } = result;
  const topCategory = byCategory[0];

  return (
    <div>
      <div className="mb-1 font-mono text-[0.7rem] tracking-wider uppercase text-accent">Buyer side · Catalog</div>
      <h1 className="font-display italic text-[2.5rem] leading-[1.02] tracking-[-0.02em] mb-3">Product catalog</h1>
      <p className="text-[0.9rem] text-ink-muted max-w-xl mb-6">
        What's in the catalog, where its value sits, and which products are running low.
      </p>

      <VerdictPanel tone={reorderRiskCount > 0 ? "warning" : "good"} headline={`${num(reorderRiskCount)} active products are at or below their reorder point.`}>
        The catalog holds <AnimatedNumber value={totalProducts} format={num} /> products worth{" "}
        <AnimatedNumber value={totalInventoryValue} format={money} /> at current stock, led by{" "}
        {topCategory?.category} at <AnimatedNumber value={topCategory?.inventoryValue ?? 0} format={money} />.{" "}
        <AnimatedNumber value={reorderRiskCount} format={num} /> still-active products have fallen to or below
        their reorder level and need restocking attention.
      </VerdictPanel>

      <SectionLabel>By category</SectionLabel>
      <div className="grid lg:grid-cols-[1.4fr_1fr] gap-8 items-center">
        <div className="h-64">
          <ResponsiveContainer width="100%" height="100%">
            <BarChart data={byCategory}>
              <CartesianGrid stroke="var(--color-border)" vertical={false} />
              <XAxis dataKey="category" stroke="var(--color-ink-faint)" fontSize={11} tickLine={false} />
              <YAxis stroke="var(--color-ink-faint)" fontSize={11} tickLine={false} tickFormatter={(v) => `$${(v / 1e6).toFixed(0)}M`} />
              <Tooltip
                contentStyle={{ background: "var(--color-surface-raised)", border: "1px solid var(--color-border-strong)", borderRadius: 8, fontSize: 12 }}
              />
              <Bar dataKey="inventoryValue" name="Inventory value" radius={[4, 4, 0, 0]}>
                {byCategory.map((_, i) => <Cell key={i} fill={SERIES[i % SERIES.length]} />)}
              </Bar>
            </BarChart>
          </ResponsiveContainer>
        </div>
        <div className="space-y-2">
          {byCategory.map((c, i) => (
            <div key={c.category} className="flex items-center gap-2.5 text-[0.82rem]">
              <span className="w-2 h-2 rounded-full flex-shrink-0" style={{ background: SERIES[i % SERIES.length] }} />
              <span className="text-ink-soft flex-1">{c.category}</span>
              <span className="tabular text-ink-muted">{num(c.count)} items</span>
              <span className="tabular text-ink-faint w-16 text-right">{money(c.avgPrice)} avg</span>
            </div>
          ))}
        </div>
      </div>

      <StatRow
        items={[
          { label: "Total products", numeric: totalProducts, format: num },
          { label: "Total inventory value", numeric: totalInventoryValue, format: money, tone: "accent" },
          { label: "Discontinued", numeric: discontinuedCount, format: num, sub: `${((discontinuedCount / totalProducts) * 100).toFixed(0)}% of catalog` },
          { label: "Reorder risk", numeric: reorderRiskCount, format: num, sub: "active products" },
        ]}
      />

      {reorderRiskSample.length > 0 && (
        <div className="mt-6">
          <SectionLabel>Lowest stock vs. reorder point</SectionLabel>
          <div className="space-y-2">
            {reorderRiskSample.map((p) => (
              <div key={p.productId} className="flex items-center gap-2.5 text-[0.82rem]">
                <span className="text-ink-soft flex-1 truncate">{p.name}</span>
                <span className="text-ink-faint">{p.category}</span>
                <Chip tone="warning" label={`${num(p.unitsInStock)} in stock / reorder at ${num(p.reorderLevel)}`} />
              </div>
            ))}
          </div>
        </div>
      )}

      <SectionLabel>The method</SectionLabel>
      <Disclosure label="How did we determine this?">
        <p className="text-[0.86rem] text-ink-soft leading-relaxed max-w-2xl mb-4">
          Category and inventory-value figures come straight from product.csv. Reorder risk flags any
          non-discontinued product whose current stock has fallen to or below its own reorder level.
        </p>
        <Callout>
          This deliberately does not show "best-selling products." order.csv has no product reference at all — no
          ProductID, no line items — so orders and the catalog don't actually join to anything. Ranking products by
          sales would mean inventing a relationship the data doesn't have, which isn't something this dashboard
          does.
        </Callout>
      </Disclosure>
    </div>
  );
}
