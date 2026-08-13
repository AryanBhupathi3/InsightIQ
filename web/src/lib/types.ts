export type Row = Record<string, string | number | null>;

export interface ParsedDataset {
  name: string;
  headers: string[];
  rows: Row[];
  numericColumns: string[];
}

/** Which column in the uploaded (or sample) CSV plays which role.
 *  Nothing downstream is hardcoded to a specific header name — this
 *  mapping is the only place a column name is ever referenced, and it's
 *  either guessed heuristically or set by the user. */
export interface ColumnMapping {
  entity: string | null; // e.g. SKU / product id — what a forecast is "per"
  group: string | null; // e.g. supplier / vendor — what gets optimized over
  date: string | null; // time column, for ordering the demand series
  demand: string | null; // units sold / quantity — the forecast target
  cost: string | null; // unit cost — what the supplier is paid
  capacity: string | null; // capacity / stock / order-quantity ceiling
}

export interface DerivedConstraints {
  demandMean: number;
  demandStd: number;
  demandMin: number;
  demandMax: number;
  costMin: number;
  costMax: number;
  costMean: number;
  capacityMin: number;
  capacityMax: number;
  capacityMean: number;
  groups: { name: string; cost: number; capacity: number; n: number }[];
}
