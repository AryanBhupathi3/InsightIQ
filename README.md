# InsightIQ — Seller-Side Optimization

**Mathematical Framework for Business Optimization**
Team 3 — M. Rikhitha Reddy (25143) · P. Sai Chandana (25140) · G. Puran Reddy (25118) · Aryan Bhupathi (25107)

> **Scope note:** InsightIQ's overall framework covers demand, supply, and pricing decisions. This phase of the project is scoped to the **seller side only** — supplier selection, procurement cost, inventory/demand forecasting, and pricing. Buyer/customer-facing analytics (e.g. customer segmentation, order/checkout behaviour) are out of scope for now and left for a later phase.

## 1. Overview

Most BI tools describe what already happened — dashboards, reports, historical charts. InsightIQ goes a step further for the **seller**: it is a mathematical decision engine that tells a business *what to do next* — how much demand to expect, which supplier to order from, and what price to sell at — with every recommendation backed by a provable optimality condition rather than a heuristic.

This project applies core Mathematical Foundations for Computing (MFC) techniques — weighted regression, Markov chains, constrained convex optimization, KKT conditions, and gradient-based optimization — to three seller-side problems:

1. **How much of a product will sell next period?** (demand forecasting)
2. **Which supplier should I buy from, and how much?** (procurement / supplier selection)
3. **What price should I sell at to maximize profit?** (pricing)

## 2. Problem Statement

Existing BI systems analyse historical sales, inventory, and supplier data but stop at descriptive reporting. They do not mathematically:

- Forecast demand *with a quantified uncertainty band*,
- Select the cost-optimal supplier mix under real operational constraints (capacity, inventory, delivery, budget), or
- Prove that a chosen price is actually profit-maximizing.

Supplier optimization, demand prediction, and pricing are also typically solved as **independent** problems, leading to fragmented, inconsistent decisions on the seller side. InsightIQ unifies them into a single pipeline where each stage's output feeds the next.

## 3. Objectives (Seller-Side Phase)

- Forecast product demand using **Weighted Least Squares (WLS)** over historical sales, weighting recent periods more heavily.
- Model demand-state transitions (low / medium / high) and market uncertainty using **Markov Chains**.
- Formulate supplier selection as a **Constrained Convex Optimization** problem that minimizes procurement cost subject to cost, supplier capacity, inventory, delivery, and budget constraints.
- Verify solution optimality using **Karush-Kuhn-Tucker (KKT) conditions** (stationarity, primal/dual feasibility, complementary slackness).
- Determine the profit-maximizing selling price via **Gradient-Based Optimization**, using the forecast demand and optimal procurement cost as inputs.
- Feed realised sales back into the data layer so the forecast and every downstream decision refresh over time.

## 4. Mathematical Decision Engine — Pipeline

The engine runs in four stages, matching the project flowchart (`FC.pdf`):

```
STAGE 1 · Data Layer
  Step 1  Business data acquisition   → sales history, inventory, supplier data, demand records
  Step 2  Preprocessing & structuring → missing values handled, series aligned, demand
                                         discretised into states, recent periods weighted higher

STAGE 2 · Prediction Layer
  Step 3  Demand forecasting   (Weighted Least Squares)  → expected demand D*
  Step 4  Uncertainty modelling (Markov Chains)           → demand-state transition probabilities
          Merge → expected demand D* + uncertainty profile, passed to optimization

STAGE 3 · Optimization Layer
  Step 5  Supplier selection      (Constrained Convex Optimization)
          minimizes procurement cost s.t. cost, capacity, inventory, delivery, budget
  Step 6  Optimality check        (KKT Conditions)
          satisfied  → proceed to Step 7
          violated   → return to Step 5
  Step 7  Price optimization      (Gradient-Based Optimization)
          maximizes profit(price | D*, optimal procurement cost) until convergence

STAGE 4 · Decision Output
  Step 8  Unified, justified recommendation:
          forecast (expected demand) · sourcing (supplier mix & order qty)
          · pricing (profit-maximizing price) · justification (KKT-verified proof)

  Feedback loop → realised sales are appended to the Data Layer, re-weighting Step 2
                  and refreshing every downstream model.
```

Full diagram: [`FC.pdf`](FC.pdf). Written proposal: [`03_B.pdf`](03_B.pdf).

## 5. Datasets

Extracted from [`DataSets.zip`](DataSets.zip) into `DataSets/`. For this seller-side phase, the two datasets below are primary:

