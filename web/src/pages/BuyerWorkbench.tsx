import { useEffect, useMemo, useState } from "react";
import { Link } from "react-router-dom";
import { motion } from "framer-motion";
import Logo from "../components/Logo";
import ThemeToggle from "../components/ThemeToggle";
import { loadBuyerDataset } from "../lib/buyer/parse";
import { computeSegments } from "../lib/buyer/segments";
import { computeFunnel } from "../lib/buyer/funnel";
import { computeCatalog } from "../lib/buyer/catalog";
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

export default function BuyerWorkbench() {
  const [dataset, setDataset] = useState<BuyerDataset | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [tab, setTab] = useState<TabKey>("customers");

  useEffect(() => {
    loadBuyerDataset()
      .then(setDataset)
      .catch(() => setError("Couldn't load the buyer-side sample dataset."));
  }, []);

  const segments = useMemo(() => (dataset ? computeSegments(dataset) : null), [dataset]);
  const funnel = useMemo(() => (dataset ? computeFunnel(dataset) : null), [dataset]);
  const catalog = useMemo(() => (dataset ? computeCatalog(dataset) : null), [dataset]);

  return (
    <div className="min-h-screen">
      <div className="sticky top-0 z-10 px-4 pt-4">
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
            {tab === "customers" && <CustomersTab result={segments} />}
            {tab === "orders" && <OrdersTab result={funnel} />}
            {tab === "catalog" && <CatalogTab result={catalog} />}
          </motion.div>
        )}
      </div>
    </div>
  );
}
