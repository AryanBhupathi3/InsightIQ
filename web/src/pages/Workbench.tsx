import { useMemo, useState } from "react";
import { Link } from "react-router-dom";
import { motion } from "framer-motion";
import { useDataset } from "../state/DatasetContext";
import { buildSeries, entityValues } from "../lib/series";
import { fitWls, forecastHorizon } from "../lib/stats";
import { fitMarkov, nStepDistribution } from "../lib/markov";
import { solveSupplierSelection, kktReport } from "../lib/optimization";
import { gradientAscent } from "../lib/pricing";
import DataTab from "../components/workbench/DataTab";
import ForecastTab from "../components/workbench/ForecastTab";
import UncertaintyTab from "../components/workbench/UncertaintyTab";
import SupplierTab from "../components/workbench/SupplierTab";
import PriceTab from "../components/workbench/PriceTab";
import DecisionTab from "../components/workbench/DecisionTab";

export type WorkbenchShared = ReturnType<typeof useWorkbenchState> & { goToData: () => void };

function useWorkbenchState() {
  const { dataset, mapping, constraints } = useDataset();

  const entities = useMemo(() => (dataset ? entityValues(dataset, mapping) : []), [dataset, mapping]);
  const [entity, setEntity] = useState<string | null>(null);
  const activeEntity = entity ?? entities[0] ?? null;

  const [horizon, setHorizon] = useState(30);
  const [halflife, setHalflife] = useState(14);
  const [gamma, setGamma] = useState(0.002);
  const [budgetMult, setBudgetMult] = useState(1.6);
  const [epsilon, setEpsilon] = useState(1.8);
  const [lr, setLr] = useState(0.15);

  const series = useMemo(
    () => (dataset && mapping.demand ? buildSeries(dataset, mapping, activeEntity) : null),
    [dataset, mapping, activeEntity]
  );

  const wls = useMemo(() => (series && series.y.length > 2 ? fitWls(series.t, series.y, halflife) : null), [series, halflife]);
  const forecast = useMemo(
    () => (wls && series ? forecastHorizon(wls, series.t[series.t.length - 1], horizon) : null),
    [wls, series, horizon]
  );
  const dStarDaily = forecast ? forecast.point[forecast.point.length - 1] : null;
  const dStarMonthly = dStarDaily ? Math.max(Math.round(dStarDaily * 30), 1) : null;

  const markov = useMemo(() => (series && series.y.length > 5 ? fitMarkov(series.y) : null), [series]);
  const currentState = markov ? markov.stateSeq[markov.stateSeq.length - 1] : null;
  const nStep = useMemo(
    () => (markov && currentState !== null ? nStepDistribution(markov.transitionMatrix, currentState, Math.min(horizon, 30)) : null),
    [markov, currentState, horizon]
  );

  const groups = constraints?.groups ?? [];
  const demandForSupplier = dStarMonthly ?? (constraints ? Math.round(constraints.demandMean * 30) : 1000);
  const minCost = groups.length ? Math.min(...groups.map((g) => g.cost)) : 1;
  const budget = demandForSupplier * minCost * budgetMult;

  const supplierSolution = useMemo(
    () =>
      groups.length > 0
        ? solveSupplierSelection(groups.map((g) => g.name), groups.map((g) => g.cost), groups.map((g) => g.capacity), demandForSupplier, budget, gamma)
        : null,
    [groups, demandForSupplier, budget, gamma]
  );
  const kkt = supplierSolution ? kktReport(supplierSolution) : null;

  const costPerUnit = supplierSolution ? supplierSolution.totalCost / Math.max(supplierSolution.x.reduce((a, b) => a + b, 0), 1) : constraints?.costMean ?? 10;
  const pRef = costPerUnit * 1.6;
  const priceResult = useMemo(
    () => gradientAscent(costPerUnit, demandForSupplier, pRef, epsilon, lr, 60),
    [costPerUnit, demandForSupplier, pRef, epsilon, lr]
  );

  return {
    dataset, mapping, constraints, entities, activeEntity, setEntity,
    horizon, setHorizon, halflife, setHalflife,
    series, wls, forecast, dStarDaily, dStarMonthly,
    markov, currentState, nStep,
    groups, gamma, setGamma, budgetMult, setBudgetMult, budget, supplierSolution, kkt,
    epsilon, setEpsilon, lr, setLr, costPerUnit, priceResult,
  };
}

const TABS = [
  { key: "data", label: "Data" },
  { key: "forecast", label: "Forecast" },
  { key: "uncertainty", label: "Uncertainty" },
  { key: "supplier", label: "Supplier" },
  { key: "price", label: "Price" },
  { key: "decision", label: "Decision" },
] as const;
type TabKey = (typeof TABS)[number]["key"];

export default function Workbench() {
  const [tab, setTab] = useState<TabKey>("data");
  const shared = { ...useWorkbenchState(), goToData: () => setTab("data") };

  return (
    <div className="min-h-screen bg-bg">
      <div className="border-b border-border sticky top-0 bg-bg/90 backdrop-blur-sm z-10">
        <div className="max-w-6xl mx-auto px-6 sm:px-10 h-14 flex items-center justify-between">
          <Link to="/" className="flex items-center gap-2">
            <span className="w-2 h-2 rounded-sm bg-accent" />
            <span className="font-semibold text-[0.9rem]">InsightIQ</span>
          </Link>
          <div className="flex items-center gap-1">
            {TABS.map((t) => (
              <button
                key={t.key}
                onClick={() => setTab(t.key)}
                className={`relative text-[0.82rem] font-medium px-3 py-1.5 rounded-lg transition-colors cursor-pointer ${
                  tab === t.key ? "text-ink" : "text-ink-muted hover:text-ink-soft"
                }`}
              >
                {tab === t.key && (
                  <motion.span layoutId="tab-pill" className="absolute inset-0 bg-surface-raised rounded-lg" transition={{ duration: 0.25 }} />
                )}
                <span className="relative">{t.label}</span>
              </button>
            ))}
          </div>
        </div>
      </div>

      <div className="max-w-6xl mx-auto px-6 sm:px-10 py-8">
          <motion.div
            key={tab}
            initial={{ opacity: 0, y: 6 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.22, ease: [0.16, 1, 0.3, 1] }}
          >
            {tab === "data" && <DataTab {...shared} />}
            {tab === "forecast" && <ForecastTab {...shared} />}
            {tab === "uncertainty" && <UncertaintyTab {...shared} />}
            {tab === "supplier" && <SupplierTab {...shared} />}
            {tab === "price" && <PriceTab {...shared} />}
            {tab === "decision" && <DecisionTab {...shared} />}
          </motion.div>
      </div>
    </div>
  );
}
