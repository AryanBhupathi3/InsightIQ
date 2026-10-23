/** Buyer-side data model — a fixed, known schema (unlike the seller side's
 *  arbitrary-CSV column mapping), so these are concrete types, not inferred
 *  roles. Three tables are loaded; a fourth (the calendar file) is skipped
 *  entirely — see parse.ts for why. */

export interface Customer {
  customerId: string;
  firstName: string;
  lastName: string;
  country: string;
}

export interface Order {
  orderId: string;
  customerId: string;
  orderDateMs: number;
  status: string;
  shipCountry: string;
  shippingFee: number;
  paymentMethod: string;
  totalAmount: number;
}

export interface Product {
  productId: string;
  name: string;
  category: string;
  unitPrice: number;
  unitsInStock: number;
  unitsOnOrder: number;
  reorderLevel: number;
  discontinued: boolean;
}

export interface BuyerDataset {
  customers: Customer[];
  orders: Order[];
  products: Product[];
}
