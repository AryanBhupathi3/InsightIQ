/** Step 3 — demand forecasting.
 *
 *  Two models live here, and only one of them is the forecast:
 *
 *  - fitWls / forecastHorizon: the Weighted Least Squares straight line.
 *    Kept as a *comparison baseline* only — it's drawn faintly on the chart
 *    so you can see what a plain regression would have claimed, but nothing
 *    downstream consumes it.
 *  - forecastFromRegimes: the actual forecast. Non-parametric and anchored
 *    on the Markov demand regimes from markov.ts, it returns a distribution
 *    per future period rather than one number. See its own docs below. */

export interface WlsResult {
  intercept: number;
  slope: number;
  fitted: number[];
  residualStd: number;
  weights: number[];
}

export function recencyWeights(t: number[], halflife: number): number[] {
  const tMax = Math.max(...t);
  return t.map((v) => Math.pow(0.5, (tMax - v) / halflife));
}

function solve2x2(a: number[][], b: number[]): [number, number] {
  const det = a[0][0] * a[1][1] - a[0][1] * a[1][0];
  const x0 = (b[0] * a[1][1] - a[0][1] * b[1]) / det;
  const x1 = (a[0][0] * b[1] - b[0] * a[1][0]) / det;
  return [x0, x1];
}

export function fitWls(t: number[], y: number[], halflife: number): WlsResult {
  const w = recencyWeights(t, halflife);
  // Normal equations for [1, t] design matrix, built directly (2x2 solve)
  // instead of a general matrix library — this system never grows past 2x2.
  let sw = 0, swt = 0, swt2 = 0, swy = 0, swty = 0;
  for (let i = 0; i < t.length; i++) {
    sw += w[i];
    swt += w[i] * t[i];
    swt2 += w[i] * t[i] * t[i];
    swy += w[i] * y[i];
    swty += w[i] * t[i] * y[i];
  }
  const [intercept, slope] = solve2x2([[sw, swt], [swt, swt2]], [swy, swty]);

  const fitted = t.map((v) => intercept + slope * v);
  let sqErr = 0;
  for (let i = 0; i < y.length; i++) sqErr += w[i] * (y[i] - fitted[i]) ** 2;
  const dof = Math.max(y.length - 2, 1);
  const residualVar = (sqErr / sw) * (y.length / dof);

  return { intercept, slope, fitted, residualStd: Math.sqrt(Math.max(residualVar, 0)), weights: w };
}

/** The straight-line baseline, kept only so the chart can show what a plain
 *  regression would have extrapolated. Not the forecast. */
export function forecastHorizon(result: WlsResult, tLast: number, horizon: number) {
  const tFuture: number[] = [];
  const point: number[] = [];
  for (let h = 1; h <= horizon; h++) {
    const tf = tLast + h;
    tFuture.push(tf);
    point.push(result.intercept + result.slope * tf);
  }
  return { tFuture, point };
}

export interface RegimeForecast {
  tFuture: number[];
  /** Quantiles of the forecast distribution, one entry per future period. */
  p05: number[];
  p25: number[];
  median: number[];
  p75: number[];
  p95: number[];
  /** How many historical analogues backed each period's distribution. */
  analogCounts: number[];
  /** True once any period had too few same-regime analogues and had to fall
   *  back to drawing on every period regardless of regime. */
  usedFallback: boolean;
  /** Last observed demand — every path starts here. */
  anchor: number;
  /** Regime (index into markov.STATES) the series is currently in. */
  currentState: number;
}

/** Fewer same-regime analogues than this and a quantile is too thin to trust,
 *  so that period falls back to the unconditional pool. */
const MIN_ANALOGS = 8;

function quantile(sorted: number[], p: number): number {
  const i = Math.round(p * (sorted.length - 1));
  return sorted[Math.min(sorted.length - 1, Math.max(0, i))];
}

/** Step 3 — the forecast proper: a regime-conditioned historical analogue
 *  (empirical bootstrap) forecast.
 *
 *  Rather than fitting a line through time and extrapolating it, this asks a
 *  question the data can answer directly: every previous time demand sat in
 *  the regime it's in today, what did demand actually do over the following
 *  h periods? Those realised changes ARE the forecast distribution —
 *
 *      A_h = { y[t+h] - y[t]  :  state[t] == state[T] }
 *      forecast quantile p at h  =  y[T] + Q_p(A_h)
 *
 *  Consequences, all of which fall out of the data instead of being tuned:
 *   - every period is a distribution, never a single value;
 *   - the spread widens with h, because demand genuinely wandered further
 *     over longer historical windows;
 *   - the centre path bends, because it traces what demand really did from
 *     this regime rather than a constant slope;
 *   - it can't run off to absurd values, since every quantile is a change
 *     that actually happened.
 *
 *  Deterministic: no random sampling, so the same inputs always render the
 *  same chart. `states` is markov.fitMarkov(...).stateSeq — passed in rather
 *  than imported so this module stays free of a markov.ts dependency. */
export function forecastFromRegimes(y: number[], states: number[], horizon: number): RegimeForecast | null {
  if (y.length < 6 || states.length !== y.length || horizon < 1) return null;

  const anchor = y[y.length - 1];
  const currentState = states[states.length - 1];

  const tFuture: number[] = [];
  const p05: number[] = [], p25: number[] = [], median: number[] = [], p75: number[] = [], p95: number[] = [];
  const analogCounts: number[] = [];
  let usedFallback = false;

  for (let h = 1; h <= horizon; h++) {
    const sameRegime: number[] = [];
    const anyRegime: number[] = [];
    for (let t = 0; t + h < y.length; t++) {
      const delta = y[t + h] - y[t];
      anyRegime.push(delta);
      if (states[t] === currentState) sameRegime.push(delta);
    }

    let pool = sameRegime;
    if (pool.length < MIN_ANALOGS) {
      pool = anyRegime;
      usedFallback = true;
    }

    tFuture.push(y.length - 1 + h);
    analogCounts.push(pool.length);

    // Horizons long enough to leave no analogue at all (h close to the series
    // length) hold the previous period's spread rather than inventing one.
    if (pool.length === 0) {
      const prev = median.length - 1;
      p05.push(prev >= 0 ? p05[prev] : anchor);
      p25.push(prev >= 0 ? p25[prev] : anchor);
      median.push(prev >= 0 ? median[prev] : anchor);
      p75.push(prev >= 0 ? p75[prev] : anchor);
      p95.push(prev >= 0 ? p95[prev] : anchor);
      continue;
    }

    const sorted = [...pool].sort((a, b) => a - b);
    // Demand can't go negative, so the band is clamped at zero rather than
    // allowed to imply impossible sales.
    const at = (p: number) => Math.max(0, anchor + quantile(sorted, p));
    p05.push(at(0.05));
    p25.push(at(0.25));
    median.push(at(0.5));
    p75.push(at(0.75));
    p95.push(at(0.95));
  }

  return { tFuture, p05, p25, median, p75, p95, analogCounts, usedFallback, anchor, currentState };
}
