/** Step 5 — Supplier selection as a constrained convex program:
 *
 *    minimize   sum_i [ price_i * x_i + 0.5 * gamma * x_i^2 ]
 *    subject to sum_i x_i = D*          (meet forecast demand)
 *               0 <= x_i <= capacity_i  (supplier capacity)
 *
 *  Because the objective is separable (each x_i only appears in its own
 *  term) and the only coupling constraint is the linear equality, this has
 *  an exact closed form — the classic "water-filling" solution:
 *
 *    x_i(tau) = clip( (tau - price_i) / gamma,  0,  capacity_i )
 *
 *  for the water level tau chosen so sum_i x_i(tau) = D*. tau is exactly
 *  -lambda, the equality constraint's Lagrange multiplier, so this single
 *  bisection *is* the KKT solve, not an approximation of it — no iterative
 *  gradient descent needed. Cheaper suppliers naturally clear more volume
 *  before hitting their cap, exactly as sourcing intuition says they
 *  should.
 *
 *  The budget is then checked against this (provably minimum-cost) plan:
 *  since x* already achieves the lowest possible cost for hitting D*
 *  exactly, if that cost still exceeds the budget, no reallocation can
 *  help — the configuration is genuinely infeasible, which Step 6 reports
 *  as a KKT/budget failure rather than silently forcing a worse answer. */

export interface SupplierSolution {
  groups: string[];
  x: number[];
  costTerms: number[];
  totalCost: number;
  capacity: number[];
  price: number[];
  gamma: number;
  demand: number;
  budget: number;
  lambda: number; // equality-constraint multiplier (water level)
  feasible: boolean; // whether the min-cost plan fits inside budget
}

export function solveSupplierSelection(
  groups: string[],
  price: number[],
  capacity: number[],
  demand: number,
  budget: number,
  gamma = 0.002
): SupplierSolution {
  const totalCapacity = capacity.reduce((a, b) => a + b, 0);
  const target = Math.min(demand, totalCapacity); // can't allocate past total capacity

  const xAt = (tau: number) => price.map((p, i) => Math.min(Math.max((tau - p) / gamma, 0), capacity[i]));

  let lo = Math.min(...price) - gamma * Math.max(...capacity) - 1;
  let hi = Math.max(...price) + gamma * Math.max(...capacity) + 1;
  for (let iter = 0; iter < 100; iter++) {
    const mid = (lo + hi) / 2;
    const sum = xAt(mid).reduce((a, b) => a + b, 0);
    if (sum < target) lo = mid;
    else hi = mid;
  }
  const tau = (lo + hi) / 2;
  const x = xAt(tau);

  const costTerms = x.map((xi, i) => price[i] * xi + 0.5 * gamma * xi * xi);
  const totalCost = costTerms.reduce((a, b) => a + b, 0);

  return {
    groups,
    x,
    costTerms,
    totalCost,
    capacity,
    price,
    gamma,
    demand,
    budget,
    lambda: -tau,
    feasible: totalCost <= budget && target >= demand - 1e-6,
  };
}

export interface KktReport {
  stationarityResidual: number;
  stationarityOk: boolean;
  primalDemandGap: number;
  primalDemandOk: boolean;
  primalCapacityOk: boolean;
  primalBudgetSlack: number;
  primalBudgetOk: boolean;
  dualFeasible: boolean;
  complementarySlacknessResidual: number;
  complementarySlacknessOk: boolean;
  allOk: boolean;
}

export function kktReport(sol: SupplierSolution, tol = 1e-2): KktReport {
  const { x, price, capacity, gamma, lambda, demand, budget, totalCost } = sol;
  const eps = Math.max(1e-6, Math.max(...capacity) * 1e-4);
  const priceScale = Math.max(1, ...price);
  const grad = x.map((xi, i) => price[i] + gamma * xi);

  // x_i has three possible states, each with a different KKT condition —
  // treating all of them as "grad_i + lambda == 0" (as if every supplier
  // were interior) is wrong and fails suppliers correctly priced out at
  // x_i = 0:
  //   interior (0 < x_i < cap_i):  grad_i + lambda  = 0   exactly
  //   at cap_i (upper bound):      grad_i + lambda <= 0   (mu_i = -(…) >= 0)
  //   at 0     (lower bound):      grad_i + lambda >= 0   (nothing to fix)
  const atUpper = x.map((xi, i) => xi >= capacity[i] - eps);
  const atLower = x.map((xi) => xi <= eps);
  const interior = x.map((_, i) => !atUpper[i] && !atLower[i]);
  const mu = x.map((_, i) => (atUpper[i] ? -(grad[i] + lambda) : 0));

  const interiorResiduals = grad.map((g, i) => (interior[i] ? Math.abs(g + lambda) : 0));
  const stationarityResidual = Math.max(0, ...interiorResiduals);

  const lowerBoundViolation = grad.map((g, i) => (atLower[i] && !atUpper[i] ? Math.max(0, -(g + lambda)) : 0));
  const upperBoundViolation = grad.map((g, i) => (atUpper[i] && !atLower[i] ? Math.max(0, g + lambda) : 0));
  const boundaryViolation = Math.max(0, ...lowerBoundViolation, ...upperBoundViolation);

  const primalDemandGap = Math.abs(x.reduce((a, b) => a + b, 0) - demand);
  const primalCapacityOk = x.every((xi, i) => xi <= capacity[i] + eps);
  const primalBudgetSlack = totalCost - budget;
  const slackness = mu.map((m, i) => m * (x[i] - capacity[i]));
  const complementarySlacknessResidual = Math.max(...slackness.map(Math.abs));

  const stationarityOk = stationarityResidual < tol * priceScale && boundaryViolation < tol * priceScale;
  const primalDemandOk = primalDemandGap < tol * Math.max(1, demand);
  const primalBudgetOk = primalBudgetSlack < tol * Math.max(1, budget);
  const dualFeasible = mu.every((m) => m <= tol * priceScale);
  const complementarySlacknessOk = complementarySlacknessResidual < tol * Math.max(1, ...capacity);

  return {
    stationarityResidual,
    stationarityOk,
    primalDemandGap,
    primalDemandOk,
    primalCapacityOk,
    primalBudgetSlack,
    primalBudgetOk,
    dualFeasible,
    complementarySlacknessResidual,
    complementarySlacknessOk,
    allOk: stationarityOk && primalDemandOk && primalCapacityOk && primalBudgetOk && dualFeasible && complementarySlacknessOk,
  };
}
