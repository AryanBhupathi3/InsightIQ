import type { WorkbenchShared } from "../../pages/Workbench";
import { SectionLabel, StatRow, EmptyState } from "../Atoms";
import FormulaBlock from "../FormulaBlock";
import { ComposedChart, Line, Area, XAxis, YAxis, Tooltip, ResponsiveContainer, CartesianGrid, Legend } from "recharts";

export default function ForecastTab({ dataset, series, wls, forecast, horizon, setHorizon, dStarDaily, mapping, goToData }: WorkbenchShared) {
  if (!series || series.y.length < 3 || !wls || !forecast) {
    return (
      <EmptyState
        onGoToData={goToData}
        message={
          dataset
            ? "This file doesn't have a demand/quantity column mapped yet (or not enough rows to fit a trend). Fine-tune the mapping on the Data tab."
            : "No dataset loaded. Pick a sample or upload a CSV on the Data tab to run the forecast."
        }
      />
    );
  }

  const chartData = [
    ...series.y.map((y, i) => ({ idx: i, actual: y, fitted: wls.fitted[i] })),
    ...forecast.point.map((p, i) => ({
      idx: series.t.length + i,
      forecast: p,
      bandBase: p - forecast.band[i],
      bandWidth: forecast.band[i] * 2,
    })),
  ];

  return (
    <div>
      <div className="mb-1 font-mono text-[0.7rem] tracking-wider uppercase text-accent">Stage 02 · Step 3</div>
      <h1 className="font-display italic text-[2.5rem] leading-[1.02] tracking-[-0.02em] mb-3">Demand forecasting</h1>
      <p className="text-[0.9rem] text-ink-muted max-w-xl mb-6">
        Weighted Least Squares fits a trend to {mapping.demand ?? "the demand column"}, producing
        the expected demand D* the Optimization stage runs against.
      </p>

      <div className="grid lg:grid-cols-[1fr_2fr] gap-8">
        <div>
          <label className="block mb-5">
            <div className="flex justify-between font-mono text-[0.65rem] uppercase text-ink-muted mb-1">
              <span>Forecast horizon</span><span className="tabular">{horizon}</span>
            </div>
            <input type="range" min={7} max={90} value={horizon} onChange={(e) => setHorizon(+e.target.value)} className="w-full accent-accent" />
          </label>
          <FormulaBlock label="Weighted least squares" tex="\hat\beta = (X^\top W X)^{-1} X^\top W y" />
          <FormulaBlock label="Forecast" tex="D(t) = \beta_0 + \beta_1 t \qquad D^\star = D(T+\tau)" />
        </div>
        <div className="h-80">
          <ResponsiveContainer width="100%" height="100%">
            <ComposedChart data={chartData}>
              <CartesianGrid stroke="var(--color-border)" vertical={false} />
              <XAxis dataKey="idx" stroke="var(--color-ink-faint)" fontSize={11} tickLine={false} />
              <YAxis stroke="var(--color-ink-faint)" fontSize={11} tickLine={false} />
              <Tooltip contentStyle={{ background: "var(--color-surface-raised)", border: "1px solid var(--color-border-strong)", borderRadius: 8, fontSize: 12 }} />
              <Legend wrapperStyle={{ fontSize: 12 }} />
              <Area dataKey="bandBase" stackId="band" stroke="none" fill="transparent" isAnimationActive={false} legendType="none" />
              <Area dataKey="bandWidth" stackId="band" stroke="none" fill="var(--color-accent)" fillOpacity={0.1} isAnimationActive={false} name="90% band" />
              <Line type="monotone" dataKey="actual" stroke="var(--color-series-1)" strokeWidth={1.4} dot={false} name="Actual" />
              <Line type="monotone" dataKey="fitted" stroke="var(--color-series-3)" strokeWidth={1.8} dot={false} name="WLS fit" />
              <Line type="monotone" dataKey="forecast" stroke="var(--color-accent)" strokeWidth={2.2} dot={false} name="Forecast D*" />
            </ComposedChart>
          </ResponsiveContainer>
        </div>
      </div>

      <SectionLabel>Result</SectionLabel>
      <StatRow
        items={[
          { label: "D* end of horizon", value: dStarDaily!.toFixed(1), sub: "per period", tone: "accent" },
          { label: "Avg over horizon", value: (forecast.point.reduce((a, b) => a + b, 0) / forecast.point.length).toFixed(1) },
          { label: "Trend slope β₁", value: wls.slope.toFixed(3) },
          { label: "Residual σ", value: wls.residualStd.toFixed(2) },
        ]}
      />
    </div>
  );
}
