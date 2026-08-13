import Papa from "papaparse";
import type { ColumnMapping, DerivedConstraints, ParsedDataset, Row } from "./types";

export function parseCsvText(name: string, text: string): ParsedDataset {
  const result = Papa.parse<Row>(text, {
    header: true,
    dynamicTyping: true,
    skipEmptyLines: true,
  });
  const headers = result.meta.fields ?? [];
  const rows = result.data.filter((r) => Object.keys(r).length > 0);

  const numericColumns = headers.filter((h) => {
    let seen = 0;
    for (const r of rows.slice(0, 200)) {
      const v = r[h];
      if (v === null || v === undefined || v === "") continue;
      seen++;
      if (typeof v !== "number" || Number.isNaN(v)) return false;
    }
    return seen > 0;
  });

  return { name, headers, rows, numericColumns };
}

export async function parseCsvFile(file: File): Promise<ParsedDataset> {
  const text = await file.text();
  return parseCsvText(file.name, text);
}

// Plain substring matches, not \b-bounded ones — real CSV headers are full
// of compound names like "SKU_ID" or "unit_cost" where a trailing "_ID"
// or leading "unit_" sits hard against the keyword with no word boundary,
// so a \b-anchored pattern silently never matches them.
const NAME_HINTS: Record<keyof ColumnMapping, RegExp[]> = {
  entity: [/sku/i, /product/i, /item/i],
  group: [/supplier/i, /vendor/i, /source/i],
  date: [/date/i, /period/i, /\bday\b/i, /\bweek\b/i, /\bmonth\b/i, /time/i],
  // "sold/qty/quantity/shipped/volume" first: prefer actual historical
  // movement over a pre-computed "…Demand_Forecast" column that might also
  // be in the file — fitting our own trend to someone else's forecast
  // would be circular. "units" is deliberately last: it's the most likely
  // to false-positive on an unrelated "units_in_stock"-style column.
  demand: [/sold/i, /shipped/i, /volume/i, /qty/i, /quantity/i, /demand/i, /units?\b/i],
  cost: [/negotiat/i, /unit_?cost/i, /cost/i, /price_?per/i],
  // "inventory/capacity/on_hand" before the bare "stock" — "stock" alone
  // also matches "Stockout_Flag", a boolean flag with the opposite meaning
  // (out of stock), so it's kept as a low-priority fallback only.
  capacity: [/inventory/i, /capacity/i, /on_?hand/i, /order_?qty/i, /order_?quantity/i, /stock_?level/i, /warehouse/i, /_cap\b/i, /stock/i],
};

/** Best-effort guess at what each column means, from header text + whether
 *  the column is numeric. Never authoritative — always shown to the user
 *  to confirm/override, since a CSV's headers are the only generalizable
 *  signal we have across arbitrary datasets. */
export function inferColumnRoles(ds: ParsedDataset): ColumnMapping {
  const mapping: ColumnMapping = { entity: null, group: null, date: null, demand: null, cost: null, capacity: null };
  const used = new Set<string>();

  const claim = (role: keyof ColumnMapping, requireNumeric: boolean) => {
    for (const pattern of NAME_HINTS[role]) {
      const hit = ds.headers.find(
        (h) =>
          !used.has(h) &&
          pattern.test(h) &&
          !/flag|is_|active|boolean/i.test(h) && // boolean-ish columns are never a demand/cost/capacity signal
          (!requireNumeric || ds.numericColumns.includes(h))
      );
      if (hit) {
        mapping[role] = hit;
        used.add(hit);
        return;
      }
    }
  };

  claim("date", false);
  claim("entity", false);
  claim("group", false);
  claim("demand", true);
  claim("cost", true);
  claim("capacity", true);

  return mapping;
}

