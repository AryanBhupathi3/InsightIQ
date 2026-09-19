import type { WorkbenchShared } from "../../pages/Workbench";
import { SectionLabel, Chip, Callout, EmptyState, VerdictPanel, StatRow } from "../Atoms";
import AnimatedNumber from "../AnimatedNumber";
import Disclosure from "../Disclosure";
import { STATES } from "../../lib/markov";
import { BarChart, Bar, XAxis, YAxis, Tooltip, ResponsiveContainer, CartesianGrid, Cell } from "recharts";

const SERIES = ["var(--color-series-1)", "var(--color-series-2)", "var(--color-series-3)", "var(--color-series-4)", "var(--color-series-5)", "var(--color-series-6)"];

// Margins can go negative (a plan that loses money at low demand), and
// "$-284,620" reads as a typo — sign goes outside the currency symbol.
const money = (v: number) => `${v < 0 ? "−" : ""}$${Math.abs(v).toLocaleString(undefined, { maximumFractionDigits: 0 })}`;
const units = (v: number) => v.toLocaleString(undefined, { maximumFractionDigits: 0 });

/** The plan commits to buying `target` units, so demand landing above that
 *  earns nothing extra — only the downside is open-ended. Sizing the period
 *  the same way the supplier stage does (a 30-day period at the forecast
 *  rate) keeps every number on this tab mutually consistent. */
const PERIOD_DAYS = 30;

