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
    <div className="min-h-screen bg-bg">
      <nav className="max-w-6xl mx-auto px-6 sm:px-10 py-6 flex items-center justify-between">
        <div className="flex items-center gap-2">
          <span className="w-2 h-2 rounded-sm bg-accent" />
          <span className="font-semibold text-[0.95rem]">InsightIQ</span>
        </div>
        <Link
          to="/app"
          className="text-[0.82rem] font-medium px-3.5 py-1.5 rounded-full bg-accent text-bg hover:bg-accent-hover transition-colors"
        >
          Open the workbench
        </Link>
      </nav>

      <header className="max-w-6xl mx-auto px-6 sm:px-10 pt-10 pb-20 grid lg:grid-cols-[1.1fr_0.9fr] gap-14 items-center">
        <div>
          <Reveal>
            <span className="font-mono text-[0.7rem] tracking-wider uppercase text-accent">
              A mathematical decision engine
            </span>
          </Reveal>
          <Reveal delay={0.06}>
            <h1 className="font-display italic text-[3.4rem] sm:text-[4.4rem] leading-[0.95] mt-3 mb-5 text-balance">
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
                className="text-[0.88rem] font-medium px-5 py-2.5 rounded-full bg-accent text-bg hover:bg-accent-hover transition-colors"
              >
                Bring your own CSV →
              </Link>
              <span className="text-[0.8rem] text-ink-muted">or start from a sample dataset</span>
            </div>
          </Reveal>
        </div>

        <motion.div initial={{ opacity: 0, scale: 0.97 }} animate={{ opacity: 1, scale: 1 }} transition={{ duration: 0.6, delay: 0.15 }}>
          <LiveDemo />
        </motion.div>
      </header>

      <section className="max-w-6xl mx-auto px-6 sm:px-10 pb-24">
        <Reveal>
          <div className="font-mono text-[0.68rem] tracking-wider uppercase text-ink-muted mb-6">
            The pipeline — four stages, eight steps
          </div>
        </Reveal>
        <div className="grid sm:grid-cols-2 gap-x-10 gap-y-8">
          {STEPS.map((s, i) => (
            <Reveal key={s.n} delay={0.05 * i}>
              <div className="flex gap-4">
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
