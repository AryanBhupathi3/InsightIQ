import type { WorkbenchShared } from "../../pages/Workbench";
import UploadPanel from "../UploadPanel";
import { SectionLabel, Callout } from "../Atoms";
import Disclosure from "../Disclosure";
import FormulaBlock from "../FormulaBlock";
import { recencyWeights } from "../../lib/stats";
import { LineChart, Line, XAxis, YAxis, Tooltip, ResponsiveContainer, CartesianGrid } from "recharts";

export default function DataTab({ dataset, constraints, series, halflife, setHalflife, activeEntity, entities, setEntity }: WorkbenchShared) {
  return (
    <div>
      <div className="mb-1 font-mono text-[0.7rem] tracking-wider uppercase text-accent">Stage 01 · Steps 1–2</div>
      <h1 className="font-display italic text-[2.5rem] leading-[1.02] tracking-[-0.02em] mb-3">Data layer</h1>
      <p className="text-[0.9rem] text-ink-muted max-w-xl mb-6">
        Pick a sample dataset or drop in your own CSV. Columns map to roles below — every
        constraint the rest of the pipeline uses is derived from these, live.
      </p>

      <UploadPanel />

      {dataset && constraints && (
        <>
          {entities.length > 0 && (
            <div className="mt-6">
              <label className="font-mono text-[0.65rem] tracking-wider uppercase text-ink-muted block mb-1">
                Preview entity ({entities.length} found)
              </label>
              <select
                value={activeEntity ?? ""}
                onChange={(e) => setEntity(e.target.value)}
                className="bg-surface-raised border border-border-strong rounded-md px-2 py-1.5 text-[0.82rem] text-ink"
              >
                {entities.map((e) => (
                  <option key={e} value={e}>{e}</option>
                ))}
              </select>
            </div>
          )}

          <SectionLabel>Preprocessing</SectionLabel>
          <div className="grid lg:grid-cols-[1fr_1.4fr] gap-8">
            <div>
              <p className="text-[0.85rem] text-ink-soft leading-relaxed mb-4">
                Rows are aggregated to one point per period (summed if several rows share a
                date), and each period is weighted by how recent it is — the slider below controls
                how quickly that weight fades, so you can decide how much recent demand should
                outweigh old demand in the forecast.
              </p>
              <label className="block">
                <div className="flex justify-between font-mono text-[0.65rem] uppercase text-ink-muted mb-1">
                  <span>Half-life (days)</span><span className="tabular">{halflife}</span>
                </div>
                <input type="range" min={3} max={60} value={halflife} onChange={(e) => setHalflife(+e.target.value)} className="w-full accent-accent" />
              </label>
            </div>
            <div className="h-64">
              {series && series.y.length > 0 ? (
                <ResponsiveContainer width="100%" height="100%">
                  <LineChart data={series.y.map((y, i) => ({ i, y, w: recencyWeights(series.t, halflife)[i] * Math.max(...series.y) }))}>
                    <CartesianGrid stroke="var(--color-border)" vertical={false} />
                    <XAxis dataKey="i" stroke="var(--color-ink-faint)" fontSize={11} tickLine={false} />
                    <YAxis stroke="var(--color-ink-faint)" fontSize={11} tickLine={false} />
                    <Tooltip contentStyle={{ background: "var(--color-surface-raised)", border: "1px solid var(--color-border-strong)", borderRadius: 8, fontSize: 12 }} />
                    <Line type="monotone" dataKey="y" stroke="var(--color-series-1)" strokeWidth={1.6} dot={false} name="Demand" />
                    <Line type="monotone" dataKey="w" stroke="var(--color-accent)" strokeWidth={1.6} strokeDasharray="3 3" dot={false} name="Recency weight (scaled)" />
                  </LineChart>
                </ResponsiveContainer>
              ) : (
                <Callout>Map a demand/quantity column above to preview its series.</Callout>
              )}
            </div>
          </div>

          <div className="mt-6">
            <Disclosure label="How does the recency weighting work?">
              <FormulaBlock label="Recency weight, half-life h" tex="w_t = 0.5^{\frac{T - t}{h}}" />
            </Disclosure>
          </div>
        </>
      )}
    </div>
  );
}
