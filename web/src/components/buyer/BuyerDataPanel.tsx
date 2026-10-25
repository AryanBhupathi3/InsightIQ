import { useState } from "react";

export interface BuyerDataPanelProps {
  sourceLabel: string;
  status: "idle" | "loading";
  error: string | null;
  onLoadSample: () => void;
  onLoadFiles: (files: { customer: File; order: File; product: File }) => void;
}

function FileSlot({ label, file, onChange }: { label: string; file: File | null; onChange: (f: File) => void }) {
  return (
    <label className="pressable flex flex-col gap-1 border-2 border-dashed border-border-strong hover:border-accent/50 rounded-lg px-3 py-3 cursor-pointer text-center transition-[border-color] duration-150">
      <span className="text-[0.76rem] font-medium text-ink-soft">{label}</span>
      <span className="text-[0.68rem] text-ink-faint truncate">{file ? file.name : "Click to choose .csv"}</span>
      <input
        type="file"
        accept=".csv,text/csv"
        className="hidden"
        onChange={(e) => {
          const f = e.target.files?.[0];
          if (f) onChange(f);
        }}
      />
    </label>
  );
}

export default function BuyerDataPanel({ sourceLabel, status, error, onLoadSample, onLoadFiles }: BuyerDataPanelProps) {
  const [open, setOpen] = useState(false);
  const [customer, setCustomer] = useState<File | null>(null);
  const [order, setOrder] = useState<File | null>(null);
  const [product, setProduct] = useState<File | null>(null);
  const ready = customer && order && product;

  return (
    <div className="mb-8">
      <div className="flex items-center justify-between flex-wrap gap-2">
        <div className="text-[0.78rem] text-ink-muted">
          <span className="font-mono text-[0.65rem] uppercase tracking-wider text-ink-faint mr-2">Data source</span>
          {sourceLabel}
        </div>
        <button
          onClick={() => setOpen((v) => !v)}
          className="pressable text-[0.78rem] font-medium text-accent hover:underline cursor-pointer"
        >
          {open ? "Cancel" : "Use your own data"}
        </button>
      </div>

      {open && (
        <div className="mt-3 glass rounded-xl px-5 py-4 space-y-3">
          <p className="text-[0.78rem] text-ink-muted max-w-xl leading-relaxed">
            Upload your own customers, orders, and products files. The math below reads these by
            column position, not header name, so each file needs the same column order as the
            sample: customers start with Customer ID, orders with Order ID then Customer ID, and
            products with Product ID.
          </p>
          <div className="grid sm:grid-cols-3 gap-3">
            <FileSlot label="Customers CSV" file={customer} onChange={setCustomer} />
            <FileSlot label="Orders CSV" file={order} onChange={setOrder} />
            <FileSlot label="Products CSV" file={product} onChange={setProduct} />
          </div>
          <div className="flex items-center gap-3">
            <button
              disabled={!ready || status === "loading"}
              onClick={() => ready && onLoadFiles({ customer, order, product })}
              className="pressable text-[0.82rem] font-semibold px-4 py-2 rounded-full bg-accent text-bg hover:bg-accent-hover transition-[background-color] duration-150 disabled:opacity-40 disabled:cursor-not-allowed cursor-pointer"
            >
              {status === "loading" ? "Parsing…" : "Load these files"}
            </button>
            <button
              onClick={() => {
                onLoadSample();
                setOpen(false);
                setCustomer(null);
                setOrder(null);
                setProduct(null);
              }}
              className="pressable text-[0.82rem] font-medium text-ink-soft hover:text-ink cursor-pointer"
            >
              Reset to sample
            </button>
          </div>
          {error && <div className="text-[0.8rem] text-critical">{error}</div>}
        </div>
      )}
    </div>
  );
}
