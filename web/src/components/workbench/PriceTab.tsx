import type { WorkbenchShared } from "../../pages/Workbench";
import { SectionLabel, StatRow, Callout } from "../Atoms";
import FormulaBlock from "../FormulaBlock";
import { profitAt } from "../../lib/pricing";
import { LineChart, Line, XAxis, YAxis, Tooltip, ResponsiveContainer, CartesianGrid, ReferenceLine } from "recharts";

export default function PriceTab({ dataset, costPerUnit, dStarMonthly, priceResult, epsilon, setEpsilon, lr, setLr }: WorkbenchShared) {
  const dStar = dStarMonthly ?? 1000;
  const pRef = costPerUnit * 1.6;

  const pMax = costPerUnit * 3.2;
  const curve = Array.from({ length: 60 }, (_, i) => {
    const p = costPerUnit * 1.02 + (pMax - costPerUnit * 1.02) * (i / 59);
    return { p, profit: profitAt(p, costPerUnit, dStar, pRef, epsilon) };
  });
  const convergence = priceResult.priceHistory.map((p, i) => ({ k: i, price: p }));

  return (
    <div>
      <div className="mb-1 font-mono text-[0.7rem] tracking-wider uppercase text-accent">Stage 03 · Step 7</div>
      <h1 className="font-display italic text-[2.1rem] leading-tight mb-2">Price optimization</h1>
      <p className="text-[0.9rem] text-ink-muted max-w-xl mb-6">
        Gradient ascent climbs the profit function using D* and the procurement cost solved for
        in Step 5, until the selling price converges.
      </p>

      {!dataset && (
        <Callout>
          No dataset loaded — the numbers below use placeholder defaults. Load a CSV on the Data
          tab to run this against your own D* and cost.
        </Callout>
      )}

      <div className="grid lg:grid-cols-[1fr_1.3fr] gap-8 mt-6">
        <div className="space-y-3">
          <label className="block">
            <div className="flex justify-between font-mono text-[0.65rem] uppercase text-ink-muted mb-1">
              <span>Price elasticity ε</span><span className="tabular">{epsilon.toFixed(1)}</span>
            </div>
            <input type="range" min={1.1} max={4} step={0.1} value={epsilon} onChange={(e) => setEpsilon(+e.target.value)} className="w-full accent-accent" />
          </label>
          <label className="block">
            <div className="flex justify-between font-mono text-[0.65rem] uppercase text-ink-muted mb-1">
              <span>Learning rate</span><span className="tabular">{lr.toFixed(2)}</span>
            </div>
            <input type="range" min={0.02} max={0.4} step={0.01} value={lr} onChange={(e) => setLr(+e.target.value)} className="w-full accent-accent" />
          </label>
          <FormulaBlock label="Demand curve" tex="D(p) = D^\star (p/p_{ref})^{-\varepsilon}" />
          <FormulaBlock label="Ascent update" tex="p_{k+1} = p_k + \eta\,\nabla_p \Pi(p_k)" />
          <FormulaBlock label="Closed-form check" tex="p^\star = \dfrac{\varepsilon}{\varepsilon-1}\,c" />
        </div>
        <div className="space-y-6">
          <div className="h-56">
            <ResponsiveContainer width="100%" height="100%">
              <LineChart data={curve}>
                <CartesianGrid stroke="var(--color-border)" vertical={false} />
                <XAxis dataKey="p" stroke="var(--color-ink-faint)" fontSize={11} tickLine={false} tickFormatter={(v) => `$${v.toFixed(0)}`} />
                <YAxis stroke="var(--color-ink-faint)" fontSize={11} tickLine={false} />
                <Tooltip contentStyle={{ background: "var(--color-surface-raised)", border: "1px solid var(--color-border-strong)", borderRadius: 8, fontSize: 12 }} formatter={(v) => `$${Number(v).toFixed(0)}`} labelFormatter={(v) => `p = $${Number(v).toFixed(2)}`} />
                <ReferenceLine x={priceResult.closedFormPrice} stroke="var(--color-series-3)" strokeDasharray="3 3" label={{ value: "p*", fill: "var(--color-series-3)", fontSize: 11 }} />
                <Line type="monotone" dataKey="profit" stroke="var(--color-series-1)" strokeWidth={1.8} dot={false} name="Π(p)" />
              </LineChart>
            </ResponsiveContainer>
          </div>
          <div className="h-40">
            <ResponsiveContainer width="100%" height="100%">
              <LineChart data={convergence}>
                <CartesianGrid stroke="var(--color-border)" vertical={false} />
                <XAxis dataKey="k" stroke="var(--color-ink-faint)" fontSize={11} tickLine={false} />
                <YAxis stroke="var(--color-ink-faint)" fontSize={11} tickLine={false} tickFormatter={(v) => `$${v.toFixed(0)}`} />
                <Tooltip contentStyle={{ background: "var(--color-surface-raised)", border: "1px solid var(--color-border-strong)", borderRadius: 8, fontSize: 12 }} formatter={(v) => `$${Number(v).toFixed(2)}`} />
                <ReferenceLine y={priceResult.closedFormPrice} stroke="var(--color-series-3)" strokeDasharray="3 3" />
                <Line type="monotone" dataKey="price" stroke="var(--color-accent)" strokeWidth={2} dot={{ r: 2 }} name="Price per iteration" />
              </LineChart>
            </ResponsiveContainer>
          </div>
        </div>
      </div>

      <SectionLabel>Result</SectionLabel>
      <StatRow
        items={[
          { label: "Optimal price", value: `$${priceResult.optimalPrice.toFixed(2)}`, tone: "accent" },
          { label: "Closed-form p*", value: `$${priceResult.closedFormPrice.toFixed(2)}`, sub: "sanity check" },
          { label: "Max profit", value: `$${priceResult.optimalProfit.toLocaleString(undefined, { maximumFractionDigits: 0 })}` },
          { label: "Converged by", value: `${priceResult.convergedAt}`, sub: `of ${priceResult.priceHistory.length - 1} iters` },
        ]}
      />
    </div>
  );
}