export default function DecisionTab({ dataset, forecast, dStarDaily, supplierSolution, kkt, priceResult, groups, markov, horizon, activeEntity, goToData }: WorkbenchShared) {
  if (!supplierSolution || !kkt) {
    return (
      <EmptyState
        onGoToData={goToData}
        message={
          dataset
            ? "This stage merges the Forecast and Supplier outputs — finish mapping demand, cost and capacity on the Data tab first."
            : "No dataset loaded. Pick a sample or upload a CSV on the Data tab to see a full recommendation."
        }
      />
    );
  }

  const hasShortfall = supplierSolution.shortfall > 1e-6;
  const overBudget = !kkt.primalBudgetOk;
  const suppliersUsed = supplierSolution.x.filter((v) => v > 1e-3).length;
  const topIdx = supplierSolution.x.indexOf(Math.max(...supplierSolution.x));

  // Revenue can only come from what suppliers can actually deliver (target),
  // not the raw forecast demand — using `demand` here would count phantom
  // units no supplier could source.
  const revenue = priceResult.optimalPrice * supplierSolution.target;
  const margin = revenue - supplierSolution.totalCost;
  const breakEvenUnits = supplierSolution.totalCost / priceResult.optimalPrice;

  // Propagate the forecast's own uncertainty into the money. Buying `target`
  // units caps the upside at the plan itself, so the open question is how far
  // the downside runs if demand lands at the bottom of the forecast range.
  const q = forecast ? forecast.median.length - 1 : -1;
  const lowDemand = forecast ? Math.max(Math.round(forecast.p05[q] * PERIOD_DAYS), 1) : null;
  const soldIfLow = lowDemand === null ? null : Math.min(lowDemand, supplierSolution.target);
  const marginIfLow = soldIfLow === null ? null : priceResult.optimalPrice * soldIfLow - supplierSolution.totalCost;
  const safeAtLow = marginIfLow !== null && marginIfLow > 0;

  const allocation = supplierSolution.groups
    .map((name, i) => ({ name, x: supplierSolution.x[i] }))
    .filter((g) => g.x > 1e-3)
    .sort((a, b) => b.x - a.x);

  const verdict = overBudget
    ? {
        tone: "critical" as const,
        headline: "This plan doesn't fit your budget.",
        summary: (
          <>
            The cheapest way to source <AnimatedNumber value={supplierSolution.target} format={units} /> units
            costs <AnimatedNumber value={supplierSolution.totalCost} format={money} />, which is more than the{" "}
            <AnimatedNumber value={supplierSolution.budget} format={money} /> available. Every number below is the
            best plan that exists — it just isn't affordable as configured, so raise the budget or lower the
            rush-order penalty before committing.
          </>
        ),
      }
    : hasShortfall
    ? {
        tone: "warning" as const,
        headline: `Buy ${units(supplierSolution.target)} units, sell at $${priceResult.optimalPrice.toFixed(2)} — but you can't fully cover demand.`,
        summary: (
          <>
            Demand is forecast at <AnimatedNumber value={supplierSolution.demand} format={units} /> units, and your
            suppliers top out at <AnimatedNumber value={supplierSolution.target} format={units} /> — a shortfall of{" "}
            <AnimatedNumber value={supplierSolution.shortfall} format={units} />. Sourcing everything available
            across {suppliersUsed} suppliers costs{" "}
            <AnimatedNumber value={supplierSolution.totalCost} format={money} />, and selling it at{" "}
            <AnimatedNumber value={priceResult.optimalPrice} format={(v) => `$${v.toFixed(2)}`} /> leaves about{" "}
            <AnimatedNumber value={margin} format={money} /> of gross margin.
          </>
        ),
      }
    : {
        tone: "good" as const,
        headline: `Buy ${units(supplierSolution.target)} units, sell at $${priceResult.optimalPrice.toFixed(2)}.`,
        summary: (
          <>
            Source <AnimatedNumber value={supplierSolution.target} format={units} /> units across {suppliersUsed} of{" "}
            {groups.length} suppliers for <AnimatedNumber value={supplierSolution.totalCost} format={money} />, then
            sell at <AnimatedNumber value={priceResult.optimalPrice} format={(v) => `$${v.toFixed(2)}`} /> — the
            price that maximises profit at that cost. Expected gross margin is about{" "}
            <AnimatedNumber value={margin} format={money} />, and the sourcing plan is provably the cheapest one
            that meets this demand.
          </>
        ),
      };

  return (
    <div>
      <div className="mb-1 font-mono text-[0.7rem] tracking-wider uppercase text-accent">Stage 04 · Step 8</div>
      <h1 className="font-display italic text-[2.5rem] leading-[1.02] tracking-[-0.02em] mb-3">Decision engine</h1>
      <p className="text-[0.9rem] text-ink-muted max-w-xl mb-6">
        {activeEntity ? `For ${activeEntity}: ` : ""}every stage above, merged into one recommendation — sized to a{" "}
        {PERIOD_DAYS}-day period at the demand rate forecast for day {horizon}.
      </p>

      <VerdictPanel tone={verdict.tone} headline={verdict.headline}>{verdict.summary}</VerdictPanel>

      <SectionLabel>The recommendation</SectionLabel>
      <div className="grid sm:grid-cols-4 gap-4 mb-2">
        <div className="glass rounded-2xl p-4">
          <div className="font-mono text-[0.62rem] uppercase text-ink-muted mb-1">Forecast</div>
          <div className="text-[1.3rem] font-semibold text-accent tabular">
            {dStarDaily !== null ? <AnimatedNumber value={dStarDaily} format={(v) => v.toFixed(0)} /> : "—"}
          </div>
          <div className="text-[0.72rem] text-ink-muted">
            units/period{markov ? ` · ${STATES[markov.stateSeq[markov.stateSeq.length - 1]]} band` : ""}
          </div>
        </div>
        <div className="glass rounded-2xl p-4">
          <div className="font-mono text-[0.62rem] uppercase text-ink-muted mb-1">Sourcing</div>
          <div className="text-[1.1rem] font-semibold text-ink truncate">{groups[topIdx]?.name ?? "—"}</div>
          <div className={`text-[0.72rem] ${hasShortfall ? "text-warning" : "text-ink-muted"}`}>
            {hasShortfall
              ? `${units(supplierSolution.target)} of ${units(supplierSolution.demand)} sourceable`
              : `lead buyer of ${suppliersUsed} used`}
          </div>
        </div>
        <div className="glass rounded-2xl p-4">
          <div className="font-mono text-[0.62rem] uppercase text-ink-muted mb-1">Pricing</div>
          <div className="text-[1.3rem] font-semibold text-accent tabular">
            $<AnimatedNumber value={priceResult.optimalPrice} format={(v) => v.toFixed(2)} />
          </div>
          <div className="text-[0.72rem] text-ink-muted">profit-maximizing</div>
        </div>
        <div className="glass rounded-2xl p-4">
          <div className="font-mono text-[0.62rem] uppercase text-ink-muted mb-1">Justification</div>
          <Chip tone={kkt.allOk ? "good" : "warning"} label={kkt.allOk ? "KKT verified" : "not verified"} />
        </div>
      </div>

      <SectionLabel>Where the units come from</SectionLabel>
      <div className="grid lg:grid-cols-[1.4fr_1fr] gap-8 items-center">
        <div className="h-56">
          <ResponsiveContainer width="100%" height="100%">
            <BarChart data={allocation}>
              <CartesianGrid stroke="var(--color-border)" vertical={false} />
              <XAxis dataKey="name" stroke="var(--color-ink-faint)" fontSize={11} tickLine={false} />
              <YAxis stroke="var(--color-ink-faint)" fontSize={11} tickLine={false} />
              <Tooltip contentStyle={{ background: "var(--color-surface-raised)", border: "1px solid var(--color-border-strong)", borderRadius: 8, fontSize: 12 }} />
              <Bar dataKey="x" name="Units" radius={[4, 4, 0, 0]}>
                {allocation.map((_, i) => <Cell key={i} fill={SERIES[i % SERIES.length]} />)}
              </Bar>
            </BarChart>
          </ResponsiveContainer>
        </div>
        <div className="space-y-2">
          {allocation.slice(0, 6).map((g, i) => (
            <div key={g.name} className="flex items-center gap-2.5 text-[0.82rem]">
              <span className="w-2 h-2 rounded-full flex-shrink-0" style={{ background: SERIES[i % SERIES.length] }} />
              <span className="text-ink-soft flex-1 truncate">{g.name}</span>
              <span className="tabular text-ink-muted">{units(g.x)}</span>
              <span className="tabular text-ink-faint w-10 text-right">
                {((g.x / supplierSolution.target) * 100).toFixed(0)}%
              </span>
            </div>
          ))}
          {allocation.length > 6 && (
            <div className="text-[0.76rem] text-ink-faint pt-1">
              +{allocation.length - 6} more supplier{allocation.length - 6 > 1 ? "s" : ""}, all charted left
            </div>
          )}
        </div>
      </div>

      <SectionLabel>Expected economics (next {PERIOD_DAYS} days)</SectionLabel>
      <StatRow
        items={[
          { label: "Est. revenue", numeric: revenue, format: money },
          { label: "Est. procurement cost", numeric: supplierSolution.totalCost, format: money },
          { label: "Est. gross margin", numeric: margin, format: money, tone: "accent" },
          { label: "Break-even", numeric: breakEvenUnits, format: units, sub: `of ${units(supplierSolution.target)} bought` },
        ]}
      />

      {marginIfLow !== null && lowDemand !== null && (
        <div className="mt-6">
          <Callout>
            <strong>If demand disappoints.</strong> The forecast's low end for this period is{" "}
            {units(lowDemand)} units. You'd still have bought {units(supplierSolution.target)}, so margin falls to
            about <span className={safeAtLow ? "text-good" : "text-critical"}>{money(marginIfLow)}</span>
            {safeAtLow ? " — still profitable" : " — a loss"}, because procurement is already committed while
            revenue isn't. The upside doesn't move the same way: selling more than the{" "}
            {units(supplierSolution.target)} units you bought isn't possible, so margin is capped at{" "}
            {money(margin)} however well demand goes. You need {units(breakEvenUnits)} units sold to break even.
          </Callout>
        </div>
      )}

      {hasShortfall && (
        <div className="mt-4">
          <Chip
            tone="warning"
            label={`Capacity-constrained: only ${units(supplierSolution.target)} of ${units(supplierSolution.demand)} forecast units are sourceable — revenue and margin above reflect what suppliers can actually deliver, not the full forecast`}
          />
        </div>
      )}

      <SectionLabel>The proof</SectionLabel>
      <Disclosure label="How did we determine this?">
        <p className="text-[0.86rem] text-ink-soft leading-relaxed max-w-2xl mb-4">
          Nothing on this tab is entered by hand — each number is the output of the stage before it, which is why
          they agree with each other:
        </p>
        <ol className="space-y-3 text-[0.84rem] text-ink-soft leading-relaxed max-w-2xl list-none">
          <li>
            <span className="font-mono text-[0.68rem] uppercase text-accent">Steps 3–4 · forecast</span>
            <br />
            Demand history was sorted into Low/Medium/High bands and the forecast read off what demand actually did,
            every previous time it sat in the band it's in now — giving{" "}
            {dStarDaily !== null ? units(dStarDaily) : "—"} units per period as the most likely level
            {lowDemand !== null ? `, and ${units(lowDemand)} at the low end` : ""}. That's a range, not a promise,
            which is why the downside is spelled out above.
          </li>
          <li>
            <span className="font-mono text-[0.68rem] uppercase text-accent">Steps 5–6 · sourcing</span>
            <br />
            That demand became the target of a convex cost-minimisation across {groups.length} suppliers, solved
            exactly by water-filling — cheaper suppliers fill up before dearer ones are touched. The result,{" "}
            {money(supplierSolution.totalCost)} across {suppliersUsed} suppliers, is provably the cheapest feasible
            plan: all four KKT conditions {kkt.allOk ? "hold" : "were checked and flagged"}, so no other allocation
            can beat it.
          </li>
          <li>
            <span className="font-mono text-[0.68rem] uppercase text-accent">Step 7 · pricing</span>
            <br />
            The resulting unit cost fed gradient ascent on profit, which climbed to{" "}
            ${priceResult.optimalPrice.toFixed(2)} and was checked against the closed-form optimum{" "}
            (${priceResult.closedFormPrice.toFixed(2)}) — agreeing to within{" "}
            ${Math.abs(priceResult.optimalPrice - priceResult.closedFormPrice).toFixed(2)}.
          </li>
          <li>
            <span className="font-mono text-[0.68rem] uppercase text-accent">Step 8 · this page</span>
            <br />
            Revenue is that price on the {units(supplierSolution.target)} units actually sourceable, less the{" "}
            {money(supplierSolution.totalCost)} they cost.
          </li>
        </ol>
      </Disclosure>

      <div className="mt-8">
        <Callout>
          Feedback loop: once realised sales for this period are recorded, they'd be appended to
          the Data layer, re-weighting Step 2 and refreshing every model above.
        </Callout>
      </div>
    </div>
  );
}
