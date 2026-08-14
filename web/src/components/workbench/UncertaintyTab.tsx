import { Fragment } from "react";
import type { WorkbenchShared } from "../../pages/Workbench";
import { SectionLabel, StatRow, EmptyState } from "../Atoms";
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

export default function UncertaintyTab({ dataset, markov, nStep, currentState, horizon, goToData }: WorkbenchShared) {
  if (!markov || !nStep || currentState === null) {
    return (
      <EmptyState
        onGoToData={goToData}
        message={
          dataset
            ? "Not enough demand observations to fit a Markov chain — check the demand column mapping on the Data tab."
            : "No dataset loaded. Pick a sample or upload a CSV on the Data tab first."
        }
      />
    );
  }

  const heat = markov.transitionMatrix;
  const steadyData = STATES.map((s, i) => ({ state: s, p: markov.steadyState[i] }));
  const nStepData = STATES.map((s, i) => ({ state: s, p: nStep[i] }));

  return (
    <div>
      <div className="mb-1 font-mono text-[0.7rem] tracking-wider uppercase text-accent">Stage 02 · Step 4</div>
      <h1 className="font-display italic text-[2.5rem] leading-[1.02] tracking-[-0.02em] mb-3">Uncertainty modelling</h1>
      <p className="text-[0.9rem] text-ink-muted max-w-xl mb-6">
        A Markov chain over discretised demand states (ordinal: Low → Medium → High) turns the
        point forecast into a probability distribution over what actually happens next.
      </p>

      <div className="grid lg:grid-cols-[1fr_1.3fr] gap-8">
        <div className="space-y-3">
          <FormulaBlock label="Transition probability" tex="P_{ij} = \Pr(S_{t+1}=j \mid S_t=i)" />
          <FormulaBlock label="n-step distribution" tex="\pi^{(n)} = \pi^{(0)} P^{\,n}" />
          <FormulaBlock label="Steady state" tex="\pi = \pi P,\quad \sum_k \pi_k = 1" />
        </div>
        <div>
          <div className="font-mono text-[0.65rem] uppercase text-ink-muted mb-2">Transition matrix</div>
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
                    style={{ background: `color-mix(in oklab, var(--color-accent) ${Math.round(v * 90)}%, var(--color-surface))`, color: v > 0.45 ? "#072232" : "var(--color-ink-soft)" }}
                  >
                    {v.toFixed(2)}
                  </div>
                ))}
              </Fragment>
            ))}
          </div>
        </div>
      </div>

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
          <div className="text-[0.8rem] font-medium mb-2">{Math.min(horizon, 30)}-step forecast (now: {STATES[currentState]})</div>
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

      <SectionLabel>Result</SectionLabel>
      <StatRow
        items={[
          { label: "Current state", value: STATES[currentState], tone: "accent" },
          { label: "Low/Medium boundary", numeric: markov.thresholds[0], format: (v) => v.toFixed(1) },
          { label: "Medium/High boundary", numeric: markov.thresholds[1], format: (v) => v.toFixed(1) },
          { label: `P(High, ${Math.min(horizon, 30)} steps)`, numeric: nStep[2] * 100, format: (v) => `${v.toFixed(0)}%` },
        ]}
      />
    </div>
  );
}