export function deriveConstraints(ds: ParsedDataset, mapping: ColumnMapping): DerivedConstraints {
  const nums = (col: string | null): number[] =>
    col ? ds.rows.map((r) => r[col]).filter((v): v is number => typeof v === "number" && !Number.isNaN(v)) : [];

  const stat = (arr: number[]) => {
    if (arr.length === 0) return { min: 0, max: 1, mean: 0.5, std: 0.25 };
    const mean = arr.reduce((a, b) => a + b, 0) / arr.length;
    const variance = arr.reduce((a, b) => a + (b - mean) ** 2, 0) / arr.length;
    return { min: Math.min(...arr), max: Math.max(...arr), mean, std: Math.sqrt(variance) };
  };

  const demandStat = stat(nums(mapping.demand));
  const costStat = stat(nums(mapping.cost));
  const capacityStat = stat(nums(mapping.capacity));

  const groups: DerivedConstraints["groups"] = [];
  if (mapping.group) {
    const byGroup = new Map<string, { cost: number[]; capacity: number[]; demand: number[] }>();
    for (const r of ds.rows) {
      const g = String(r[mapping.group] ?? "");
      if (!g) continue;
      if (!byGroup.has(g)) byGroup.set(g, { cost: [], capacity: [], demand: [] });
      const bucket = byGroup.get(g)!;
      const c = mapping.cost ? r[mapping.cost] : null;
      const cap = mapping.capacity ? r[mapping.capacity] : null;
      const d = mapping.demand ? r[mapping.demand] : null;
      if (typeof c === "number") bucket.cost.push(c);
      if (typeof cap === "number") bucket.capacity.push(cap);
      if (typeof d === "number") bucket.demand.push(d);
    }
    for (const [name, bucket] of byGroup) {
      const cAvg = bucket.cost.length ? bucket.cost.reduce((a, b) => a + b, 0) / bucket.cost.length : costStat.mean;
      // Capacity fallback, in order of how much signal it actually carries:
      // 1) an explicit capacity/stock column, summed for this group
      // 2) this group's own historical order volume (×2 headroom) — a
      //    much more honest proxy than a global mean when no capacity
      //    column exists at all (a dataset like a PO log has no "stock"
      //    field, but a supplier's past order quantities are real
      //    evidence of how much they can plausibly supply)
      // 3) a flat per-row default, only if neither signal is available
      const capSum = bucket.capacity.length
        ? bucket.capacity.reduce((a, b) => a + b, 0)
        : bucket.demand.length
          ? bucket.demand.reduce((a, b) => a + b, 0) * 2
          : bucket.cost.length * 100;
      groups.push({ name, cost: cAvg, capacity: capSum, n: bucket.cost.length });
    }
    groups.sort((a, b) => a.cost - b.cost);
  } else if (mapping.cost && mapping.capacity) {
    // No explicit supplier/vendor column — fall back to cost-quartile
    // buckets so supplier-style allocation still runs on any dataset that
    // has a cost and a capacity-like column, not just ones shaped like
    // our sample procurement log.
    const paired = ds.rows
      .map((r) => [r[mapping.cost!], r[mapping.capacity!]] as [unknown, unknown])
      .filter((p): p is [number, number] => typeof p[0] === "number" && typeof p[1] === "number")
      .sort((a, b) => a[0] - b[0]);
    const bucketCount = Math.min(5, Math.max(2, Math.floor(paired.length / 20) || 2));
    const bucketSize = Math.ceil(paired.length / bucketCount);
    for (let b = 0; b < bucketCount; b++) {
      const chunk = paired.slice(b * bucketSize, (b + 1) * bucketSize);
      if (chunk.length === 0) continue;
      const cAvg = chunk.reduce((a, p) => a + p[0], 0) / chunk.length;
      const capSum = chunk.reduce((a, p) => a + p[1], 0);
      groups.push({ name: `Tier ${String.fromCharCode(65 + b)}`, cost: cAvg, capacity: capSum, n: chunk.length });
    }
  }

  return {
    demandMean: demandStat.mean,
    demandStd: demandStat.std,
    demandMin: demandStat.min,
    demandMax: demandStat.max,
    costMin: costStat.min,
    costMax: costStat.max,
    costMean: costStat.mean,
    capacityMin: capacityStat.min,
    capacityMax: capacityStat.max,
    capacityMean: capacityStat.mean,
    groups,
  };
}
