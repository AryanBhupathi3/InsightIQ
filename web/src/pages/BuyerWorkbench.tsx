import { useEffect, useMemo, useState } from "react";
import { Link } from "react-router-dom";
import { motion } from "framer-motion";
import Logo from "../components/Logo";
import ThemeToggle from "../components/ThemeToggle";
import { loadBuyerDataset, parseBuyerDataset } from "../lib/buyer/parse";
import { computeSegments } from "../lib/buyer/segments";
import { computeFunnel } from "../lib/buyer/funnel";
import { computeCatalog } from "../lib/buyer/catalog";
import { solveRestockLP } from "../lib/buyer/restock";
import type { BuyerDataset } from "../lib/buyer/types";
import CustomersTab from "../components/buyer/CustomersTab";
import OrdersTab from "../components/buyer/OrdersTab";
import CatalogTab from "../components/buyer/CatalogTab";

const TABS = [
  { key: "customers", label: "Customers" },
  { key: "orders", label: "Orders" },
  { key: "catalog", label: "Catalog" },
] as const;
type TabKey = (typeof TABS)[number]["key"];

const SAMPLE_LABEL = "Sample dataset (customer.csv, order.csv, product.csv)";

export default function BuyerWorkbench() {
  const [dataset, setDataset] = useState<BuyerDataset | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [tab, setTab] = useState<TabKey>("customers");
  // Default to roughly a fifth of what full restocking would cost, once the
  // dataset loads — enough budget to see a real trade-off, not a trivial
  // "fund everything" or "fund nothing" case.
  const [restockBudget, setRestockBudget] = useState(1_000_000);

  const [sourceLabel, setSourceLabel] = useState(SAMPLE_LABEL);
  const [uploadStatus, setUploadStatus] = useState<"idle" | "loading">("idle");
  // Separate from `error` above: a bad upload shouldn't blank the page and
  // lose whatever dataset was already loaded — it just reports inline in
  // the data panel and leaves the current dataset in place.
  const [uploadError, setUploadError] = useState<string | null>(null);

  useEffect(() => {
    loadBuyerDataset()
      .then(setDataset)
      .catch(() => setError("Couldn't load the buyer-side sample dataset."));
  }, []);

  function handleLoadSample() {
    setUploadStatus("loading");
    setUploadError(null);
    loadBuyerDataset()
      .then((d) => {
        setDataset(d);
        setSourceLabel(SAMPLE_LABEL);
      })
      .catch(() => setUploadError("Couldn't reload the sample dataset."))
      .finally(() => setUploadStatus("idle"));
  }

  async function handleLoadFiles({ customer, order, product }: { customer: File; order: File; product: File }) {
    setUploadStatus("loading");
    setUploadError(null);
    try {
      const [customerText, orderText, productText] = await Promise.all([customer.text(), order.text(), product.text()]);
      const parsed = parseBuyerDataset(customerText, orderText, productText);
      const empty: string[] = [];
      if (parsed.customers.length === 0) empty.push("customers file");
      if (parsed.orders.length === 0) empty.push("orders file");
      if (parsed.products.length === 0) empty.push("products file");
      if (empty.length > 0) {
        setUploadError(`No usable rows found in the ${empty.join(", ")} — check the columns are in the same order as the sample (see above).`);
        return;
      }
      setDataset(parsed);
      setSourceLabel(`Your files — ${customer.name}, ${order.name}, ${product.name}`);
    } catch {
      setUploadError("Couldn't read one of those files as a CSV.");
    } finally {
      setUploadStatus("idle");
    }
  }

  const segments = useMemo(() => (dataset ? computeSegments(dataset) : null), [dataset]);
  const funnel = useMemo(() => (dataset ? computeFunnel(dataset) : null), [dataset]);
  const catalog = useMemo(() => (dataset ? computeCatalog(dataset) : null), [dataset]);
  const restockPlan = useMemo(() => (dataset ? solveRestockLP(dataset, restockBudget) : null), [dataset, restockBudget]);

  return (
    <div className="min-h-screen">
      {/* The px-4 pt-4 gap above the card is padding, not margin, so it needs
          its own background — without one, whatever scrolls underneath shows
          through the top strip of the viewport instead of being hidden
          behind the "floating" header. */}
      <div
        className="sticky top-0 z-10 px-4 pt-4"
        style={{ background: "color-mix(in oklab, var(--color-surface) 55%, transparent)", backdropFilter: "blur(20px) saturate(160%)" }}
      >
        <div className="max-w-6xl mx-auto glass rounded-2xl">
          <div className="px-4 sm:px-6 h-14 flex items-center justify-between">
            <Link to="/" className="pressable flex items-center gap-2">
              <Logo className="w-5 h-5 text-accent" />
              <span className="font-semibold text-[0.9rem]">InsightIQ</span>
              <span className="font-mono text-[0.62rem] uppercase tracking-wider text-ink-muted border border-border-strong rounded-full px-2 py-0.5 ml-1">
                Buyer side
              </span>
            </Link>

            <div className="flex items-center gap-3">
              <div className="hidden sm:flex items-center gap-1 bg-surface-inset/50 rounded-xl p-1">
                {TABS.map((t) => (
                  <button
                    key={t.key}
                    onClick={() => setTab(t.key)}
                    className={`pressable text-[0.82rem] font-medium px-4 py-1.5 rounded-lg cursor-pointer transition-colors duration-150 ${
                      tab === t.key ? "bg-surface-raised text-ink" : "text-ink-muted hover:text-ink-soft"
                    }`}
                  >
                    {t.label}
                  </button>
                ))}
              </div>
              <select
                value={tab}
                onChange={(e) => setTab(e.target.value as TabKey)}
                className="sm:hidden bg-surface-raised border border-border-strong rounded-lg px-3 py-2 text-[0.82rem] text-ink"
              >
                {TABS.map((t) => (
                  <option key={t.key} value={t.key}>{t.label}</option>
                ))}
              </select>
              <ThemeToggle />
            </div>
          </div>
        </div>
      </div>

      <div className="max-w-6xl mx-auto px-6 sm:px-10 py-8">
        {error && <div className="glass rounded-2xl px-6 py-12 text-center text-ink-soft">{error}</div>}
        {!error && !dataset && <div className="glass rounded-2xl px-6 py-12 text-center text-ink-muted">Loading buyer-side data…</div>}
        {dataset && (
          <motion.div
            key={tab}
            initial={{ opacity: 0, y: 6 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ type: "spring", bounce: 0, duration: 0.4 }}
          >
            {tab === "customers" && (
              <CustomersTab
                result={segments}
                dataPanel={{
                  sourceLabel,
                  status: uploadStatus,
                  error: uploadError,
                  onLoadSample: handleLoadSample,
                  onLoadFiles: handleLoadFiles,
                }}
              />
            )}
            {tab === "orders" && <OrdersTab result={funnel} />}
            {tab === "catalog" && <CatalogTab result={catalog} restockPlan={restockPlan} restockBudget={restockBudget} setRestockBudget={setRestockBudget} />}
          </motion.div>
        )}
      </div>
    </div>
  );
}
