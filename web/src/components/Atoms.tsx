import { motion } from "framer-motion";
import type { ReactNode } from "react";

export function Stat({ label, value, sub, tone = "ink" }: { label: string; value: string; sub?: string; tone?: "ink" | "accent" }) {
  return (
    <div>
      <div className="font-mono text-[0.65rem] tracking-wider uppercase text-ink-muted">{label}</div>
      <div className={`text-[1.35rem] font-semibold tabular ${tone === "accent" ? "text-accent" : "text-ink"}`}>{value}</div>
      {sub && <div className="text-[0.72rem] text-ink-muted mt-0.5">{sub}</div>}
    </div>
  );
}

export function StatRow({ items }: { items: { label: string; value: string; sub?: string; tone?: "ink" | "accent" }[] }) {
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
      transition={{ duration: 0.5, delay, ease: [0.16, 1, 0.3, 1] }}
      className={className}
    >
      {children}
    </motion.div>
  );
}

export function Panel({ children, className = "" }: { children: ReactNode; className?: string }) {
  return <div className={`bg-surface border border-border rounded-xl p-5 ${className}`}>{children}</div>;
}

export function Callout({ children }: { children: ReactNode }) {
  return (
    <div className="text-[0.85rem] text-ink-soft leading-relaxed bg-surface-raised rounded-lg px-4 py-3 border border-border">
      {children}
    </div>
  );
}

export function EmptyState({ message, onGoToData }: { message: string; onGoToData: () => void }) {
  return (
    <div className="border border-dashed border-border-strong rounded-xl px-6 py-10 flex flex-col items-center text-center gap-3">
      <div className="w-9 h-9 rounded-full border border-border-strong flex items-center justify-center text-ink-muted text-lg">
        !
      </div>
      <p className="text-[0.88rem] text-ink-soft max-w-sm">{message}</p>
      <button
        onClick={onGoToData}
        className="text-[0.82rem] font-medium px-4 py-2 rounded-full bg-accent text-bg hover:bg-accent-hover transition-colors cursor-pointer"
      >
        Go to the Data tab →
      </button>
    </div>
  );
}
