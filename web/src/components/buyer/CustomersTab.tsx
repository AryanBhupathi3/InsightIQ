import { SectionLabel, StatRow, VerdictPanel } from "../Atoms";
import AnimatedNumber from "../AnimatedNumber";
import Disclosure from "../Disclosure";
import FormulaBlock from "../FormulaBlock";
import type { SegmentResult } from "../../lib/buyer/segments";
import { BarChart, Bar, XAxis, YAxis, Tooltip, ResponsiveContainer, CartesianGrid, Cell } from "recharts";

// Ordinal ramp, best (Champions) to worst (Lost) — same "magnitude, not
// identity" reasoning as the Low/Medium/High bands on the Uncertainty tab.
const SEQ = [
  "var(--color-accent)",
  "color-mix(in oklab, var(--color-accent) 75%, var(--color-surface))",
  "color-mix(in oklab, var(--color-accent) 50%, var(--color-surface))",
  "color-mix(in oklab, var(--color-warning) 55%, var(--color-surface))",
  "var(--color-critical)",
];

const money = (v: number) => `$${v.toLocaleString(undefined, { maximumFractionDigits: 0 })}`;
const num = (v: number) => v.toLocaleString(undefined, { maximumFractionDigits: 0 });

export default function CustomersTab({ result }: { result: SegmentResult | null }) {
  if (!result) {
    return <div className="glass rounded-2xl px-6 py-12 text-center text-ink-muted">Not enough order history to segment customers.</div>;
  }

  const { customers, summary } = result;
  const topSegment = [...summary].sort((a, b) => b.count - a.count)[0];
  const championsPct = ((summary.find((s) => s.segment === "Champions")?.count ?? 0) / customers.length) * 100;
  const atRiskOrLost =
    (summary.find((s) => s.segment === "At risk")?.count ?? 0) + (summary.find((s) => s.segment === "Lost / low value")?.count ?? 0);

  return (
    <div>
      <div className="mb-1 font-mono text-[0.7rem] tracking-wider uppercase text-accent">Buyer side · Customers</div>
      <h1 className="font-display italic text-[2.5rem] leading-[1.02] tracking-[-0.02em] mb-3">Customer segments</h1>
      <p className="text-[0.9rem] text-ink-muted max-w-xl mb-6">
        Every customer, scored by how recently they ordered and how much they spent, then grouped into segments.
      </p>

      <VerdictPanel tone="info" headline={`Most customers fall in "${topSegment.segment}."`}>
        <AnimatedNumber value={topSegment.count} format={num} /> of {customers.length} customers ({((topSegment.count / customers.length) * 100).toFixed(0)}%)
        sit in the "{topSegment.segment}" tier. <AnimatedNumber value={championsPct} format={(v) => v.toFixed(0)} />% are
        Champions — recent, high-spending customers worth prioritising — while{" "}
        <AnimatedNumber value={atRiskOrLost} format={num} /> are At risk or Lost, meaning it's been a while since
        they ordered and/or they spent little when they did.
      </VerdictPanel>

      <SectionLabel>Segment breakdown</SectionLabel>
      <div className="grid lg:grid-cols-[1.4fr_1fr] gap-8 items-center">
        <div className="h-72">
          <ResponsiveContainer width="100%" height="100%">
            <BarChart data={[...summary]}>
              <CartesianGrid stroke="var(--color-border)" vertical={false} />
              <XAxis dataKey="segment" stroke="var(--color-ink-faint)" fontSize={10.5} tickLine={false} interval={0} angle={-12} textAnchor="end" height={55} />
              <YAxis stroke="var(--color-ink-faint)" fontSize={11} tickLine={false} />
              <Tooltip
                contentStyle={{ background: "var(--color-surface-raised)", border: "1px solid var(--color-border-strong)", borderRadius: 8, fontSize: 12 }}
              />
              <Bar dataKey="count" name="Customers" radius={[4, 4, 0, 0]}>
                {summary.map((_, i) => <Cell key={i} fill={SEQ[i % SEQ.length]} />)}
              </Bar>
            </BarChart>
          </ResponsiveContainer>
        </div>
        <div className="space-y-2">
          {summary.map((s, i) => (
            <div key={s.segment} className="flex items-center gap-2.5 text-[0.82rem]">
              <span className="w-2 h-2 rounded-full flex-shrink-0" style={{ background: SEQ[i % SEQ.length] }} />
              <span className="text-ink-soft flex-1">{s.segment}</span>
              <span className="tabular text-ink-muted">{num(s.count)}</span>
              <span className="tabular text-ink-faint w-16 text-right">{money(s.totalRevenue)}</span>
            </div>
          ))}
        </div>
      </div>

      <StatRow
        items={[
          { label: "Total customers", numeric: customers.length, format: num },
          { label: "Total revenue", numeric: summary.reduce((a, s) => a + s.totalRevenue, 0), format: money, tone: "accent" },
          { label: "Avg days since order", numeric: customers.reduce((a, c) => a + c.recencyDays, 0) / customers.length, format: (v) => v.toFixed(0), sub: "vs. the dataset's most recent order" },
        ]}
      />

      <SectionLabel>The method</SectionLabel>
      <Disclosure label="How did we determine this?">
        <p className="text-[0.86rem] text-ink-soft leading-relaxed max-w-2xl mb-4">
          This is a Recency x Monetary (R x M) scoring, a simplified version of the classic RFM model. The usual
          third dimension — Frequency, how often someone buys — is left out on purpose: this dataset has exactly
          one order per customer (1,000 customers, 1,000 orders, no repeats), so frequency never varies and
          scoring on it would be decoration, not signal.
        </p>
        <p className="text-[0.82rem] text-ink-muted leading-relaxed max-w-2xl mb-5">
          Each customer is ranked against every other customer on two things — how recently they ordered, and how
          much they spent — and sorted into five equal-sized bands (quintiles) on each, 1 (worst) to 5 (best). The
          two scores are added together, and that total decides the segment: a high score on both means
          "Champions," low on both means "Lost / low value," and everything else falls in between.
        </p>
        <FormulaBlock label="Segment score" tex="\text{score} = R_{1..5} + M_{1..5}, \qquad \text{segment} = f(\text{score})" />
      </Disclosure>
    </div>
  );
}
