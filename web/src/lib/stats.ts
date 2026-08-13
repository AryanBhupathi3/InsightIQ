/** Step 3 — Weighted Least Squares demand forecast.
 *  Fits demand(t) = b0 + b1*t via the explicit weighted normal equations
 *  beta = (X^T W X)^-1 X^T W y, with recency weights w_t = 0.5^((T-t)/halflife)
 *  so recent periods pull the trend harder than old ones. */

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

export function forecastHorizon(result: WlsResult, tLast: number, horizon: number) {
  const tFuture: number[] = [];
  const point: number[] = [];
  const band: number[] = [];
  for (let h = 1; h <= horizon; h++) {
    const tf = tLast + h;
    tFuture.push(tf);
    point.push(result.intercept + result.slope * tf);
    band.push(1.645 * result.residualStd * Math.sqrt(h));
  }
  return { tFuture, point, band };
}
