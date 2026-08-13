import katex from "katex";
import "katex/dist/katex.min.css";
import { useMemo } from "react";

export default function FormulaBlock({ label, tex }: { label: string; tex: string }) {
  const html = useMemo(
    () => katex.renderToString(tex, { throwOnError: false, displayMode: true }),
    [tex]
  );
  return (
    <div className="border-l-2 border-accent/70 pl-4 py-1">
      <div className="font-mono text-[0.65rem] tracking-wider uppercase text-ink-muted mb-1">{label}</div>
      <div className="text-ink [&_.katex]:text-[1.02rem]" dangerouslySetInnerHTML={{ __html: html }} />
    </div>
  );
}
