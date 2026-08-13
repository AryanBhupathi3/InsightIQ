import { useEffect, useState } from "react";
import { motion } from "framer-motion";
import { useDataset } from "../state/DatasetContext";
import type { ColumnMapping } from "../lib/types";

const ROLE_META: { key: keyof ColumnMapping; label: string; required: boolean }[] = [
  { key: "demand", label: "Demand / quantity", required: true },
  { key: "cost", label: "Cost / price", required: true },
  { key: "capacity", label: "Capacity / stock", required: true },
  { key: "group", label: "Supplier / vendor", required: false },
  { key: "entity", label: "Product / SKU", required: false },
  { key: "date", label: "Date", required: false },
];

function StepRow({ index, active, children }: { index: number; active: boolean; children: React.ReactNode }) {
  return (
    <motion.div
      initial={{ opacity: 0, x: -8 }}
      animate={active ? { opacity: 1, x: 0 } : {}}
      transition={{ duration: 0.35, delay: index * 0.18, ease: [0.16, 1, 0.3, 1] }}
      className="flex gap-3 py-2.5 border-b border-border last:border-b-0"
    >
      {children}
    </motion.div>
  );
}

function Dot({ tone }: { tone: "ok" | "warn" | "neutral" | "spin" }) {
  if (tone === "spin") {
    return (
      <motion.span
        animate={{ rotate: 360 }}
        transition={{ repeat: Infinity, duration: 0.8, ease: "linear" }}
        className="w-3.5 h-3.5 rounded-full border-2 border-ink-faint border-t-accent flex-shrink-0 mt-0.5"
      />
    );
  }
  const cls = tone === "ok" ? "bg-good" : tone === "warn" ? "bg-warning" : "bg-ink-faint";
  return <span className={`w-2.5 h-2.5 rounded-full flex-shrink-0 mt-1 ${cls}`} />;
}

export default function ProcessingSteps() {
  const { dataset, mapping, constraints, sourceLabel } = useDataset();
  const [revealed, setRevealed] = useState(0);

  // Re-run the reveal sequence every time a genuinely new dataset lands —
  // this is what makes it read as "processing" rather than a static list.
  useEffect(() => {
    if (!dataset) return;
    setRevealed(0);
    const timers = [1, 2, 3].map((n) => window.setTimeout(() => setRevealed(n), n * 260));
    return () => timers.forEach(window.clearTimeout);
  }, [sourceLabel, dataset]);

  if (!dataset || !constraints) return null;

  const roleStatus = ROLE_META.map((role) => {
    const col = mapping[role.key];
    const count = col ? dataset.rows.filter((r) => typeof r[col] === "number").length : 0;
    const ok = !!col;
    return { ...role, col, count, ok };
  });

  const missingRequired = roleStatus.filter((r) => r.required && !r.ok);
  const ready = missingRequired.length === 0;

  return (
    <div className="rounded-xl border border-border bg-surface-inset/40 px-4 py-1 mt-4">
      <StepRow index={0} active={revealed >= 1}>
        <Dot tone={revealed >= 1 ? "ok" : "spin"} />
        <div className="flex-1">
          <div className="text-[0.85rem] font-medium">Reading file</div>
          <div className="text-[0.76rem] text-ink-muted font-mono">
            {dataset.rows.length.toLocaleString()} rows · {dataset.headers.length} columns · {sourceLabel}
          </div>
        </div>
      </StepRow>

      <StepRow index={1} active={revealed >= 2}>
        <Dot tone={revealed >= 2 ? (missingRequired.length ? "warn" : "ok") : revealed >= 1 ? "spin" : "neutral"} />
        <div className="flex-1">
          <div className="text-[0.85rem] font-medium mb-1.5">Detecting columns</div>
          {revealed >= 2 && (
            <div className="grid grid-cols-2 sm:grid-cols-3 gap-x-4 gap-y-1.5">
              {roleStatus.map((r) => (
                <div key={r.key} className="flex items-center gap-1.5 text-[0.75rem]">
                  <Dot tone={r.ok ? "ok" : r.required ? "warn" : "neutral"} />
                  <span className="text-ink-soft">{r.label}</span>
                  <span className="font-mono text-ink-muted truncate">
                    {r.ok ? `→ ${r.col}` : r.required ? "missing" : "—"}
                  </span>
                </div>
              ))}
            </div>
          )}
        </div>
      </StepRow>

      <StepRow index={2} active={revealed >= 3}>
        <Dot tone={revealed >= 3 ? (ready ? "ok" : "warn") : revealed >= 2 ? "spin" : "neutral"} />
        <div className="flex-1">
          <div className="text-[0.85rem] font-medium">Deriving constraints</div>
          {revealed >= 3 && (
            <div className="text-[0.76rem] text-ink-muted font-mono mt-0.5">
              {ready
                ? `demand ${constraints.demandMin.toFixed(0)}–${constraints.demandMax.toFixed(0)} · cost $${constraints.costMin.toFixed(2)}–$${constraints.costMax.toFixed(2)} · ${constraints.groups.length} groups`
                : "waiting on required columns below"}
            </div>
          )}
        </div>
      </StepRow>

      {revealed >= 3 && (
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ delay: 0.15, duration: 0.3 }}
          className="py-2.5"
        >
          {ready ? (
            <div className="inline-flex items-center gap-1.5 text-[0.78rem] font-medium text-good">
              <Dot tone="ok" /> Ready — every stage below can run on this file
            </div>
          ) : (
            <div className="inline-flex items-center gap-1.5 text-[0.78rem] font-medium text-warning">
              <Dot tone="warn" /> Needs {missingRequired.length} more column{missingRequired.length > 1 ? "s" : ""} mapped: {missingRequired.map((r) => r.label).join(", ")}
            </div>
          )}
        </motion.div>
      )}
    </div>
  );
}
