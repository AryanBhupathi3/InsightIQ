import { SectionLabel, StatRow, StatusRow, VerdictPanel } from "../Atoms";
import AnimatedNumber from "../AnimatedNumber";
import Disclosure from "../Disclosure";
import FormulaBlock from "../FormulaBlock";
import type { SegmentResult } from "../../lib/buyer/segments";
import { BarChart, Bar, XAxis, YAxis, Tooltip, ResponsiveContainer, CartesianGrid, Cell } from "recharts";

// One color per named segment, good -> critical, so the chart reads as a
// priority order rather than an arbitrary palette.
const SEGMENT_COLOR: Record<string, string> = {
  "Champions": "var(--color-good)",
  "At risk — high value": "var(--color-warning)",
  "Core": "var(--color-accent)",
  "New / low value": "color-mix(in oklab, var(--color-accent) 55%, var(--color-surface))",
  "Lost / low value": "var(--color-critical)",
};
const FALLBACK_SEQ = ["var(--color-series-1)", "var(--color-series-2)", "var(--color-series-3)", "var(--color-series-4)", "var(--color-series-5)"];

const money = (v: number) => `$${v.toLocaleString(undefined, { maximumFractionDigits: 0 })}`;
const num = (v: number) => v.toLocaleString(undefined, { maximumFractionDigits: 0 });

export default function CustomersTab({ result }: { result: SegmentResult | null }) {
  if (!result) {
    return <div className="glass rounded-2xl px-6 py-12 text-center text-ink-muted">Not enough order history to segment customers.</div>;
  }

  const { customers, summary, clusters, iterations, converged } = result;
  const topSegment = [...summary].sort((a, b) => b.count - a.count)[0];
  const championsPct = ((summary.find((s) => s.segment === "Champions")?.count ?? 0) / customers.length) * 100;
  const atRiskHighValue = summary.find((s) => s.segment === "At risk — high value")?.count ?? 0;
  const lost = summary.find((s) => s.segment === "Lost / low value")?.count ?? 0;

  return (
    <div>
      <div className="mb-1 font-mono text-[0.7rem] tracking-wider uppercase text-accent">Buyer side · Customers</div>
      <h1 className="font-display italic text-[2.5rem] leading-[1.02] tracking-[-0.02em] mb-3">Customer segments</h1>
      <p className="text-[0.9rem] text-ink-muted max-w-xl mb-6">
        Every customer, clustered by how recently they ordered and how much they spent — groups the data actually
        falls into, not a fixed rulebook.
      </p>

      <VerdictPanel tone="info" headline={`Most customers fall in "${topSegment.segment}."`}>
        <AnimatedNumber value={topSegment.count} format={num} /> of {customers.length} customers ({((topSegment.count / customers.length) * 100).toFixed(0)}%)
        sit in the "{topSegment.segment}" cluster. <AnimatedNumber value={championsPct} format={(v) => v.toFixed(0)} />%
        are Champions — recent, high-spending customers worth prioritising. Worth a closer look:{" "}
        <AnimatedNumber value={atRiskHighValue} format={num} /> customers are "At risk — high value": they spent as
        much as Champions did, but it's been a long time since their order — a different, more urgent problem than
        the <AnimatedNumber value={lost} format={num} /> who are simply Lost and never spent much to begin with.
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
                {summary.map((s, i) => <Cell key={s.segment} fill={SEGMENT_COLOR[s.segment] ?? FALLBACK_SEQ[i % FALLBACK_SEQ.length]} />)}
              </Bar>
            </BarChart>
          </ResponsiveContainer>
        </div>
        <div className="space-y-2">
          {summary.map((s, i) => (
            <div key={s.segment} className="flex items-center gap-2.5 text-[0.82rem]">
              <span className="w-2 h-2 rounded-full flex-shrink-0" style={{ background: SEGMENT_COLOR[s.segment] ?? FALLBACK_SEQ[i % FALLBACK_SEQ.length] }} />
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
          Every customer is placed on a 2D plane — how recently they ordered, how much they spent, both
          standardized so neither axis dominates just from its raw scale (days range in the thousands, dollars in
          the single thousands). <b>k-means clustering</b> then finds 5 groups directly from that plane: it starts
          from 5 initial centers, assigns every customer to its nearest center, moves each center to the average
          of the customers now assigned to it, and repeats until nothing moves. On this data that takes{" "}
          {iterations} iterations to {converged ? "fully converge" : "stop improving"} — no segment is a fixed
          rule, it's whatever five clusters this dataset's customers actually form.
        </p>
        <p className="text-[0.82rem] text-ink-muted leading-relaxed max-w-2xl mb-5">
          The usual third RFM dimension, Frequency, isn't one of the two axes — this dataset has exactly one order
          per customer, so it never varies and clustering on it would add noise, not signal. Each resulting
          cluster is named from where its center actually landed (recent vs. lagging, high vs. low spend), which
          is why "At risk — high value" and "Lost / low value" are different segments rather than both being
          grouped under one "hasn't ordered in a while" label — one of them is still worth winning back.
        </p>
        <div className="mb-5">
          <div className="font-mono text-[0.65rem] uppercase text-ink-muted mb-2">Cluster centers (real units)</div>
          {clusters
            .slice()
            .sort((a, b) => b.count - a.count)
            .map((c) => (
              <StatusRow
                key={c.cluster}
                ok={c.segment === "Champions" || c.segment === "Core"}
                label={`${c.segment} (${c.count} customers)`}
                detail={`${c.avgRecencyDays.toFixed(0)}d since order · ${money(c.avgMonetary)} avg spend`}
              />
            ))}
        </div>
        <div className="space-y-3">
          <FormulaBlock label="Assignment step — nearest center by squared distance" tex="c_i = \arg\min_{k} \lVert x_i - \mu_k \rVert^2" />
          <FormulaBlock label="Update step — move each center to its cluster's mean" tex="\mu_k = \frac{1}{|S_k|}\sum_{i \in S_k} x_i" />
        </div>
      </Disclosure>
    </div>
  );
}
