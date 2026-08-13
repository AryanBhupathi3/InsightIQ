import { useCallback } from "react";
import { useDropzone } from "react-dropzone";
import { useDataset } from "../state/DatasetContext";
import { SAMPLE_DATASETS } from "../lib/sampleDatasets";
import type { ColumnMapping } from "../lib/types";
import ProcessingSteps from "./ProcessingSteps";

const ROLES: { key: keyof ColumnMapping; label: string; required: boolean; hint: string }[] = [
  { key: "demand", label: "Demand / quantity", required: true, hint: "what gets forecast" },
  { key: "cost", label: "Cost / price", required: true, hint: "what a supplier is paid" },
  { key: "capacity", label: "Capacity / stock", required: true, hint: "ceiling per row" },
  { key: "group", label: "Supplier / vendor", required: false, hint: "what gets optimized over" },
  { key: "entity", label: "Product / SKU", required: false, hint: "what a forecast is per" },
  { key: "date", label: "Date", required: false, hint: "orders the series" },
];

export default function UploadPanel() {
  const { status, dataset, mapping, sourceLabel, error, loadSample, loadFile, setMapping } = useDataset();

  const onDrop = useCallback((files: File[]) => { if (files[0]) loadFile(files[0]); }, [loadFile]);
  const { getRootProps, getInputProps, isDragActive, open } = useDropzone({
    onDrop,
    accept: { "text/csv": [".csv"] },
    multiple: false,
    noClick: false,
  });

  return (
    <div className="space-y-6">
      <div className="grid sm:grid-cols-2 gap-4">
        <div>
          <div className="font-mono text-[0.65rem] tracking-wider uppercase text-ink-muted mb-2">
            Option A — try a sample
          </div>
          <div className="flex flex-col gap-2">
            {SAMPLE_DATASETS.map((s) => (
              <button
                key={s.key}
                onClick={() => loadSample(s.key)}
                className={`text-left text-[0.82rem] font-medium px-3.5 py-2.5 rounded-lg border transition-colors cursor-pointer ${
                  sourceLabel === s.label
                    ? "bg-accent-soft border-accent/50 text-accent"
                    : "border-border-strong text-ink-soft hover:border-accent/40 hover:text-ink"
                }`}
              >
                {s.label}
              </button>
            ))}
          </div>
        </div>

        <div>
          <div className="font-mono text-[0.65rem] tracking-wider uppercase text-ink-muted mb-2">
            Option B — upload your own
          </div>
          <div
            {...getRootProps()}
            onClick={open}
            className={`h-full min-h-[86px] flex flex-col items-center justify-center text-center gap-1 rounded-lg border-2 border-dashed cursor-pointer transition-colors px-4 py-4 ${
              isDragActive ? "border-accent text-accent bg-accent-soft" : "border-border-strong text-ink-soft hover:text-ink hover:border-accent/50"
            }`}
          >
            <input {...getInputProps()} />
            <span className="text-[0.85rem] font-medium">
              {isDragActive ? "Drop the CSV here…" : "Drag a CSV here, or click to browse"}
            </span>
            <span className="text-[0.72rem] text-ink-muted">.csv files only</span>
          </div>
        </div>
      </div>

      {status === "loading" && <span className="text-[0.78rem] text-ink-muted font-mono">Parsing…</span>}
      {error && <div className="text-[0.82rem] text-critical">{error}</div>}

      {dataset && <ProcessingSteps />}

      {dataset && (
        <div>
          <div className="font-mono text-[0.65rem] tracking-wider uppercase text-ink-muted mb-1">
            Override the auto-detected columns
          </div>
          <p className="text-[0.78rem] text-ink-muted mb-3 max-w-2xl">
            "Detecting columns" above already guessed these from your file's headers. Only change
            something here if a role looks wrong — every stage below reacts instantly.
          </p>
          <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-3">
            {ROLES.map((role) => (
              <label key={role.key} className="block">
                <div className="font-mono text-[0.62rem] tracking-wider uppercase text-ink-muted mb-1">
                  {role.label}
                  {role.required && <span className="text-accent"> *</span>}
                </div>
                <select
                  value={mapping[role.key] ?? ""}
                  onChange={(e) => setMapping({ [role.key]: e.target.value || null } as Partial<ColumnMapping>)}
                  className="w-full bg-surface-raised border border-border-strong rounded-md px-2 py-1.5 text-[0.8rem] text-ink focus:outline-none focus:border-accent/60"
                >
                  <option value="">— none —</option>
                  {dataset.headers.map((h) => (
                    <option key={h} value={h}>{h}</option>
                  ))}
                </select>
                <div className="text-[0.66rem] text-ink-faint mt-0.5">{role.hint}</div>
              </label>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}
