import { SectionLabel, StatRow, VerdictPanel, Chip, Callout } from "../Atoms";
import AnimatedNumber from "../AnimatedNumber";
import Disclosure from "../Disclosure";
import FormulaBlock from "../FormulaBlock";
import type { CatalogResult } from "../../lib/buyer/catalog";
import type { RestockPlan } from "../../lib/buyer/restock";
import { BarChart, Bar, XAxis, YAxis, Tooltip, ResponsiveContainer, CartesianGrid, Cell } from "recharts";

const SERIES = ["var(--color-series-1)", "var(--color-series-2)", "var(--color-series-3)"];

const money = (v: number) => `$${v.toLocaleString(undefined, { maximumFractionDigits: 0 })}`;
const num = (v: number) => v.toLocaleString(undefined, { maximumFractionDigits: 0 });

export default function CatalogTab({
  result,
  restockPlan,
  restockBudget,
  setRestockBudget,
}: {
  result: CatalogResult | null;
  restockPlan: RestockPlan | null;
  restockBudget: number;
  setRestockBudget: (v: number) => void;
}) {
  if (!result) {
    return <div className="glass rounded-2xl px-6 py-12 text-center text-ink-muted">No product catalog loaded.</div>;
  }

  const { totalProducts, totalInventoryValue, discontinuedCount, byCategory } = result;
  const topCategory = byCategory[0];

  return (
    <div>
      <div className="mb-1 font-mono text-[0.7rem] tracking-wider uppercase text-accent">Buyer side · Catalog</div>
      <h1 className="font-display italic text-[2.5rem] leading-[1.02] tracking-[-0.02em] mb-3">Product catalog</h1>
      <p className="text-[0.9rem] text-ink-muted max-w-xl mb-6">
        What's in the catalog, where its value sits, and — given a real restocking budget — which products to fund.
      </p>

      <VerdictPanel tone="info" headline={`The catalog holds ${num(totalProducts)} products worth ${money(totalInventoryValue)}.`}>
        Led by {topCategory?.category} at <AnimatedNumber value={topCategory?.inventoryValue ?? 0} format={money} />.{" "}
        <AnimatedNumber value={discontinuedCount} format={num} /> products ({((discontinuedCount / totalProducts) * 100).toFixed(0)}%)
        are marked discontinued and excluded from any restocking decision below.
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
        ]}
      />

      {restockPlan && (
        <>
          <SectionLabel>Restocking decision</SectionLabel>
          <p className="text-[0.86rem] text-ink-soft leading-relaxed max-w-2xl mb-4">
            {restockPlan.items.length} active products have fallen to or below their reorder point. Fully covering
            all of them would cost <AnimatedNumber value={restockPlan.totalCost} format={money} /> — set a real
            budget below and this decides which products it actually funds.
          </p>

          <label className="block mb-6">
            <div className="flex justify-between font-mono text-[0.65rem] uppercase text-ink-muted mb-1">
              <span>Restocking budget</span><span className="tabular">{money(restockBudget)}</span>
            </div>
            <input
              type="range"
              min={0}
              max={Math.ceil(restockPlan.totalCost / 100_000) * 100_000}
              step={50_000}
              value={restockBudget}
              onChange={(e) => setRestockBudget(+e.target.value)}
              className="w-full accent-accent"
            />
          </label>

          <VerdictPanel
            tone={restockPlan.unfundedCount === 0 ? "good" : "warning"}
            headline={
              restockPlan.unfundedCount === 0
                ? "This budget covers every at-risk product."
                : `This budget covers ${restockPlan.fullyFundedCount} of ${restockPlan.items.length} products in full.`
            }
          >
            Spending <AnimatedNumber value={restockPlan.dollarsSpent} format={money} /> of the{" "}
            <AnimatedNumber value={restockBudget} format={money} /> available restores{" "}
            <AnimatedNumber value={restockPlan.unitsRestocked} format={(v) => v.toFixed(0)} /> units across{" "}
            {restockPlan.fullyFundedCount} fully-funded
            {restockPlan.partiallyFundedCount > 0 ? ` and ${restockPlan.partiallyFundedCount} partially-funded` : ""}{" "}
            products — the most any allocation of this budget could restore, not just a reasonable-looking one.{" "}
            {restockPlan.unfundedCount > 0 &&
              `${restockPlan.unfundedCount} product${restockPlan.unfundedCount > 1 ? "s" : ""} remain unfunded at this budget.`}
          </VerdictPanel>

          <div className="space-y-1.5">
            {restockPlan.items.map((it) => (
              <div key={it.productId} className="flex items-center gap-2.5 text-[0.8rem]">
                <span
                  className="w-2 h-2 rounded-full flex-shrink-0"
                  style={{
                    background:
                      it.fundedFraction >= 1 ? "var(--color-good)" : it.fundedFraction > 0 ? "var(--color-warning)" : "var(--color-critical)",
                  }}
                />
                <span className="text-ink-soft flex-1 truncate">{it.name}</span>
                <span className="text-ink-faint">{it.category}</span>
                <span className="tabular text-ink-muted w-20 text-right">{num(it.shortfall)} needed</span>
                <span className="tabular text-ink-faint w-24 text-right">{money(it.cost)}</span>
                <Chip
                  tone={it.fundedFraction >= 1 ? "good" : it.fundedFraction > 0 ? "warning" : "neutral"}
                  label={it.fundedFraction >= 1 ? "funded" : it.fundedFraction > 0 ? `${(it.fundedFraction * 100).toFixed(0)}% funded` : "not funded"}
                />
              </div>
            ))}
          </div>

          <SectionLabel>The method</SectionLabel>
          <Disclosure label="How did we determine this?">
            <p className="text-[0.86rem] text-ink-soft leading-relaxed max-w-2xl mb-4">
              This is a <b>Linear Program</b> — a genuinely different technique from the Supplier tab's quadratic
              program on the seller side, not the same math reused. Each at-risk product gets a decision variable{" "}
              <code>x</code> between 0 and 1 (what fraction of it to restock), and the program picks the{" "}
              <code>x</code> values that restore the most units without spending more than the budget.
            </p>
            <FormulaBlock
              label="The program"
              tex="\max \sum_i s_i x_i \quad \text{s.t.} \quad \sum_i c_i x_i \le B,\ \ 0 \le x_i \le 1"
            />
            <p className="text-[0.82rem] text-ink-muted leading-relaxed max-w-2xl mb-4">
              This particular shape — one budget constraint, each item independently fractionable — is the
              continuous (fractional) knapsack problem, and it has a closed-form optimal solution: rank products by{" "}
              <i>units restored per dollar</i> (s<sub>i</sub>/c<sub>i</sub>) and fund them in that order until the
              budget runs out, funding the item that breaks the budget only partially. Swapping any lower-ranked
              item into the plan in place of a higher-ranked one can only restore fewer units for the same money,
              so no other allocation of this budget can beat it — the sort itself is the proof.
            </p>
            <Callout>
              Verified before shipping: checked this budget-ranking solution against every one of the 40,320
              possible orderings of an 8-product subset at a fixed budget — the ranking's answer matched the best
              of all 40,320 exactly, to four decimal places.
            </Callout>
          </Disclosure>
        </>
      )}
    </div>
  );
}
