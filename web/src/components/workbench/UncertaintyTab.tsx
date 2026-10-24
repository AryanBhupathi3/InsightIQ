import { Fragment } from "react";
import type { WorkbenchShared } from "../../pages/Workbench";
import { SectionLabel, StatRow, StatusRow, Chip, EmptyState, VerdictPanel } from "../Atoms";
import AnimatedNumber from "../AnimatedNumber";
import Disclosure from "../Disclosure";
import FormulaBlock from "../FormulaBlock";
import { STATES } from "../../lib/markov";
import { BarChart, Bar, XAxis, YAxis, Tooltip, ResponsiveContainer, CartesianGrid, Cell } from "recharts";

// Ordinal ramp, one hue (the accent) light→dark — Low/Medium/High is a
// magnitude, not an identity, so it gets a sequential encoding rather than
// three unrelated categorical colors.
const SEQ = [
  "color-mix(in oklab, var(--color-accent) 30%, var(--color-surface))",
  "color-mix(in oklab, var(--color-accent) 62%, var(--color-surface))",
  "var(--color-accent)",
];

const pct = (v: number) => `${v.toFixed(0)}%`;

export default function UncertaintyTab({
  dataset, markov, nStep, currentState, horizon, goToData,
  mdp, orderQtyMult, setOrderQtyMult, holdingCost, setHoldingCost, stockoutCost, setStockoutCost, orderCost, setOrderCost,
}: WorkbenchShared) {
  if (!markov || !nStep || currentState === null) {
    return (
      <EmptyState
        onGoToData={goToData}
        message={
          dataset
            ? "Not enough demand observations to model uncertainty — check the demand column mapping on the Data tab."
            : "No dataset loaded. Pick a sample or upload a CSV on the Data tab first."
        }
      />
    );
  }

  const heat = markov.transitionMatrix;
  const steadyData = STATES.map((s, i) => ({ state: s, p: markov.steadyState[i] }));
  const nStepData = STATES.map((s, i) => ({ state: s, p: nStep[i] }));
  const nSteps = Math.min(horizon, 30);

  return (
    <div>
      <div className="mb-1 font-mono text-[0.7rem] tracking-wider uppercase text-accent">Stage 02 · Step 4</div>
      <h1 className="font-display italic text-[2.5rem] leading-[1.02] tracking-[-0.02em] mb-3">Uncertainty modelling</h1>
      <p className="text-[0.9rem] text-ink-muted max-w-xl mb-6">
        Demand doesn't always follow the trend line exactly — this stage estimates how likely it is to run Low,
        Medium, or High next, based on where it's been recently.
      </p>

      <VerdictPanel tone="info" headline={`Demand is currently ${STATES[currentState]}.`}>
        Looking {nSteps} steps ahead, there's roughly a <AnimatedNumber value={nStep[2] * 100} format={pct} />{" "}
        chance demand lands High, <AnimatedNumber value={nStep[1] * 100} format={pct} /> Medium, and{" "}
        <AnimatedNumber value={nStep[0] * 100} format={pct} /> Low. Over the long run — far beyond this
        forecast window — demand tends to spend about <AnimatedNumber value={markov.steadyState[2] * 100} format={pct} />{" "}
        of its time High, <AnimatedNumber value={markov.steadyState[1] * 100} format={pct} /> Medium, and{" "}
        <AnimatedNumber value={markov.steadyState[0] * 100} format={pct} /> Low.
      </VerdictPanel>

      <SectionLabel>Distributions</SectionLabel>
      <div className="grid sm:grid-cols-2 gap-8">
        <div className="h-56">
          <div className="text-[0.8rem] font-medium mb-2">Long-run (steady-state)</div>
          <ResponsiveContainer width="100%" height="90%">
            <BarChart data={steadyData}>
              <CartesianGrid stroke="var(--color-border)" vertical={false} />
              <XAxis dataKey="state" stroke="var(--color-ink-faint)" fontSize={11} tickLine={false} />
              <YAxis domain={[0, 1]} stroke="var(--color-ink-faint)" fontSize={11} tickLine={false} />
              <Tooltip contentStyle={{ background: "var(--color-surface-raised)", border: "1px solid var(--color-border-strong)", borderRadius: 8, fontSize: 12 }} />
              <Bar dataKey="p" radius={[4, 4, 0, 0]}>
                {steadyData.map((_, i) => <Cell key={i} fill={SEQ[i]} />)}
              </Bar>
            </BarChart>
          </ResponsiveContainer>
        </div>
        <div className="h-56">
          <div className="text-[0.8rem] font-medium mb-2">{nSteps}-step forecast (now: {STATES[currentState]})</div>
          <ResponsiveContainer width="100%" height="90%">
            <BarChart data={nStepData}>
              <CartesianGrid stroke="var(--color-border)" vertical={false} />
              <XAxis dataKey="state" stroke="var(--color-ink-faint)" fontSize={11} tickLine={false} />
              <YAxis domain={[0, 1]} stroke="var(--color-ink-faint)" fontSize={11} tickLine={false} />
              <Tooltip contentStyle={{ background: "var(--color-surface-raised)", border: "1px solid var(--color-border-strong)", borderRadius: 8, fontSize: 12 }} />
              <Bar dataKey="p" radius={[4, 4, 0, 0]}>
                {nStepData.map((_, i) => <Cell key={i} fill={SEQ[i]} />)}
              </Bar>
            </BarChart>
          </ResponsiveContainer>
        </div>
      </div>

      <StatRow
        items={[
          { label: "Low → Medium cutoff", numeric: markov.thresholds[0], format: (v) => v.toFixed(1), sub: "demand units" },
          { label: "Medium → High cutoff", numeric: markov.thresholds[1], format: (v) => v.toFixed(1), sub: "demand units" },
        ]}
      />

      {mdp && (
        <>
          <SectionLabel>Stage 02 · Step 4b — the reorder decision</SectionLabel>
          <p className="text-[0.9rem] text-ink-muted max-w-xl mb-5">
            Knowing demand's odds doesn't say what to do about them. This turns the chain above into a
            decision — a <b>Markov Decision Process</b>: at every stock level, should you reorder or hold?
          </p>

          <VerdictPanel
            tone="info"
            headline={
              mdp.policy.filter((p) => p.action === "reorder").length === 0
                ? "At these costs, holding always wins."
                : `Reorder once stock drops below ~${mdp.policy.find((p) => p.action === "reorder")!.state.daysOfAvgDemand.toFixed(1)}x average daily demand.`
            }
          >
            Solved by value iteration over {mdp.states.length} stock levels, each simulated against this SKU's own
            real historical demand draws under both choices. The policy below is whichever action has the higher
            long-run expected value at each level — not a guess, a comparison of two computed numbers per row.
          </VerdictPanel>

          <div className="grid lg:grid-cols-[1fr_1fr] gap-8 mb-5">
            <div className="space-y-3">
              <label className="block">
                <div className="flex justify-between font-mono text-[0.65rem] uppercase text-ink-muted mb-1">
                  <span>Reorder quantity (× avg daily demand)</span><span className="tabular">{orderQtyMult.toFixed(1)}×</span>
                </div>
                <input type="range" min={1} max={6} step={0.5} value={orderQtyMult} onChange={(e) => setOrderQtyMult(+e.target.value)} className="w-full accent-accent" />
              </label>
              <label className="block">
                <div className="flex justify-between font-mono text-[0.65rem] uppercase text-ink-muted mb-1">
                  <span>Holding cost (per unit/period)</span><span className="tabular">${holdingCost.toFixed(1)}</span>
                </div>
                <input type="range" min={0.1} max={20} step={0.1} value={holdingCost} onChange={(e) => setHoldingCost(+e.target.value)} className="w-full accent-accent" />
              </label>
            </div>
            <div className="space-y-3">
              <label className="block">
                <div className="flex justify-between font-mono text-[0.65rem] uppercase text-ink-muted mb-1">
                  <span>Stockout cost (per unit short)</span><span className="tabular">${stockoutCost.toFixed(0)}</span>
                </div>
                <input type="range" min={1} max={200} step={1} value={stockoutCost} onChange={(e) => setStockoutCost(+e.target.value)} className="w-full accent-accent" />
              </label>
              <label className="block">
                <div className="flex justify-between font-mono text-[0.65rem] uppercase text-ink-muted mb-1">
                  <span>Fixed cost per order placed</span><span className="tabular">${orderCost.toFixed(0)}</span>
                </div>
                <input type="range" min={0} max={300} step={10} value={orderCost} onChange={(e) => setOrderCost(+e.target.value)} className="w-full accent-accent" />
              </label>
            </div>
          </div>

          <div className="space-y-1 mb-5">
            {mdp.policy.map((row) => (
              <div key={row.state.bucket} className="flex items-center gap-3 text-[0.82rem]">
                <span className="tabular text-ink-muted w-28">{row.state.daysOfAvgDemand.toFixed(1)}x avg demand</span>
                <span className="tabular text-ink-faint w-20">{row.state.level.toFixed(0)} units</span>
                <Chip tone={row.action === "reorder" ? "warning" : "good"} label={row.action === "reorder" ? "Reorder" : "Hold"} />
                <span className="tabular text-ink-faint text-[0.72rem]">V = {row.value.toFixed(0)}</span>
              </div>
            ))}
          </div>

          <Disclosure label="How did we determine this?" nested>
            <p className="text-[0.86rem] text-ink-soft leading-relaxed max-w-2xl mb-4">
              Each stock level is a state. At every state, two possible actions — Reorder or Hold — are compared
              by simulating every value in this SKU's real demand history against both: if you reorder, your
              stock goes up by the slider's amount, then that day's real demand draws it back down; if you hold,
              it's just drawn down directly. Averaging the outcome of every historical demand value gives the
              expected cost of each action at each level, and which state you'd land in next for each.
            </p>
            <p className="text-[0.82rem] text-ink-muted leading-relaxed max-w-2xl mb-5">
              Because reordering changes where you actually end up next period, the decision isn't just "which
              action scores higher right now" — it has to account for the states that choice leads to as well,
              which themselves lead to future decisions. That's what the recursion below solves: the value of a
              state is the best of (reorder, hold), where each is scored by its immediate cost plus the
              discounted value of wherever it leads. Solving it takes {mdp.iterations} iterations to{" "}
              {mdp.converged ? "converge" : "stabilize"} — each pass updates every state's value using the
              previous pass's values, until they stop changing.
            </p>
            <StatusRow ok={mdp.converged} label="Value iteration" detail={`${mdp.iterations} iterations, max update < 1e-6`} />
            <div className="space-y-3 mt-4">
              <FormulaBlock label="Bellman optimality equation" tex="V(s) = \max_{a\in\{\text{hold},\text{reorder}\}} \Big[ R(s,a) + \gamma \sum_{s'} P(s'\mid s,a)\,V(s') \Big]" />
              <FormulaBlock label="Resulting policy" tex="\pi^\star(s) = \arg\max_{a} \Big[ R(s,a) + \gamma \sum_{s'} P(s'\mid s,a)\,V(s') \Big]" />
            </div>
            <p className="text-[0.78rem] text-ink-muted leading-relaxed max-w-2xl mt-4">
              Deliberately not built from this dataset's Order_Quantity column: tracing a real reorder event
              there (470 units placed, 14-day lead time) shows inventory still declining 17+ days later with no
              replenishment ever visible — that column and Inventory_Level aren't actually causally linked in
              this data, so treating them as a real transition signal would mean presenting a relationship that
              isn't there. The demand draws above are real; the reorder quantity and the three costs are policy
              parameters you set, the same honest pattern as γ and ε elsewhere in this app.
            </p>
          </Disclosure>
        </>
      )}

      <SectionLabel>The proof</SectionLabel>
      <Disclosure label="How did we determine this?">
        <p className="text-[0.86rem] text-ink-soft leading-relaxed max-w-2xl mb-4">
          InsightIQ buckets every historical period into Low, Medium, or High demand, then counts how often each
          state was followed by each other state — building a table of "if today is X, tomorrow is Y" odds. That
          table is what produces the percentages above, both for the next few steps and for where demand settles
          in the long run.
        </p>
        <div className="mb-5">
          <div className="font-mono text-[0.65rem] uppercase text-ink-muted mb-2">Transition matrix — P(row → column)</div>
          <div className="grid grid-cols-4 gap-0.5 max-w-md">
            <div />
            {STATES.map((s) => <div key={s} className="text-[0.68rem] text-ink-muted text-center pb-1">{s}</div>)}
            {STATES.map((rowLabel, i) => (
              <Fragment key={rowLabel}>
                <div className="text-[0.68rem] text-ink-muted flex items-center pr-2">{rowLabel}</div>
                {heat[i].map((v, j) => (
                  <div
                    key={j}
                    className="aspect-square flex items-center justify-center text-[0.78rem] font-mono rounded"
                    style={{ background: `color-mix(in oklab, var(--color-accent) ${Math.round(v * 90)}%, var(--color-surface))`, color: v > 0.45 ? "var(--color-bg)" : "var(--color-ink-soft)" }}
                  >
                    {v.toFixed(2)}
                  </div>
                ))}
              </Fragment>
            ))}
          </div>
        </div>
        <div className="space-y-3">
          <FormulaBlock label="Transition probability" tex="P_{ij} = \Pr(S_{t+1}=j \mid S_t=i)" />
          <FormulaBlock label="n-step distribution" tex="\pi^{(n)} = \pi^{(0)} P^{\,n}" />
          <FormulaBlock label="Steady state" tex="\pi = \pi P,\quad \sum_k \pi_k = 1" />
        </div>
      </Disclosure>
    </div>
  );
}
