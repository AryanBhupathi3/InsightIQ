import { useEffect, useMemo, useRef, useState } from "react";
import { motion } from "framer-motion";
import { gradientAscent, profitAt } from "../lib/pricing";

function randomRun() {
  const cost = 30 + Math.random() * 40;
  const epsilon = 1.5 + Math.random() * 1.2;
  const dStar = 2000 + Math.random() * 3000;
  const pRef = cost * 1.6;
  const result = gradientAscent(cost, dStar, pRef, epsilon, 0.15, 46);
  return { cost, epsilon, dStar, pRef, result };
}

const W = 460, H = 200, PAD = 18;

export default function LiveDemo() {
  const [run, setRun] = useState(randomRun);
  const [step, setStep] = useState(0);
  const timer = useRef<number | null>(null);

  useEffect(() => {
    setStep(0);
    let i = 0;
    timer.current = window.setInterval(() => {
      i++;
      if (i > run.result.priceHistory.length - 1) {
        window.clearInterval(timer.current!);
        window.setTimeout(() => setRun(randomRun()), 1400);
        return;
      }
      setStep(i);
    }, 55);
    return () => { if (timer.current) window.clearInterval(timer.current); };
  }, [run]);

  const { pathD, dotPositions } = useMemo(() => {
    const { cost, dStar, pRef, epsilon } = run;
    const pMax = cost * 3.2;
    const pts: [number, number][] = [];
    const N = 60;
    for (let i = 0; i <= N; i++) {
      const p = cost * 1.02 + (pMax - cost * 1.02) * (i / N);
      pts.push([p, profitAt(p, cost, dStar, pRef, epsilon)]);
    }
    const yMax = Math.max(...pts.map((p) => p[1])) * 1.08;
    const xScale = (p: number) => PAD + ((p - cost * 1.02) / (pMax - cost * 1.02)) * (W - 2 * PAD);
    const yScale = (v: number) => H - PAD - (v / yMax) * (H - 2 * PAD);
    const d = pts.map((p, i) => `${i === 0 ? "M" : "L"} ${xScale(p[0]).toFixed(1)} ${yScale(p[1]).toFixed(1)}`).join(" ");
    const dotPositions = run.result.priceHistory.map((p, i) => [xScale(p), yScale(run.result.profitHistory[i])] as [number, number]);
    return { pathD: d, dotPositions };
  }, [run]);

  const dot = dotPositions[Math.min(step, dotPositions.length - 1)];
  const price = run.result.priceHistory[Math.min(step, run.result.priceHistory.length - 1)];
  const profit = run.result.profitHistory[Math.min(step, run.result.profitHistory.length - 1)];
  const done = step >= run.result.priceHistory.length - 1;

  return (
    <div className="rounded-xl border border-border bg-surface/60 backdrop-blur-sm p-5">
      <div className="flex items-center justify-between mb-1">
        <span className="font-mono text-[0.65rem] tracking-wider uppercase text-ink-muted">
          live — gradient ascent on Π(p)
        </span>
        <span className={`font-mono text-[0.65rem] uppercase ${done ? "text-good" : "text-accent"}`}>
          {done ? "converged" : "solving…"}
        </span>
      </div>
      <svg viewBox={`0 0 ${W} ${H}`} className="w-full h-auto overflow-visible">
        <path d={pathD} fill="none" stroke="var(--color-series-1)" strokeWidth={1.6} opacity={0.55} />
        {dot && (
          <motion.circle
            r={4.5}
            fill="var(--color-accent)"
            initial={false}
            animate={{ x: dot[0], y: dot[1] }}
            transition={{ duration: 0.05, ease: "linear" }}
          />
        )}
      </svg>
      <div className="flex items-center gap-6 mt-2">
        <div>
          <div className="font-mono text-[0.62rem] uppercase text-ink-muted">price</div>
          <div className="font-semibold tabular text-ink">${price.toFixed(2)}</div>
        </div>
        <div>
          <div className="font-mono text-[0.62rem] uppercase text-ink-muted">profit</div>
          <div className="font-semibold tabular text-ink">${profit.toFixed(0)}</div>
        </div>
        <div>
          <div className="font-mono text-[0.62rem] uppercase text-ink-muted">step</div>
          <div className="font-semibold tabular text-ink">{step}/{run.result.priceHistory.length - 1}</div>
        </div>
      </div>
    </div>
  );
}
