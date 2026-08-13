import type { ColumnMapping, ParsedDataset } from "./types";

export interface Series {
  t: number[];
  y: number[];
  labels: string[]; // date or row-index label, for chart axes
}

export function entityValues(ds: ParsedDataset, mapping: ColumnMapping): string[] {
  if (!mapping.entity) return [];
  const set = new Set<string>();
  for (const r of ds.rows) {
    const v = r[mapping.entity];
    if (v !== null && v !== undefined && v !== "") set.add(String(v));
  }
  return Array.from(set).sort();
}

/** Builds a single time-ordered demand series, generalised over whatever
 *  the uploaded CSV actually has: filters to one entity if the dataset has
 *  an entity column, aggregates same-date rows if it has a date column,
 *  and falls back to row order when it has neither. */
export function buildSeries(ds: ParsedDataset, mapping: ColumnMapping, entity: string | null): Series {
  if (!mapping.demand) return { t: [], y: [], labels: [] };

  let rows = ds.rows;
  if (mapping.entity && entity) rows = rows.filter((r) => String(r[mapping.entity!] ?? "") === entity);

  if (mapping.date) {
    const byDate = new Map<string, number>();
    for (const r of rows) {
      const dv = r[mapping.date];
      const demand = r[mapping.demand];
      if (dv === null || dv === undefined || typeof demand !== "number") continue;
      const key = String(dv);
      byDate.set(key, (byDate.get(key) ?? 0) + demand);
    }
    const entries = Array.from(byDate.entries()).sort((a, b) => (a[0] < b[0] ? -1 : a[0] > b[0] ? 1 : 0));
    return {
      t: entries.map((_, i) => i),
      y: entries.map((e) => e[1]),
      labels: entries.map((e) => e[0]),
    };
  }

  const y = rows.map((r) => r[mapping.demand!]).filter((v): v is number => typeof v === "number");
  return { t: y.map((_, i) => i), y, labels: y.map((_, i) => `#${i + 1}`) };
}
