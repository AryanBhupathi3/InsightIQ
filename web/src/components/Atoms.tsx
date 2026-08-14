import { motion } from "framer-motion";
import type { ReactNode } from "react";
import AnimatedNumber from "./AnimatedNumber";

export interface StatItem {
  label: string;
  /** Static text (supplier names, "6 of 10") — rendered as-is, no animation. */
  value?: string;
  /** A real number — rendered as a count-up tween instead of a snap-in. */
  numeric?: number;
  format?: (v: number) => string;
  sub?: string;
  tone?: "ink" | "accent";
}

export function Stat({ label, value, numeric, format, sub, tone = "ink" }: StatItem) {
  return (
    <div>
      <div className="font-mono text-[0.65rem] tracking-wider uppercase text-ink-muted">{label}</div>
      <div className={`text-[1.7rem] font-bold tracking-[-0.02em] tabular ${tone === "accent" ? "text-accent" : "text-ink"}`}>
        {numeric !== undefined ? <AnimatedNumber value={numeric} format={format} /> : value}
      </div>
      {sub && <div className="text-[0.72rem] text-ink-muted mt-0.5">{sub}</div>}
    </div>
  );
}

export function StatRow({ items }: { items: StatItem[] }) {
  return (
    <div className="flex flex-wrap gap-x-8 gap-y-4">
      {items.map((it) => (
        <Stat key={it.label} {...it} />
      ))}
    </div>
  );
}

export function Chip({ label, tone }: { label: string; tone: "good" | "warning" | "critical" | "neutral" }) {
  const toneClass = {
    good: "bg-good/15 text-good border-good/40",
    warning: "bg-warning/15 text-warning border-warning/40",
    critical: "bg-critical/15 text-critical border-critical/40",
    neutral: "bg-surface-raised text-ink-soft border-border-strong",
  }[tone];
  return (
    <span className={`inline-flex items-center gap-1.5 rounded-full border px-2.5 py-1 font-mono text-[0.68rem] font-medium ${toneClass}`}>
      <span className="w-1.5 h-1.5 rounded-full bg-current" />
      {label}
    </span>
  );
}

export function StatusRow({ ok, label, detail }: { ok: boolean; label: string; detail: string }) {
  return (
    <div className="flex items-center gap-2 py-1 text-[0.84rem]">
      <span className={`w-1.5 h-1.5 rounded-full ${ok ? "bg-good" : "bg-warning"}`} />
      <span className="text-ink">{label}</span>
      <span className="font-mono text-[0.72rem] text-ink-muted">{ok ? "pass" : "check"} · {detail}</span>
    </div>
  );
}

export function SectionLabel({ children }: { children: ReactNode }) {
  return (
    <div className="flex items-center gap-3 mt-9 mb-3">
      <span className="font-mono text-[0.68rem] tracking-wider uppercase text-ink-muted whitespace-nowrap">{children}</span>
      <span className="h-px flex-1 bg-border" />
    </div>
  );
}

export function Reveal({ children, delay = 0, className = "" }: { children: ReactNode; delay?: number; className?: string }) {
  return (
    <motion.div
      initial={{ opacity: 0, y: 10 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ type: "spring", bounce: 0, duration: 0.5, delay }}
      className={className}
    >
      {children}
    </motion.div>
  );
}

export function Panel({ children, className = "" }: { children: ReactNode; className?: string }) {
  return <div className={`glass rounded-2xl p-5 ${className}`}>{children}</div>;
}

export function Callout({ children }: { children: ReactNode }) {
  return (
    <div className="glass text-[0.85rem] text-ink-soft leading-relaxed rounded-2xl px-4 py-3.5">
      {children}
    </div>
  );
}

export function LockIcon({ className = "" }: { className?: string }) {
  return (
    <svg viewBox="0 0 16 16" fill="none" className={className} aria-hidden="true">
      <rect x="3" y="7" width="10" height="7" rx="1.5" stroke="currentColor" strokeWidth="1.3" />
      <path d="M5.5 7V5a2.5 2.5 0 0 1 5 0v2" stroke="currentColor" strokeWidth="1.3" strokeLinecap="round" />
    </svg>
  );
}

export function LockedPanel({ label }: { label: string }) {
  return (
    <div className="relative rounded-3xl overflow-hidden min-h-[440px] flex items-center justify-center">
      {/* frosted-glass scrim over a faint hint of structure — materials: dim to focus */}
      <div
        className="absolute inset-0"
        style={{
          background:
            "linear-gradient(135deg, color-mix(in oklab, var(--color-surface) 75%, transparent), color-mix(in oklab, var(--color-surface-raised) 60%, transparent))",
          backdropFilter: "blur(28px) saturate(160%)",
          border: "1px solid var(--color-border-strong)",
        }}
      />
      <div
        className="absolute -top-24 -right-24 w-72 h-72 rounded-full pointer-events-none"
        style={{ background: "radial-gradient(circle, color-mix(in oklab, var(--color-accent) 22%, transparent), transparent 70%)" }}
      />
      <motion.div
        initial={{ opacity: 0, y: 8 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ type: "spring", bounce: 0, duration: 0.5 }}
        className="relative flex flex-col items-center text-center gap-4 px-6"
      >
        <div
          className="w-14 h-14 rounded-full flex items-center justify-center text-accent"
          style={{
            background: "color-mix(in oklab, var(--color-accent) 12%, transparent)",
            border: "1px solid var(--color-accent-ring)",
            boxShadow: "0 0 24px -4px var(--color-accent-ring)",
          }}
        >
          <LockIcon className="w-5 h-5" />
        </div>
        <div className="text-[1.1rem] font-semibold tracking-[-0.01em]">{label}</div>
        <p className="text-[0.84rem] text-ink-muted max-w-xs leading-relaxed">
          This stage is built and ready — held back for the review walkthrough.
        </p>
      </motion.div>
    </div>
  );
}

export function EmptyState({ message, onGoToData }: { message: string; onGoToData: () => void }) {
  return (
    <div className="glass rounded-3xl px-6 py-12 flex flex-col items-center text-center gap-4">
      <div className="w-10 h-10 rounded-full border border-border-strong bg-surface-inset/60 flex items-center justify-center text-ink-muted text-lg">
        !
      </div>
      <p className="text-[0.88rem] text-ink-soft max-w-sm leading-relaxed">{message}</p>
      <button
        onClick={onGoToData}
        className="pressable text-[0.84rem] font-semibold px-5 py-2.5 rounded-full bg-accent text-bg hover:bg-accent-hover transition-[background-color] duration-150 cursor-pointer"
        style={{ boxShadow: "0 4px 20px -4px var(--color-accent-ring)" }}
      >
        Go to the Data tab →
      </button>
    </div>
  );
}
