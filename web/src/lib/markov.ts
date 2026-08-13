/** Step 4 — Uncertainty modelling via a discrete-time Markov chain over
 *  demand states (Low / Medium / High), estimated from the same series
 *  used for the WLS forecast. */

export const STATES = ["Low", "Medium", "High"] as const;

export interface MarkovResult {
  thresholds: [number, number];
  stateSeq: number[];
  transitionMatrix: number[][];
  steadyState: number[];
}

export function discretize(y: number[]): { states: number[]; thresholds: [number, number] } {
  const sorted = [...y].sort((a, b) => a - b);
  const q = (p: number) => sorted[Math.min(sorted.length - 1, Math.floor(p * (sorted.length - 1)))];
  const q1 = q(1 / 3);
  const q2 = q(2 / 3);
  const states = y.map((v) => (v <= q1 ? 0 : v <= q2 ? 1 : 2));
  return { states, thresholds: [q1, q2] };
}

export function fitMarkov(y: number[]): MarkovResult {
  const { states, thresholds } = discretize(y);
  const counts = [
    [0, 0, 0],
    [0, 0, 0],
    [0, 0, 0],
  ];
  for (let i = 0; i < states.length - 1; i++) counts[states[i]][states[i + 1]] += 1;

  const P = counts.map((row) => {
    const sum = row.reduce((a, b) => a + b, 0);
    return sum === 0 ? [1 / 3, 1 / 3, 1 / 3] : row.map((v) => v / sum);
  });

  return { thresholds, stateSeq: states, transitionMatrix: P, steadyState: steadyState(P) };
}

export function steadyState(P: number[][], iters = 2000): number[] {
  let pi = [1 / 3, 1 / 3, 1 / 3];
  for (let k = 0; k < iters; k++) {
    const next = [0, 0, 0];
    for (let j = 0; j < 3; j++) for (let i = 0; i < 3; i++) next[j] += pi[i] * P[i][j];
    const diff = next.reduce((a, b, i) => a + Math.abs(b - pi[i]), 0);
    pi = next;
    if (diff < 1e-12) break;
  }
  const sum = pi.reduce((a, b) => a + b, 0);
  return pi.map((v) => v / sum);
}

export function nStepDistribution(P: number[][], currentState: number, n: number): number[] {
  let v = [0, 0, 0];
  v[currentState] = 1;
  for (let step = 0; step < n; step++) {
    const next = [0, 0, 0];
    for (let j = 0; j < 3; j++) for (let i = 0; i < 3; i++) next[j] += v[i] * P[i][j];
    v = next;
  }
  return v;
}
