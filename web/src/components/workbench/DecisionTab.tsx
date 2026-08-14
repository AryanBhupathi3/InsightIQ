import type { WorkbenchShared } from "../../pages/Workbench";
import { SectionLabel, Chip, Callout, EmptyState } from "../Atoms";
import AnimatedNumber from "../AnimatedNumber";

export default function DecisionTab({ dataset, dStarDaily, supplierSolution, kkt, priceResult, groups, horizon, activeEntity, goToData }: WorkbenchShared) {
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

  const topIdx = supplierSolution.x.indexOf(Math.max(...supplierSolution.x));
  const hasShortfall = supplierSolution.shortfall > 1e-6;
  // Revenue can only come from what suppliers can actually deliver
  // (target), not the raw forecast demand — using `demand` here would
  // count phantom units no supplier could source.
  const revenue = priceResult.optimalPrice * supplierSolution.target;
  const margin = revenue - supplierSolution.totalCost;

  return (
    <div>
      <div className="mb-1 font-mono text-[0.7rem] tracking-wider uppercase text-accent">Stage 04 · Step 8</div>
      <h1 className="font-display italic text-[2.5rem] leading-[1.02] tracking-[-0.02em] mb-3">Decision engine</h1>
      <p className="text-[0.9rem] text-ink-muted max-w-xl mb-6">
        {activeEntity ? `For ${activeEntity}, over` : "Over"} the next {horizon} days: forecast, sourcing, price
        and a KKT-verified proof, merged into one recommendation.
      </p>

      <div className="grid sm:grid-cols-4 gap-4 mb-8">
        <div className="glass rounded-2xl p-4">
          <div className="font-mono text-[0.62rem] uppercase text-ink-muted mb-1">Forecast</div>
          <div className="text-[1.3rem] font-semibold text-accent tabular">
            {dStarDaily !== null ? <AnimatedNumber value={dStarDaily} format={(v) => v.toFixed(0)} /> : "—"}
          </div>
          <div className="text-[0.72rem] text-ink-muted">units/period</div>
        </div>
        <div className="glass rounded-2xl p-4">
          <div className="font-mono text-[0.62rem] uppercase text-ink-muted mb-1">Sourcing</div>
          <div className="text-[1.1rem] font-semibold text-ink truncate">{groups[topIdx]?.name ?? "—"}</div>
          <div className={`text-[0.72rem] ${hasShortfall ? "text-warning" : "text-ink-muted"}`}>
            {hasShortfall
              ? `${Math.round(supplierSolution.target).toLocaleString()} of ${Math.round(supplierSolution.demand).toLocaleString()} sourceable`
              : `${supplierSolution.x.filter((v) => v > 1e-3).length} suppliers used`}
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

      <SectionLabel>Expected economics (next period)</SectionLabel>
      <div className="grid sm:grid-cols-3 gap-8">
        <div>
          <div className="font-mono text-[0.65rem] uppercase text-ink-muted">Est. revenue</div>
          <div className="text-[1.15rem] font-semibold tabular">
            $<AnimatedNumber value={revenue} format={(v) => v.toLocaleString(undefined, { maximumFractionDigits: 0 })} />
          </div>
        </div>
        <div>
          <div className="font-mono text-[0.65rem] uppercase text-ink-muted">Est. procurement cost</div>
          <div className="text-[1.15rem] font-semibold tabular">
            $<AnimatedNumber value={supplierSolution.totalCost} format={(v) => v.toLocaleString(undefined, { maximumFractionDigits: 0 })} />
          </div>
        </div>
        <div>
          <div className="font-mono text-[0.65rem] uppercase text-ink-muted">Est. gross margin</div>
          <div className="text-[1.15rem] font-semibold tabular text-accent">
            $<AnimatedNumber value={margin} format={(v) => v.toLocaleString(undefined, { maximumFractionDigits: 0 })} />
          </div>
        </div>
      </div>

      {hasShortfall && (
        <div className="mt-8">
          <Chip
            tone="warning"
            label={`Capacity-constrained: only ${Math.round(supplierSolution.target).toLocaleString()} of ${Math.round(supplierSolution.demand).toLocaleString()} forecast units are sourceable — revenue and margin above reflect what suppliers can actually deliver, not the full forecast`}
          />
        </div>
      )}

      <div className="mt-8">
        <Callout>
          Feedback loop: once realised sales for this period are recorded, they'd be appended to
          the Data layer, re-weighting Step 2 and refreshing every model above.
        </Callout>
      </div>
    </div>
  );
}
