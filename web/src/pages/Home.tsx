import { Link } from "react-router-dom";
import { motion } from "framer-motion";
import LiveDemo from "../components/LiveDemo";
import { Reveal } from "../components/Atoms";

const STEPS = [
  { n: "01", title: "Data layer", desc: "Upload any CSV — sales, procurement, inventory. Columns map to roles; constraints derive from what's actually there." },
  { n: "02", title: "Demand forecast", desc: "Weighted Least Squares fits a recency-weighted trend; a Markov chain models the uncertainty around it." },
  { n: "03", title: "Supplier selection", desc: "A convex program allocates volume across suppliers — solved exactly via water-filling, verified via KKT." },
  { n: "04", title: "Price optimization", desc: "Gradient ascent climbs the profit function to the price that maximizes it, checked against a closed form." },
];

export default function Home() {
  return (
    <div className="min-h-screen">
      <nav className="max-w-6xl mx-auto px-6 sm:px-10 pt-6">
        <div className="glass rounded-full px-5 py-3 flex items-center justify-between">
          <div className="flex items-center gap-2">
            <span className="w-2 h-2 rounded-sm bg-accent" style={{ boxShadow: "0 0 12px -1px var(--color-accent-ring)" }} />
            <span className="font-semibold text-[0.95rem]">InsightIQ</span>
          </div>
          <Link
            to="/app"
            className="pressable text-[0.82rem] font-semibold px-4 py-1.5 rounded-full bg-accent text-bg hover:bg-accent-hover transition-[background-color] duration-150"
            style={{ boxShadow: "0 4px 20px -4px var(--color-accent-ring)" }}
          >
            Open the workbench
          </Link>
        </div>
      </nav>

      <header className="max-w-6xl mx-auto px-6 sm:px-10 pt-14 pb-20 grid lg:grid-cols-[1.1fr_0.9fr] gap-14 items-center">
        <div>
          <Reveal>
            <span className="font-mono text-[0.7rem] tracking-wider uppercase text-accent">
              A mathematical decision engine
            </span>
          </Reveal>
          <Reveal delay={0.06}>
            <h1 className="font-display italic text-[4rem] sm:text-[5.4rem] leading-[0.94] tracking-[-0.03em] mt-3 mb-5 text-balance">
              Sell at the <span className="text-accent">provably optimal</span> price.
            </h1>
          </Reveal>
          <Reveal delay={0.12}>
            <p className="font-mono text-[0.92rem] text-ink-soft leading-relaxed max-w-lg mb-8">
              Upload your own sales or procurement data. InsightIQ forecasts demand, allocates
              volume across suppliers as a convex program, proves that allocation optimal via
              KKT, and climbs to the profit-maximizing price — live, in your browser, on your
              numbers. Nothing here is hardcoded to one dataset.
            </p>
          </Reveal>
          <Reveal delay={0.18}>
            <div className="flex items-center gap-4">
              <Link
                to="/app"
                className="pressable text-[0.9rem] font-semibold px-6 py-3 rounded-full bg-accent text-bg hover:bg-accent-hover transition-[background-color] duration-150"
                style={{ boxShadow: "0 8px 30px -6px var(--color-accent-ring)" }}
              >
                Bring your own CSV →
              </Link>
              <span className="text-[0.8rem] text-ink-muted">or start from a sample dataset</span>
            </div>
          </Reveal>
        </div>

        <motion.div
          initial={{ opacity: 0, scale: 0.97 }}
          animate={{ opacity: 1, scale: 1 }}
          transition={{ type: "spring", bounce: 0, duration: 0.6, delay: 0.15 }}
        >
          <LiveDemo />
        </motion.div>
      </header>

      <section className="max-w-6xl mx-auto px-6 sm:px-10 pb-24">
        <Reveal>
          <div className="font-mono text-[0.68rem] tracking-wider uppercase text-ink-muted mb-6">
            The pipeline — four stages, eight steps
          </div>
        </Reveal>
        <div className="grid sm:grid-cols-2 gap-4">
          {STEPS.map((s, i) => (
            <Reveal key={s.n} delay={0.05 * i}>
              <div className="glass rounded-2xl p-5 flex gap-4 h-full">
                <span className="font-mono text-[0.78rem] text-accent pt-0.5">{s.n}</span>
                <div>
                  <div className="font-semibold text-[0.98rem] mb-1">{s.title}</div>
                  <div className="text-[0.86rem] text-ink-muted leading-relaxed max-w-sm">{s.desc}</div>
                </div>
              </div>
            </Reveal>
          ))}
        </div>
      </section>

      <footer className="max-w-6xl mx-auto px-6 sm:px-10 py-8 border-t border-border flex justify-between font-mono text-[0.68rem] text-ink-faint">
        <span>INSIGHTIQ — MATHEMATICAL DECISION ENGINE</span>
        <span>RUNS ENTIRELY IN YOUR BROWSER</span>
      </footer>
    </div>
  );
}
