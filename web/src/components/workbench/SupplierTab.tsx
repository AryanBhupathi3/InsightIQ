import type { WorkbenchShared } from "../../pages/Workbench";
import { SectionLabel, StatRow, StatusRow, Chip, EmptyState } from "../Atoms";
import FormulaBlock from "../FormulaBlock";
import { BarChart, Bar, XAxis, YAxis, Tooltip, ResponsiveContainer, CartesianGrid, Cell } from "recharts";

const SERIES = ["var(--color-series-1)", "var(--color-series-2)", "var(--color-series-3)", "var(--color-series-4)", "var(--color-series-5)", "var(--color-series-6)"];

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

  return (
    <div>
      <div className="mb-1 font-mono text-[0.7rem] tracking-wider uppercase text-accent">Stage 03 · Steps 5–6</div>
      <h1 className="font-display italic text-[2.5rem] leading-[1.02] tracking-[-0.02em] mb-3">Supplier selection</h1>
      <p className="text-[0.9rem] text-ink-muted max-w-xl mb-6">
        Solved exactly via water-filling — the unique lowest-cost way to source D* units across
        {" "}{groups.length} {groups.length === 1 ? "supplier" : "suppliers"} — then checked against the KKT conditions.
      </p>

      <div className="grid lg:grid-cols-[1fr_1.2fr] gap-8">
        <div className="space-y-3">
          <FormulaBlock label="Convex cost per supplier i" tex="c_i(x_i) = p_i x_i + \tfrac12\gamma x_i^2" />
          <FormulaBlock
            label="Program"
            tex="\min_{x\ge0}\sum_i c_i(x_i)\ \text{s.t.}\ \sum_i x_i = D^\star,\ x_i\le\text{cap}_i"
          />
          <label className="block">
            <div className="flex justify-between font-mono text-[0.65rem] uppercase text-ink-muted mb-1">
              <span>Rush-order penalty γ</span><span className="tabular">{gamma.toFixed(3)}</span>
            </div>
            <input type="range" min={0} max={0.02} step={0.001} value={gamma} onChange={(e) => setGamma(+e.target.value)} className="w-full accent-accent" />
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

      <SectionLabel>Allocation</SectionLabel>
      <StatRow
        items={[
          { label: "Total cost", value: `$${supplierSolution.totalCost.toLocaleString(undefined, { maximumFractionDigits: 0 })}`, tone: "accent" },
          { label: "Suppliers used", value: `${supplierSolution.x.filter((v) => v > 1e-3).length} / ${groups.length}` },
          { label: "Avg cost/unit", value: `$${(supplierSolution.totalCost / Math.max(supplierSolution.x.reduce((a, b) => a + b, 0), 1)).toFixed(2)}` },
          { label: "Budget", value: `$${budget.toLocaleString(undefined, { maximumFractionDigits: 0 })}` },
        ]}
      />

      <SectionLabel>KKT optimality check</SectionLabel>
      <FormulaBlock
        label="Lagrangian"
        tex="\mathcal{L}=\sum_i c_i(x_i)+\lambda\Big(\sum_i x_i-D^\star\Big)+\sum_i\mu_i(x_i-\text{cap}_i)"
      />
      <div className="mt-2">
        <StatusRow ok={kkt.stationarityOk} label="Stationarity" detail={`|∇L| = ${kkt.stationarityResidual.toExponential(2)}`} />
        <StatusRow ok={kkt.primalDemandOk && kkt.primalCapacityOk} label="Primal feasibility" detail={`demand gap ${kkt.primalDemandGap.toExponential(2)}`} />
        <StatusRow ok={kkt.primalBudgetOk} label="Budget feasibility" detail={`slack $${(-kkt.primalBudgetSlack).toFixed(0)}`} />
        <StatusRow ok={kkt.complementarySlacknessOk} label="Complementary slackness" detail={kkt.complementarySlacknessResidual.toExponential(2)} />
      </div>
      <div className="mt-3">
        <Chip
          tone={kkt.allOk ? "good" : "warning"}
          label={kkt.allOk ? "Optimal — proceed to Step 7" : "Infeasible at this budget — raise headroom or lower γ"}
        />
      </div>
    </div>
  );
}
