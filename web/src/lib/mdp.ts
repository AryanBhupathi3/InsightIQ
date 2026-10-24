/** Step 4b — a Markov Decision Process for the reorder decision.
 *
 *  The Markov chain in markov.ts predicts demand's next state; it never
 *  decides anything. This adds a genuine decision on top: at each
 *  inventory level, choose to Reorder or Hold, and solve for the policy
 *  that maximizes long-run expected value.
 *
 *  Why this isn't built from Order_Quantity / Inventory_Level directly:
 *  checked first, and in this dataset they aren't actually causally
 *  linked — tracing a real reorder event (Order_Quantity=470 placed with
 *  14-day lead time) shows inventory declining monotonically for 17+
 *  straight days afterward with no replenishment ever visible. Treating
 *  that column pair as a real transition signal would mean presenting
 *  spurious structure as learned, the same mistake avoided on the buyer
 *  side. Instead, demand draws for the simulation below come from the
 *  SKU's own real historical daily sales (the same series the Forecast
 *  tab uses) — that part is genuinely data-grounded — while the reorder
 *  quantity and the cost weights are explicit, adjustable policy
 *  parameters, the same honest pattern as gamma and epsilon elsewhere.
 *
 *  This also has to be a real action-dependent transition, not a
 *  reward-only one: if the action didn't change what happens next, the
 *  Bellman equation collapses to a one-line per-state comparison and
 *  calling it "value iteration" would be dressing up something trivial.
 *  Here, reordering genuinely changes where you land next period, so
 *  the future actually depends on today's choice — solving it requires
 *  the recursion. */

export type MdpAction = "hold" | "reorder";

export interface MdpState {
  bucket: number;
  level: number; // representative stock level for this bucket, in units
  daysOfAvgDemand: number;
}

export interface MdpPolicyRow {
  state: MdpState;
  action: MdpAction;
  value: number;
  holdValue: number;
  reorderValue: number;
}

export interface MdpResult {
  states: MdpState[];
  policy: MdpPolicyRow[];
  iterations: number;
  converged: boolean;
  avgDemand: number;
  orderQty: number;
}

const K = 7; // inventory buckets, in units of average daily demand
const GAMMA = 0.9; // discount factor — future periods matter, just less than today
const MAX_ITERS = 500;
const TOL = 1e-6;

function bucketOf(level: number, bucketWidth: number): number {
  return Math.max(0, Math.min(K - 1, Math.floor(level / bucketWidth)));
}

export function solveReorderMdp(
  demandHistory: number[],
  orderQtyMult: number,
  holdingCost: number,
  stockoutCost: number,
  orderCost: number
): MdpResult | null {
  if (demandHistory.length < 10) return null;

  const avgDemand = demandHistory.reduce((a, b) => a + b, 0) / demandHistory.length;
  if (avgDemand <= 0) return null;

  const bucketWidth = avgDemand;
  const levelOf = (bucket: number) => (bucket + 0.5) * bucketWidth;
  const orderQty = orderQtyMult * avgDemand;

  const states: MdpState[] = Array.from({ length: K }, (_, b) => ({
    bucket: b,
    level: levelOf(b),
    daysOfAvgDemand: levelOf(b) / avgDemand,
  }));
  const actions: MdpAction[] = ["hold", "reorder"];

  // For every (state, action), the real historical demand draws decide
  // both the expected immediate reward and the distribution over the
  // next state — this is the empirical-bootstrap idea from
  // forecastFromRegimes, applied here to drive a transition model
  // instead of a point forecast.
  const P: Record<string, number[]> = {};
  const R: Record<string, number> = {};
  for (const s of states) {
    for (const a of actions) {
      const startLevel = s.level + (a === "reorder" ? orderQty : 0);
      const counts = new Array(K).fill(0);
      let totalHeld = 0;
      let totalShort = 0;
      for (const d of demandHistory) {
        const next = Math.max(0, startLevel - d);
        counts[bucketOf(next, bucketWidth)] += 1;
        totalHeld += Math.max(0, next);
        totalShort += Math.max(0, d - startLevel);
      }
      const n = demandHistory.length;
      P[`${s.bucket}_${a}`] = counts.map((c) => c / n);
      R[`${s.bucket}_${a}`] = -holdingCost * (totalHeld / n) - stockoutCost * (totalShort / n) - (a === "reorder" ? orderCost : 0);
    }
  }

  const expectedValue = (s: number, a: MdpAction, V: number[]) =>
    R[`${s}_${a}`] + GAMMA * P[`${s}_${a}`].reduce((acc, p, sp) => acc + p * V[sp], 0);

  let V = new Array(K).fill(0);
  let iterations = 0;
  let converged = false;
  for (let it = 0; it < MAX_ITERS; it++) {
    iterations = it + 1;
    const Vnext = states.map((s) => Math.max(expectedValue(s.bucket, "hold", V), expectedValue(s.bucket, "reorder", V)));
    const delta = Math.max(...states.map((_, i) => Math.abs(Vnext[i] - V[i])));
    V = Vnext;
    if (delta < TOL) {
      converged = true;
      break;
    }
  }

  const policy: MdpPolicyRow[] = states.map((s) => {
    const holdValue = expectedValue(s.bucket, "hold", V);
    const reorderValue = expectedValue(s.bucket, "reorder", V);
    return {
      state: s,
      action: reorderValue > holdValue ? "reorder" : "hold",
      value: V[s.bucket],
      holdValue,
      reorderValue,
    };
  });

  return { states, policy, iterations, converged, avgDemand, orderQty };
}
