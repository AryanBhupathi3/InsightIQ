/** Step 7 — Price optimization via gradient ascent on profit, using D*
 *  (Step 3) and the procurement cost (Step 5) as inputs.
 *
 *  Demand:  D(p) = D* * (p / p_ref) ^ (-epsilon)      [constant elasticity]
 *  Profit:  Pi(p) = (p - c) * D(p)
 *
 *  The ascent step is applied multiplicatively (price-scaled) so its speed
 *  doesn't depend on the raw magnitude of D — this is dPi/dp divided by the
 *  positive factor D(p)*p, a standard preconditioning move that leaves the
 *  fixed point (dPi/dp = 0) unchanged. The closed-form monopoly-markup
 *  optimum p* = epsilon*c/(epsilon-1) is computed alongside purely to
 *  verify the ascent converged to the right place. */

export interface PricingResult {
  priceHistory: number[];
  profitHistory: number[];
  optimalPrice: number;
  optimalProfit: number;
  closedFormPrice: number;
  convergedAt: number;
}

export const demandAt = (p: number, dStar: number, pRef: number, epsilon: number) => dStar * Math.pow(p / pRef, -epsilon);

export const profitAt = (p: number, cost: number, dStar: number, pRef: number, epsilon: number) =>
  (p - cost) * demandAt(p, dStar, pRef, epsilon);

export function gradientAscent(
  cost: number,
  dStar: number,
  pRef: number,
  epsilon = 1.8,
  lr = 0.15,
  nIter = 60,
  tol = 1e-2
): PricingResult {
  let p = cost * 1.3;
  const priceHistory = [p];
  const profitHistory = [profitAt(p, cost, dStar, pRef, epsilon)];
  let convergedAt = nIter;

  for (let k = 0; k < nIter; k++) {
    const direction = 1 - (epsilon * (p - cost)) / p;
    const pNext = Math.max(p + lr * p * direction, cost * 1.001);
    priceHistory.push(pNext);
    profitHistory.push(profitAt(pNext, cost, dStar, pRef, epsilon));
    if (Math.abs(pNext - p) < tol && convergedAt === nIter) convergedAt = k;
    p = pNext;
  }

  const closedFormPrice = (epsilon * cost) / (epsilon - 1);

  return {
    priceHistory,
    profitHistory,
    optimalPrice: priceHistory[priceHistory.length - 1],
    optimalProfit: profitHistory[profitHistory.length - 1],
    closedFormPrice,
    convergedAt,
  };
}
