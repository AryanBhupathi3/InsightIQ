import { useDataset } from "../state/DatasetContext";

const PREVIEW_ROWS = 10;

export default function DataPreviewTable() {
  const { dataset, mapping } = useDataset();
  if (!dataset) return null;

  const mappedCols = new Set(Object.values(mapping).filter(Boolean));
  const rows = dataset.rows.slice(0, PREVIEW_ROWS);

  return (
    <div>
      <div className="font-mono text-[0.65rem] tracking-wider uppercase text-ink-muted mb-2">
        Raw preview — first {rows.length} of {dataset.rows.length.toLocaleString()} rows
      </div>
      <div className="glass rounded-2xl overflow-hidden">
        <div className="overflow-auto max-h-64">
          <table className="w-full text-[0.76rem] border-collapse">
            <thead>
              <tr className="sticky top-0">
                {dataset.headers.map((h) => (
                  <th
                    key={h}
                    className={`text-left font-mono font-medium uppercase tracking-wide px-3 py-2 whitespace-nowrap border-b border-border-strong ${
                      mappedCols.has(h) ? "text-accent bg-accent-soft" : "text-ink-muted bg-surface"
                    }`}
                  >
                    {h}
                  </th>
                ))}
              </tr>
            </thead>
            <tbody>
              {rows.map((r, i) => (
                <tr key={i} className="odd:bg-white/[0.02]">
                  {dataset.headers.map((h) => (
                    <td key={h} className="tabular px-3 py-1.5 whitespace-nowrap text-ink-soft border-b border-border">
                      {r[h] === null || r[h] === undefined || r[h] === "" ? (
                        <span className="text-ink-faint">—</span>
                      ) : (
                        String(r[h])
                      )}
                    </td>
                  ))}
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}
