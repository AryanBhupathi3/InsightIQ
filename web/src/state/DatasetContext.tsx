import { createContext, useContext, useMemo, useState, type ReactNode } from "react";
import { deriveConstraints, inferColumnRoles, parseCsvFile, parseCsvText } from "../lib/csv";
import { SAMPLE_DATASETS } from "../lib/sampleDatasets";
import type { ColumnMapping, DerivedConstraints, ParsedDataset } from "../lib/types";

interface DatasetState {
  status: "empty" | "loading" | "ready" | "error";
  dataset: ParsedDataset | null;
  mapping: ColumnMapping;
  constraints: DerivedConstraints | null;
  sourceLabel: string | null;
  error: string | null;
  loadSample: (key: string) => Promise<void>;
  loadFile: (file: File) => Promise<void>;
  setMapping: (patch: Partial<ColumnMapping>) => void;
}

const Ctx = createContext<DatasetState | null>(null);

export function DatasetProvider({ children }: { children: ReactNode }) {
  const [status, setStatus] = useState<DatasetState["status"]>("empty");
  const [dataset, setDataset] = useState<ParsedDataset | null>(null);
  const [mapping, setMappingState] = useState<ColumnMapping>({
    entity: null, group: null, date: null, demand: null, cost: null, capacity: null,
  });
  const [sourceLabel, setSourceLabel] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  const applyDataset = (ds: ParsedDataset, label: string) => {
    setDataset(ds);
    setMappingState(inferColumnRoles(ds));
    setSourceLabel(label);
    setStatus("ready");
  };

  const loadSample = async (key: string) => {
    const sample = SAMPLE_DATASETS.find((s) => s.key === key);
    if (!sample) return;
    setStatus("loading");
    setError(null);
    try {
      const res = await fetch(sample.file);
      const text = await res.text();
      applyDataset(parseCsvText(sample.label, text), sample.label);
    } catch {
      setError("Couldn't load that sample dataset.");
      setStatus("error");
    }
  };

  const loadFile = async (file: File) => {
    setStatus("loading");
    setError(null);
    try {
      const ds = await parseCsvFile(file);
      if (ds.numericColumns.length === 0) {
        setError("No numeric columns found in that file — is it a CSV with a header row?");
        setStatus("error");
        return;
      }
      applyDataset(ds, file.name);
    } catch {
      setError("Couldn't parse that file as CSV.");
      setStatus("error");
    }
  };

  const setMapping = (patch: Partial<ColumnMapping>) => setMappingState((m) => ({ ...m, ...patch }));

  const constraints = useMemo(() => (dataset ? deriveConstraints(dataset, mapping) : null), [dataset, mapping]);

  const value: DatasetState = { status, dataset, mapping, constraints, sourceLabel, error, loadSample, loadFile, setMapping };
  return <Ctx.Provider value={value}>{children}</Ctx.Provider>;
}

export function useDataset() {
  const ctx = useContext(Ctx);
  if (!ctx) throw new Error("useDataset must be used within DatasetProvider");
  return ctx;
}