| File | Grain | Key columns | Used for |
|---|---|---|---|
| `DataSets/supply_chain_dataset1.csv` | Daily, per SKU / warehouse / supplier | `Units_Sold`, `Inventory_Level`, `Supplier_Lead_Time_Days`, `Reorder_Point`, `Order_Quantity`, `Unit_Cost`, `Unit_Price`, `Promotion_Flag`, `Stockout_Flag`, `Demand_Forecast` | Demand forecasting (WLS), Markov demand-state modelling, inventory/reorder constraints for supplier selection |
| `DataSets/Procurement KPI Analysis Dataset.csv` | Per purchase order | `Supplier`, `Order_Date`, `Delivery_Date`, `Item_Category`, `Order_Status`, `Quantity`, `Unit_Price`, `Negotiated_Price`, `Defective_Units`, `Compliance` | Supplier cost, lead-time, and reliability inputs for the constrained convex optimization (Step 5) |
| `DataSets/merged_demo_dataset.csv` | Daily, per SKU / warehouse / supplier (same grain as `supply_chain_dataset1.csv`, enriched) | All of the above, plus `Procurement_Supplier`, `Procurement_Negotiated_Price`, `Procurement_Defect_Rate`, `Procurement_Compliance_Rate`, `Procurement_Lead_Time_Days` | One-file demo of the whole pipeline. Built by `web/scripts/merge-datasets.mjs`: the two source files share no real key (10 `SUP_x` ids vs. 5 named procurement suppliers, no common SKU/PO), so this is an *enrichment*, not a join — procurement KPIs are aggregated per procurement supplier and attached via an explicit round-robin mapping (2 of the 10 `SUP_x` ids per procurement supplier), not a claim of real-world correspondence |

Also present, reserved for a later buyer-side phase (not used here):

| File | Contents |
|---|---|
| `DataSets/archive (1)/product.csv` | Product catalogue — price, stock, supplier link |
| `DataSets/archive (1)/customer.csv` | Customer records |
| `DataSets/archive (1)/order.csv` | Customer orders |
| `DataSets/archive (1)/clander.csv` | Calendar / date dimension |

## 6. The App

A React + TypeScript single-page app (`web/`) implements the full pipeline as a reactive workbench — everything recomputes live as you move a slider or swap datasets, no page reloads. It is **not hardcoded to the two sample datasets**: drop in any CSV, and column roles (demand / cost / capacity / supplier / SKU / date) are heuristically guessed from the header names and can be remapped by hand; every downstream constraint (demand range, cost, capacity per supplier, budget) is derived from whatever you mapped, live.

All the math (WLS regression, the Markov chain, the convex supplier-selection program, its KKT verification, and gradient ascent on price) is plain TypeScript in `web/src/lib/`, with no black-box solver dependency — the supplier program is solved exactly via water-filling (closed form for a separable convex QP with one equality and box constraints), so the KKT check comes back with a true zero residual rather than an approximation.

| Area | File(s) | What it does |
|---|---|---|
| Home | `src/pages/Home.tsx` | Editorial landing page with a live, running gradient-ascent demo in the hero |
| Workbench shell | `src/pages/Workbench.tsx` | Dataset state, lifted pipeline parameters, tab switching |
| Data tab | `src/components/workbench/DataTab.tsx` | Upload/sample picker, column mapping, recency-weight preview |
| Forecast tab | `.../ForecastTab.tsx` | WLS fit + forecast band, Step 3 |
| Uncertainty tab | `.../UncertaintyTab.tsx` | Markov transition matrix, steady state, n-step forecast, Step 4 |
| Supplier tab | `.../SupplierTab.tsx` | Convex QP via water-filling + live KKT check, Steps 5–6 |
| Price tab | `.../PriceTab.tsx` | Gradient ascent vs. closed-form price, Step 7 |
| Decision tab | `.../DecisionTab.tsx` | Runs the whole pipeline for one SKU, unified recommendation, Step 8 |
| Math core | `src/lib/{stats,markov,optimization,pricing}.ts` | WLS, Markov chain, supplier QP + KKT, price ascent — UI-free |
| Data ingestion | `src/lib/csv.ts`, `src/lib/series.ts` | CSV parsing, column-role inference, constraint derivation from any schema |

### Running it locally

```bash
cd web
npm install
npm run dev
```

Opens at `http://localhost:5173`. Requires Node.js.

## 7. Repository Contents

```
InsightIQ/
├── README.md                          this file
├── FC.pdf                             process flowchart — mathematical framework
├── 03_B.pdf                           written project proposal
├── web/                                the app
│   ├── src/
│   │   ├── pages/                     Home.tsx, Workbench.tsx
│   │   ├── components/workbench/      one component per pipeline step (see table above)
│   │   ├── components/                Atoms.tsx, FormulaBlock.tsx, UploadPanel.tsx, LiveDemo.tsx
│   │   ├── lib/                       all the math + CSV/column-mapping logic, UI-free
│   │   └── state/DatasetContext.tsx   dataset/mapping/constraints, shared via React context
│   └── public/data/                   the two sample CSVs, fetched like any upload
└── DataSets/
    ├── supply_chain_dataset1.csv
    ├── Procurement KPI Analysis Dataset.csv
    └── archive (1)/                   buyer-side data, reserved for a later phase
```

## 8. Status

Framework, datasets, and the full React app (all 4 stages / 8 steps) are implemented, generalized to arbitrary CSV schemas, and running locally. Not yet deployed — that's intentionally out of scope for now.

## 9. Team

Team 3 — Mathematical Foundations for Computing (MFC)
M. Rikhitha Reddy (25143) · P. Sai Chandana (25140) · G. Puran Reddy (25118) · Aryan Bhupathi (25107)
