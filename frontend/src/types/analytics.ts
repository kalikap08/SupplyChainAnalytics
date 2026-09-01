/**
 * Shape of the payload returned by GET /api/executive.
 * Keep this in sync with the FastAPI response model — do not add
 * fields here that the backend does not actually return.
 */
export interface ExecutiveData {
  total_orders: number;
  total_units_sold: number;
  total_revenue: number;
  total_purchase_orders: number;
  total_procurement_value: number;
  supplier_fill_rate_percent: number;
  total_inventory_value: number;
  total_closing_stock: number;
  stockout_records: number;
  total_shipments: number;
  total_shipping_cost: number;
  on_time_delivery_percent: number;
  total_returns: number;
  total_returned_units: number;
  total_refund_value: number;
  return_rate_percent: number;
}

export type FetchState<T> =
  | { status: "loading" }
  | { status: "error"; message: string }
  | { status: "success"; data: T };

/** Row shape returned by GET /api/sales (vw_sales_demand). */
export interface SalesRow {
  analysis_type: "MONTHLY" | "PRODUCT" | "WAREHOUSE" | string;
  analysis_key: string;
  product_id: string | null;
  product_name: string | null;
  category: string | null;
  subcategory: string | null;
  brand: string | null;
  warehouse_id: string | null;
  warehouse_name: string | null;
  warehouse_type: string | null;
  total_orders: number;
  units_sold: number;
  revenue: number;
  average_order_value: number;
}

/** Row shape returned by GET /api/inventory (vw_inventory_analysis). */
export interface InventoryRow {
  analysis_type: "PRODUCT" | "WAREHOUSE" | string;
  analysis_key: string;
  product_id: string | null;
  product_name: string | null;
  category: string | null;
  subcategory: string | null;
  brand: string | null;
  warehouse_id: string | null;
  warehouse_name: string | null;
  warehouse_type: string | null;
  inventory_value: number;
  closing_stock: number;
  received_qty: number;
  sold_qty: number;
  damaged_qty: number;
  stockout_records: number;
  stockout_shortfall_units: number;
  stockout_rate_percent: number;
}

/** Row shape returned by GET /api/procurement (vw_procurement_analysis). */
export interface ProcurementRow {
  po_id: string;
  supplier_id: string;
  product_id: string;
  warehouse_id: string;
  order_date: string;
  expected_delivery_date: string;
  actual_delivery_date: string;
  ordered_qty: number;
  received_qty: number;
  outstanding_qty: number;
  unit_cost: number;
  po_value: number;
  calculated_po_value: number;
  po_value_difference: number;
  fill_rate_percent: number;
  delivery_days: number;
  expected_delivery_days: number;
  delivery_delay_days: number;
  delivery_status: "ON_TIME" | "LATE" | string;
}

/** Row shape returned by GET /api/logistics (vw_logistics_analysis). */
export interface LogisticsRow {
  analysis_type: "CARRIER" | "WAREHOUSE" | string;
  analysis_key: string;
  carrier_id: string | null;
  carrier_name: string | null;
  warehouse_id: string | null;
  warehouse_name: string | null;
  total_shipments: number;
  total_shipping_cost: number;
  average_distance_km: number;
  average_delivery_days: number;
  on_time_shipments: number;
  late_shipments: number;
  on_time_delivery_percent: number;
}

/** Row shape returned by GET /api/returns (vw_returns_analysis). */
export interface ReturnsRow {
  analysis_type: "PRODUCT" | "WAREHOUSE" | "REASON" | string;
  analysis_key: string;
  product_id: string | null;
  product_name: string | null;
  category: string | null;
  subcategory: string | null;
  warehouse_id: string | null;
  warehouse_name: string | null;
  return_reason: string | null;
  return_count: number;
  returned_units: number;
  refund_value: number;
}

/** Generic envelope returned by every paginated drill-down endpoint (orders, records, shipments). */
export interface PaginatedResult<T> {
  page: number;
  page_size: number;
  total: number;
  rows: T[];
}

/** Row shape returned by GET /api/sales/orders. */
export interface SalesOrderRow {
  order_id: string;
  order_date: string;
  product_id: string;
  product_name: string | null;
  customer_id: string;
  warehouse_id: string;
  warehouse_name: string | null;
  quantity: number;
  unit_price: number;
  discount_rate: number;
  sales_value: number;
}

/** Row shape returned by GET /api/inventory/records. */
export interface InventoryRecordRow {
  inventory_date: string;
  product_id: string;
  product_name: string | null;
  warehouse_id: string;
  warehouse_name: string | null;
  opening_stock: number;
  received_qty: number;
  sold_qty: number;
  damaged_qty: number;
  closing_stock: number;
  inventory_value: number;
  stockout_flag: boolean;
}

/** Row shape returned by GET /api/procurement/orders. */
export interface ProcurementOrderRow {
  po_id: string;
  order_date: string;
  expected_delivery_date: string;
  actual_delivery_date: string;
  supplier_id: string;
  supplier_name: string | null;
  product_id: string;
  product_name: string | null;
  warehouse_id: string;
  warehouse_name: string | null;
  ordered_qty: number;
  received_qty: number;
  unit_cost: number;
  po_value: number;
  delivery_status: "ON_TIME" | "LATE" | string;
}

/** Row shape returned by GET /api/logistics/shipments. */
export interface ShipmentRow {
  shipment_id: string;
  order_id: string;
  warehouse_id: string;
  warehouse_name: string | null;
  carrier_id: string;
  carrier_name: string | null;
  dispatch_date: string;
  expected_delivery_date: string;
  actual_delivery_date: string;
  distance_km: number;
  shipping_cost: number;
  delivery_status: string;
}

/** Row shape returned by GET /api/returns/records. */
export interface ReturnRecordRow {
  return_id: string;
  order_id: string;
  product_id: string;
  product_name: string | null;
  customer_id: string;
  warehouse_id: string;
  warehouse_name: string | null;
  return_date: string;
  returned_qty: number;
  return_reason: string;
  refund_value: number;
}
