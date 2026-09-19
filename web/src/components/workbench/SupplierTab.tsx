import type { WorkbenchShared } from "../../pages/Workbench";
import { SectionLabel, StatRow, StatusRow, Chip, EmptyState, VerdictPanel } from "../Atoms";
import AnimatedNumber from "../AnimatedNumber";
import Disclosure from "../Disclosure";
import FormulaBlock from "../FormulaBlock";
import { BarChart, Bar, XAxis, YAxis, Tooltip, ResponsiveContainer, CartesianGrid, Cell } from "recharts";

const SERIES = ["var(--color-series-1)", "var(--color-series-2)", "var(--color-series-3)", "var(--color-series-4)", "var(--color-series-5)", "var(--color-series-6)"];

const money = (v: number) => `$${v.toLocaleString(undefined, { maximumFractionDigits: 0 })}`;
const units = (v: number) => v.toLocaleString(undefined, { maximumFractionDigits: 0 });

export default function SupplierTab({ dataset, groups, gamma, setGamma, budgetMult, setBudgetMult, budget, supplierSolution, kkt, goToData }: WorkbenchShared) {
  if (groups.length === 0) {
    return (
      <EmptyState
        onGoToData={goToData}
        message={
          dataset
            ? "This file needs a cost and a capacity column mapped to run supplier selection — a supplier/vendor column is optional (it'll bucket by cost tiers otherwise). Fine-tune the mapping on the Data tab."
            : "No dataset loaded. Pick a sample or upload a CSV on the Data tab first."
        }
      />
    );
  }
  if (!supplierSolution || !kkt) return null;

  const chartData = supplierSolution.groups.map((g, i) => ({ name: g, x: supplierSolution.x[i], cap: supplierSolution.capacity[i] }));
  const suppliersUsed = supplierSolution.x.filter((v) => v > 1e-3).length;
  const hasShortfall = supplierSolution.shortfall > 1e-6;
  const overBudget = !kkt.primalBudgetOk;
  const budgetGap = supplierSolution.totalCost - budget;

  // Priority matches the old Chip logic: a budget miss is the harder stop,
  // a capacity shortfall is a softer "did what it could" outcome, and
  // otherwise the plan is a clean, provable optimum.
  const verdict = overBudget
    ? {
        tone: "critical" as const,
        headline: "This plan is over budget.",
        summary: (
          <>
            Sourcing <AnimatedNumber value={supplierSolution.target} format={units} /> units at the lowest
            possible cost comes to <AnimatedNumber value={supplierSolution.totalCost} format={money} />
            {" "}— <AnimatedNumber value={budgetGap} format={money} /> more than your{" "}
            <AnimatedNumber value={budget} format={money} /> budget. Raising the available budget, or lowering the
            rush-order penalty, would bring it back in range.
          </>
        ),
        how: `InsightIQ found the cheapest possible way to source ${units(supplierSolution.target)} units — ${money(supplierSolution.totalCost)} — and confirmed no other allocation could do it for less. That floor still sits above the ${money(budget)} budget, so no allocation of this demand can fit it as configured.`,
      }
    : hasShortfall
    ? {
        tone: "warning" as const,
        headline: "Your suppliers can't fully cover this order.",
        summary: (
          <>
            InsightIQ needs <AnimatedNumber value={supplierSolution.demand} format={units} /> units, but your{" "}
            {groups.length} suppliers can provide at most{" "}
            <AnimatedNumber value={supplierSolution.target} format={units} /> — a shortfall of{" "}
            <AnimatedNumber value={supplierSolution.shortfall} format={units} /> units. The{" "}
            {units(supplierSolution.target)} that are available have been allocated across {suppliersUsed} suppliers
            at the lowest possible cost, <AnimatedNumber value={supplierSolution.totalCost} format={money} />.
          </>
        ),
        how: `InsightIQ compared supplier costs and capacities, used every unit of capacity starting from the cheapest supplier, and mathematically verified that no other combination could source the achievable ${units(supplierSolution.target)} units for less.`,
      }
    : {
        tone: "good" as const,
        headline: "Your supplier allocation is optimal.",
        summary: (
          <>
            InsightIQ needs <AnimatedNumber value={supplierSolution.target} format={units} /> units and has
            allocated them across {suppliersUsed} of {groups.length} suppliers at a total estimated cost of{" "}
            <AnimatedNumber value={supplierSolution.totalCost} format={money} />. The allocation satisfies every
            supplier's capacity and stays within budget.
          </>
        ),
        how: `InsightIQ compared supplier costs and capacities and mathematically verified that no other feasible allocation would produce a lower total procurement cost.`,
      };

  return (
    <div>
      <div className="mb-1 font-mono text-[0.7rem] tracking-wider uppercase text-accent">Stage 03 · Steps 5–6</div>
      <h1 className="font-display italic text-[2.5rem] leading-[1.02] tracking-[-0.02em] mb-3">Supplier selection</h1>
      <p className="text-[0.9rem] text-ink-muted max-w-xl mb-6">
        InsightIQ decides how many units to buy from each supplier — and proves mathematically that no cheaper
        combination exists.
      </p>

      {/* The answer first: what to do, and whether it's actually workable — everything
          below this is progressively more detail for anyone who wants to check the work. */}
      <VerdictPanel tone={verdict.tone} headline={verdict.headline}>{verdict.summary}</VerdictPanel>

      <SectionLabel>Allocation</SectionLabel>
      <div className="grid lg:grid-cols-[1fr_1.2fr] gap-8">
        <div className="space-y-5">
          <StatRow
            items={[
              { label: "Demand met", numeric: supplierSolution.target, format: units, sub: `of ${units(supplierSolution.demand)} requested`, tone: hasShortfall ? "ink" : "accent" },
              { label: "Total cost", numeric: supplierSolution.totalCost, format: money, tone: "accent" },
              { label: "Suppliers used", value: `${suppliersUsed} / ${groups.length}` },
              { label: "Avg cost/unit", numeric: supplierSolution.totalCost / Math.max(supplierSolution.x.reduce((a, b) => a + b, 0), 1), format: (v) => `$${v.toFixed(2)}` },
              { label: "Budget", numeric: budget, format: money },
            ]}
          />
          <label className="block">
            <div className="flex justify-between font-mono text-[0.65rem] uppercase text-ink-muted mb-1">
              <span>Rush-order penalty γ</span><span className="tabular">{gamma.toFixed(3)}</span>
            </div>
            {/* Floor is 0.001, not 0: the water-filling solve divides by gamma,
                so gamma=0 degenerates to a divide-by-zero and NaNs the whole
                downstream pipeline. */}
            <input type="range" min={0.001} max={0.02} step={0.001} value={gamma} onChange={(e) => setGamma(+e.target.value)} className="w-full accent-accent" />
          </label>
          <label className="block">
            <div className="flex justify-between font-mono text-[0.65rem] uppercase text-ink-muted mb-1">
              <span>Budget headroom (× min cost)</span><span className="tabular">{budgetMult.toFixed(1)}×</span>
            </div>
            <input type="range" min={1} max={3} step={0.1} value={budgetMult} onChange={(e) => setBudgetMult(+e.target.value)} className="w-full accent-accent" />
          </label>
        </div>
        <div className="h-72">
          <ResponsiveContainer width="100%" height="100%">
            <BarChart data={chartData}>
              <CartesianGrid stroke="var(--color-border)" vertical={false} />
              <XAxis dataKey="name" stroke="var(--color-ink-faint)" fontSize={11} tickLine={false} />
              <YAxis stroke="var(--color-ink-faint)" fontSize={11} tickLine={false} />
              <Tooltip contentStyle={{ background: "var(--color-surface-raised)", border: "1px solid var(--color-border-strong)", borderRadius: 8, fontSize: 12 }} />
              <Bar dataKey="x" name="Allocated units" radius={[4, 4, 0, 0]}>
                {chartData.map((_, i) => <Cell key={i} fill={SERIES[i % SERIES.length]} />)}
              </Bar>
            </BarChart>
          </ResponsiveContainer>
        </div>
      </div>

      <SectionLabel>The proof</SectionLabel>
      <Disclosure label="How did we determine this?">
        <p className="text-[0.86rem] text-ink-soft leading-relaxed max-w-2xl mb-4">{verdict.how}</p>
        <p className="text-[0.82rem] text-ink-muted leading-relaxed max-w-2xl mb-5">
          In practice: cheaper suppliers get used up to their capacity before more expensive ones are tapped at
          all — the same logic a buyer would use by hand, just checked mathematically instead of guessed.
        </p>
        <div className="space-y-3 mb-2">
          <FormulaBlock label="Cost of buying from supplier i (price, plus a rush-order penalty for large orders)" tex="c_i(x_i) = p_i x_i + \tfrac12\gamma x_i^2" />
          <FormulaBlock
            label="What's being minimized"
            tex="\min_{x\ge0}\sum_i c_i(x_i)\ \text{s.t.}\ \sum_i x_i = D^\star,\ x_i\le\text{cap}_i"
          />
        </div>

        <Disclosure label="Mathematical verification — KKT conditions" nested>
          <p className="text-[0.8rem] text-ink-muted leading-relaxed max-w-xl mb-3">
            Four independent checks that together certify the allocation above is optimal for the{" "}
            {hasShortfall ? "achievable" : "requested"} target ({units(supplierSolution.target)} units) — a
            capacity shortfall, if any, is a business constraint reported above, not a failure of this proof.
          </p>
          <FormulaBlock
            label="Lagrangian"
            tex="\mathcal{L}=\sum_i c_i(x_i)+\lambda\Big(\sum_i x_i-D^\star\Big)+\sum_i\mu_i(x_i-\text{cap}_i)"
          />
          <div className="mt-2">
            <StatusRow ok={kkt.stationarityOk} label="Stationarity" detail={`|∇L| = ${kkt.stationarityResidual.toExponential(2)}`} />
            <StatusRow ok={kkt.primalDemandOk && kkt.primalCapacityOk} label="Primal feasibility" detail={`target gap ${kkt.primalDemandGap.toExponential(2)}`} />
            <StatusRow ok={kkt.primalBudgetOk} label="Budget feasibility" detail={`slack $${(-kkt.primalBudgetSlack).toFixed(0)}`} />
            <StatusRow ok={kkt.complementarySlacknessOk} label="Complementary slackness" detail={kkt.complementarySlacknessResidual.toExponential(2)} />
          </div>
          <div className="mt-3">
            <Chip
              tone={kkt.allOk ? "good" : "warning"}
              label={
                kkt.allOk
                  ? hasShortfall
                    ? "Optimal for the achievable target — proceed to Step 7"
                    : "Optimal — proceed to Step 7"
                  : overBudget
                  ? "Infeasible at this budget — raise headroom or lower γ"
                  : "KKT check failed — see conditions above"
              }
            />
          </div>
        </Disclosure>
      </Disclosure>
    </div>
  );
}
