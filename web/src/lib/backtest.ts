import { discretize } from "./markov";
import { forecastFromRegimes } from "./stats";

export interface BacktestHorizonStat {
  h: number;
  hit50Rate: number;
  hit90Rate: number;
  n: number;
}

export interface BacktestResult {
  byHorizon: BacktestHorizonStat[];
  totalRuns: number;
  nearHit90Rate: number; // average over the first 7 days ahead
  farHit90Rate: number; // the last day ahead (the full horizon)
}

const MIN_HISTORY_FLOOR = 40;

/** Step 3b — backtesting the forecast against history it didn't get to see.
 *
 *  The fan chart on the Forecast tab always projects into days that haven't
 *  happened yet, so there's no way to check it against reality directly.
 *  This instead replays the exact same method against every past day that
 *  already has `horizon` more days of real data after it: it pretends that
 *  day is "today," builds the forecast using only history up to that point
 *  (recomputing the Low/Medium/High bands from that truncated history too,
 *  so nothing from the future leaks into the thresholds), then checks
 *  whether what actually happened afterward landed inside the claimed
 *  50%/90% bands.
 *
 *  Aggregated across every valid day, "hit rate at h days ahead" is a real,
 *  measured number — not a guess — and it does not have to equal the
 *  claimed 50%/90% exactly; the gap between them is the finding. */
export function runBacktest(y: number[], horizon: number): BacktestResult | null {
  const minHistory = Math.max(MIN_HISTORY_FLOOR, horizon * 2);
  if (y.length < minHistory + horizon + 1) return null;

  const hitCounts = Array.from({ length: horizon }, () => ({ hit50: 0, hit90: 0, n: 0 }));
  let totalRuns = 0;

  for (let cutoff = minHistory; cutoff + horizon < y.length; cutoff++) {
    const yTrunc = y.slice(0, cutoff + 1);
    const { states } = discretize(yTrunc);
    const fc = forecastFromRegimes(yTrunc, states, horizon);
    if (!fc) continue;
    totalRuns++;

    for (let h = 1; h <= horizon; h++) {
      const actual = y[cutoff + h];
      const i = h - 1;
      const bucket = hitCounts[i];
      bucket.n++;
      if (actual >= fc.p25[i] && actual <= fc.p75[i]) bucket.hit50++;
      if (actual >= fc.p05[i] && actual <= fc.p95[i]) bucket.hit90++;
    }
  }

  if (totalRuns === 0) return null;

  const byHorizon: BacktestHorizonStat[] = hitCounts.map((c, i) => ({
    h: i + 1,
    hit50Rate: c.n > 0 ? c.hit50 / c.n : 0,
    hit90Rate: c.n > 0 ? c.hit90 / c.n : 0,
    n: c.n,
  }));

  const nearWindow = byHorizon.slice(0, Math.min(7, horizon));
  const nearHit90Rate = nearWindow.reduce((a, b) => a + b.hit90Rate, 0) / nearWindow.length;
  const farHit90Rate = byHorizon[byHorizon.length - 1].hit90Rate;

  return { byHorizon, totalRuns, nearHit90Rate, farHit90Rate };
}
