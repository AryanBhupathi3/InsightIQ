// One-off script: builds a single richer demo CSV out of the two sample
// datasets. They don't share a real key (supply_chain uses SUP_1..SUP_10,
// procurement uses 5 named suppliers, and there's no shared SKU/PO id), so
// this isn't a join on real identity — it's an enrichment: procurement KPIs
// (negotiated price, defect rate, compliance, lead time) are aggregated per
// procurement supplier, then attached to the daily supply-chain rows via an
// explicit, documented round-robin mapping (2 of the 10 SUP_x ids per
// procurement supplier). Good enough for a demo; not a claim of real-world
// correspondence.

import fs from "fs";
import Papa from "papaparse";

const ROOT = new URL("../../", import.meta.url).pathname.replace(/^\/([a-zA-Z]):/, "$1:");

const supplyText = fs.readFileSync(`${ROOT}DataSets/supply_chain_dataset1.csv`, "utf-8");
const procText = fs.readFileSync(`${ROOT}DataSets/Procurement KPI Analysis Dataset.csv`, "utf-8");

const supply = Papa.parse(supplyText, { header: true, dynamicTyping: true, skipEmptyLines: true }).data;
const proc = Papa.parse(procText, { header: true, dynamicTyping: true, skipEmptyLines: true }).data;

// --- aggregate procurement KPIs per supplier -------------------------------
const bySupplier = new Map();
for (const r of proc) {
  const s = r.Supplier;
  if (!s) continue;
  if (!bySupplier.has(s)) bySupplier.set(s, { negotiated: [], unitPrice: [], defectRate: [], compliance: [], leadTime: [] });
  const b = bySupplier.get(s);
  if (typeof r.Negotiated_Price === "number") b.negotiated.push(r.Negotiated_Price);
  if (typeof r.Unit_Price === "number") b.unitPrice.push(r.Unit_Price);
  if (typeof r.Quantity === "number" && r.Quantity > 0) {
    const defective = typeof r.Defective_Units === "number" ? r.Defective_Units : 0;
    b.defectRate.push(defective / r.Quantity);
  }
  b.compliance.push(r.Compliance === "Yes" ? 1 : 0);
  if (r.Order_Status === "Delivered" && r.Order_Date && r.Delivery_Date) {
    const d1 = new Date(r.Order_Date), d2 = new Date(r.Delivery_Date);
    const days = (d2 - d1) / 86400000;
    if (Number.isFinite(days) && days >= 0) b.leadTime.push(days);
  }
}
const avg = (arr) => (arr.length ? arr.reduce((a, b) => a + b, 0) / arr.length : null);

const supplierProfile = {};
for (const [name, b] of bySupplier) {
  supplierProfile[name] = {
    negotiatedPrice: avg(b.negotiated),
    defectRate: avg(b.defectRate),
    complianceRate: avg(b.compliance),
    leadTimeDays: avg(b.leadTime),
  };
}

// --- explicit round-robin mapping: 2 of the 10 supply-chain supplier ids
//     per procurement supplier, purely for demo enrichment -----------------
const procSuppliers = Object.keys(supplierProfile).sort();
const supToProc = {};
for (let i = 1; i <= 10; i++) {
  supToProc[`SUP_${i}`] = procSuppliers[(i - 1) % procSuppliers.length];
}

// --- merge ------------------------------------------------------------------
const merged = supply.map((row) => {
  const procName = supToProc[row.Supplier_ID] ?? null;
  const profile = procName ? supplierProfile[procName] : null;
  return {
    ...row,
    Procurement_Supplier: procName,
    Procurement_Negotiated_Price: profile?.negotiatedPrice != null ? Number(profile.negotiatedPrice.toFixed(2)) : null,
    Procurement_Defect_Rate: profile?.defectRate != null ? Number(profile.defectRate.toFixed(4)) : null,
    Procurement_Compliance_Rate: profile?.complianceRate != null ? Number(profile.complianceRate.toFixed(4)) : null,
    Procurement_Lead_Time_Days: profile?.leadTimeDays != null ? Number(profile.leadTimeDays.toFixed(1)) : null,
  };
});

const csv = Papa.unparse(merged);
fs.writeFileSync(`${ROOT}DataSets/merged_demo_dataset.csv`, csv);
fs.writeFileSync(`${ROOT}web/public/data/merged_demo_dataset.csv`, csv);

console.log("rows:", merged.length);
console.log("mapping:", supToProc);
console.log("supplier profiles:", supplierProfile);
console.log("sample row:", merged[0]);
