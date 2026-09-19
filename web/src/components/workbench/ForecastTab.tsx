import type { WorkbenchShared } from "../../pages/Workbench";
import { SectionLabel, StatRow, EmptyState, VerdictPanel } from "../Atoms";
import AnimatedNumber from "../AnimatedNumber";
import Disclosure from "../Disclosure";
import FormulaBlock from "../FormulaBlock";
import { STATES } from "../../lib/markov";
import { ComposedChart, Line, Area, XAxis, YAxis, Tooltip, ResponsiveContainer, CartesianGrid, Legend } from "recharts";

const num = (v: number) => v.toFixed(1);
const whole = (v: number) => v.toFixed(0);

export default function ForecastTab({ dataset, series, wls, wlsBaseline, forecast, horizon, setHorizon, mapping, goToData }: WorkbenchShared) {
  if (!series || !forecast) {
    return (
      <EmptyState
        onGoToData={goToData}
        message={
          dataset
            ? "This file needs a demand/quantity column mapped and at least 6 periods of history — the forecast learns from how demand actually moved in the past, so it needs a past to learn from. Fine-tune the mapping on the Data tab."
            : "No dataset loaded. Pick a sample or upload a CSV on the Data tab to run the forecast."
        }
      />
    );
  }

  const lastIdx = series.t.length - 1;

  // Only a trailing window of history is charted: on a multi-year series the
  // forecast fan would otherwise be squeezed into a few pixels at the right
  // edge, hiding the one thing this tab exists to show.
  const historyStart = Math.max(0, series.y.length - Math.max(60, horizon * 2));

  // History, then the forecast fan. The fan is seeded at the last actual
  // point with zero width so it visibly grows out of where demand is today
  // rather than floating detached above the history.
  const chartData = [
    ...series.y.slice(historyStart).map((y, offset) => ({
      idx: historyStart + offset,
      actual: y,
      ...(historyStart + offset === lastIdx
        ? {
            median: forecast.anchor,
            lo90: forecast.anchor,
            band05_25: 0,
            band25_75: 0,
            band75_95: 0,
            baseline: wls ? wls.intercept + wls.slope * series.t[lastIdx] : undefined,
          }
        : {}),
    })),
    ...forecast.median.map((m, i) => ({
      idx: lastIdx + 1 + i,
      median: m,
      lo90: forecast.p05[i],
      band05_25: forecast.p25[i] - forecast.p05[i],
      band25_75: forecast.p75[i] - forecast.p25[i],
      band75_95: forecast.p95[i] - forecast.p75[i],
      baseline: wlsBaseline ? wlsBaseline.point[i] : undefined,
    })),
  ];

  const end = forecast.median.length - 1;
  const medianEnd = forecast.median[end];
  const lowEnd = forecast.p05[end];
  const highEnd = forecast.p95[end];
  const widthStart = forecast.p95[0] - forecast.p05[0];
  const widthEnd = highEnd - lowEnd;
  const regime = STATES[forecast.currentState];
  const direction =
    medianEnd > forecast.anchor * 1.05 ? "drifts higher" : medianEnd < forecast.anchor * 0.95 ? "drifts lower" : "holds roughly level";
  const minAnalogs = Math.min(...forecast.analogCounts);
  // Over short horizons the range can come out flat — day-to-day swings are
  // already wide, so another few days adds little. Say what's true rather
  // than asserting it always fans out.
  const widens = widthEnd > widthStart * 1.05;

  return (
    <div>
      <div className="mb-1 font-mono text-[0.7rem] tracking-wider uppercase text-accent">Stage 02 · Step 3</div>
      <h1 className="font-display italic text-[2.5rem] leading-[1.02] tracking-[-0.02em] mb-3">Demand forecasting</h1>
      <p className="text-[0.9rem] text-ink-muted max-w-xl mb-6">
        InsightIQ projects {mapping.demand ?? "your demand column"} forward as a range of plausible outcomes —
        not a single number it can't actually promise.
      </p>

      <VerdictPanel tone="info" headline={`Expect somewhere between ${whole(lowEnd)} and ${whole(highEnd)} units.`}>
        Demand is currently in its <strong>{regime}</strong> band, sitting at{" "}
        <AnimatedNumber value={forecast.anchor} format={num} /> units. Looking {horizon} days out, the most likely
        level is about <AnimatedNumber value={medianEnd} format={num} /> units per period — the path{" "}
        {direction} from here — but every previous time demand sat in this band it ended up anywhere from{" "}
        <AnimatedNumber value={lowEnd} format={num} /> to <AnimatedNumber value={highEnd} format={num} />.{" "}
        {widens
          ? "That range widens the further ahead you look, because the further out you go the less today's demand tells you."
          : "That range stays about as wide across this horizon — day-to-day swings in this data are already large, so looking a little further out adds little extra uncertainty."}
      </VerdictPanel>

      <SectionLabel>Forecast</SectionLabel>
      <div className="grid lg:grid-cols-[1fr_2fr] gap-8">
        <div>
          <label className="block mb-5">
            <div className="flex justify-between font-mono text-[0.65rem] uppercase text-ink-muted mb-1">
              <span>Forecast horizon</span><span className="tabular">{horizon}</span>
            </div>
            <input type="range" min={7} max={90} value={horizon} onChange={(e) => setHorizon(+e.target.value)} className="w-full accent-accent" />
          </label>
          <StatRow
            items={[
              { label: "Most likely D*", numeric: medianEnd, format: num, sub: `per period, day ${horizon}`, tone: "accent" },
              { label: "90% range", value: `${whole(lowEnd)} – ${whole(highEnd)}`, sub: "units per period" },
              { label: "Current regime", value: regime },
              { label: "Range width", value: `${whole(widthStart)} → ${whole(widthEnd)}`, sub: `day 1 → day ${horizon}` },
            ]}
          />
        </div>
        <div className="h-80">
          <ResponsiveContainer width="100%" height="100%">
            <ComposedChart data={chartData}>
              <CartesianGrid stroke="var(--color-border)" vertical={false} />
              <XAxis dataKey="idx" stroke="var(--color-ink-faint)" fontSize={11} tickLine={false} />
              <YAxis stroke="var(--color-ink-faint)" fontSize={11} tickLine={false} />
              <Tooltip contentStyle={{ background: "var(--color-surface-raised)", border: "1px solid var(--color-border-strong)", borderRadius: 8, fontSize: 12 }} />
              <Legend wrapperStyle={{ fontSize: 12 }} />
              {/* Fan chart: stacked transparent base + three ribbons, so the
                  50% core reads darker than the 90% outer range. */}
              <Area dataKey="lo90" stackId="fan" stroke="none" fill="transparent" isAnimationActive={false} legendType="none" name="" />
              <Area dataKey="band05_25" stackId="fan" stroke="none" fill="var(--color-accent)" fillOpacity={0.1} isAnimationActive={false} name="90% range" legendType="rect" />
              <Area dataKey="band25_75" stackId="fan" stroke="none" fill="var(--color-accent)" fillOpacity={0.22} isAnimationActive={false} name="50% range" legendType="rect" />
              <Area dataKey="band75_95" stackId="fan" stroke="none" fill="var(--color-accent)" fillOpacity={0.1} isAnimationActive={false} legendType="none" name="" />
              <Line type="monotone" dataKey="actual" stroke="var(--color-series-1)" strokeWidth={1.4} dot={false} name="Actual" />
              <Line type="monotone" dataKey="baseline" stroke="var(--color-ink-faint)" strokeWidth={1.2} strokeDasharray="4 4" dot={false} name="Regression baseline" />
              <Line type="monotone" dataKey="median" stroke="var(--color-accent)" strokeWidth={2.2} dot={false} name="Most likely" />
            </ComposedChart>
          </ResponsiveContainer>
        </div>
      </div>

      <SectionLabel>The proof</SectionLabel>
      <Disclosure label="How did we determine this?">
        <p className="text-[0.86rem] text-ink-soft leading-relaxed max-w-2xl mb-4">
          InsightIQ doesn't fit a trend line and read a number off it. It sorts every past period into the same
          Low / Medium / High demand bands the uncertainty stage uses, then asks a question the data can answer
          directly: <em>every previous time demand sat in the band it's in today, what did demand actually do over
          the next {horizon} days?</em> Those real outcomes, stacked up, are the forecast — the dark ribbon is
          where half of them landed, the light ribbon where 90% landed.
        </p>
        <p className="text-[0.82rem] text-ink-muted leading-relaxed max-w-2xl mb-5">
          That's why the projection isn't a straight line. A regression fixes one slope and marches off in a
          straight line forever, implying it knows day {horizon} exactly as well as day 1 — the dashed grey line
          shows what it would have claimed here. The ribbon bends instead, because it traces what demand really
          did from this point, and its width moves from {whole(widthStart)} units on day 1 to {whole(widthEnd)}{" "}
          on day {horizon}
          {widens ? ", widening as the future gets harder to pin down" : " — flat over a horizon this short, since the day-to-day swing in this data is already wide"}
          . Nothing here is tuned or assumed: every value in the band is a change that genuinely happened in
          your data, so the forecast can't drift off to a level demand has never reached.
        </p>
        <StatRow
          items={[
            { label: "Historical analogues", numeric: forecast.analogCounts[0], format: whole, sub: "matching periods, day 1" },
            { label: "Thinnest sample", numeric: minAnalogs, format: whole, sub: `across all ${horizon} days` },
          ]}
        />
        <div className="space-y-3 mt-4">
          <FormulaBlock
            label="Demand bands (terciles of your own history)"
            tex="S_t=\begin{cases}\text{Low}&y_t\le q_{1/3}\\\text{Med}&y_t\le q_{2/3}\\\text{High}&\text{otherwise}\end{cases}"
          />
          <FormulaBlock
            label="What demand did, every time it was in today's band"
            tex="\mathcal{A}_h=\{\,y_{t+h}-y_t \;:\; S_t = S_T\,\}"
          />
          <FormulaBlock
            label="Forecast range — the p-th percentile of those real outcomes"
            tex="\hat{y}^{(p)}_{T+h} = y_T + Q_p(\mathcal{A}_h),\qquad p\in\{0.05,\,0.25,\,0.5,\,0.75,\,0.95\}"
          />
        </div>
        {forecast.usedFallback && (
          <p className="text-[0.78rem] text-ink-muted leading-relaxed max-w-2xl mt-4">
            Note: at some horizons this dataset had too few same-band periods to be reliable, so those fall back
            to every historical period regardless of band.
          </p>
        )}
      </Disclosure>
    </div>
  );
}
