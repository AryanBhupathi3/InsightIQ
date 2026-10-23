import Papa from "papaparse";
import type { BuyerDataset, Customer, Order, Product } from "./types";

/** order.csv has three consecutive unlabelled columns in its header
 *  (`...,ShippedDate,ShipAddress,,,,ShipCountry,...`), which collide under
 *  header-based parsing (papaparse keys them all "" and the last one wins,
 *  silently dropping ShipAddress). Every buyer table is parsed positionally
 *  instead — by column index, skipping the header row — which sidesteps
 *  that collision entirely and doesn't depend on a header name being
 *  present or unique. */
function parseRows(text: string): string[][] {
  const result = Papa.parse<string[]>(text, { header: false, skipEmptyLines: true });
  return result.data.slice(1); // drop header row
}

const num = (v: string | undefined): number => {
  const n = Number(v);
  return Number.isFinite(n) ? n : 0;
};

/** M/D/YYYY, as used throughout order.csv. Returns NaN for anything else
 *  so a bad row fails visibly (filtered out) rather than silently becoming
 *  1970 and corrupting the recency calculation. */
function parseMDY(v: string | undefined): number {
  if (!v) return NaN;
  const m = /^(\d{1,2})\/(\d{1,2})\/(\d{4})$/.exec(v.trim());
  if (!m) return NaN;
  const [, month, day, year] = m;
  return Date.UTC(+year, +month - 1, +day);
}

function parseCustomers(text: string): Customer[] {
  // CustomerID,FirstName,LastName,Email,PhoneNumber,Address,,Country,DateOfBirth,Gender
  return parseRows(text).map((r) => ({
    customerId: r[0] ?? "",
    firstName: r[1] ?? "",
    lastName: r[2] ?? "",
    country: r[7] ?? "Unknown",
  }));
}

function parseOrders(text: string): Order[] {
  // OrderID,CustomerID,OrderDate,OrderStatus,ShippedDate,ShipAddress,,,,ShipCountry,ShippingFee,PaymentMethod,TotalAmount
  return parseRows(text)
    .map((r) => ({
      orderId: r[0] ?? "",
      customerId: r[1] ?? "",
      orderDateMs: parseMDY(r[2]),
      status: (r[3] ?? "unknown").toLowerCase(),
      shipCountry: r[9] ?? "Unknown",
      shippingFee: num(r[10]),
      paymentMethod: r[11] ?? "Unknown",
      totalAmount: num(r[12]),
    }))
    .filter((o) => o.orderId && Number.isFinite(o.orderDateMs));
}

function parseProducts(text: string): Product[] {
  // ProductID,ProductName,Category,SupplierID,UnitPrice,UnitsInStock,UnitsOnOrder,ReorderLevel,Discontinued
  return parseRows(text).map((r) => ({
    productId: r[0] ?? "",
    name: r[1] ?? "",
    category: r[2] ?? "Uncategorised",
    unitPrice: num(r[4]),
    unitsInStock: num(r[5]),
    unitsOnOrder: num(r[6]),
    reorderLevel: num(r[7]),
    discontinued: (r[8] ?? "").trim().toUpperCase() === "TRUE",
  }));
}

export async function loadBuyerDataset(): Promise<BuyerDataset> {
  const [customerText, orderText, productText] = await Promise.all([
    fetch("/data/buyer/customer.csv").then((r) => r.text()),
    fetch("/data/buyer/order.csv").then((r) => r.text()),
    fetch("/data/buyer/product.csv").then((r) => r.text()),
  ]);
  return {
    customers: parseCustomers(customerText),
    orders: parseOrders(orderText),
    products: parseProducts(productText),
  };
}
