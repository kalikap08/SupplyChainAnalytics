import type { DataTableColumn } from "@/components/DataTable";
import { formatINR, formatNumber, formatPercent } from "@/lib/format";
import type {
  SalesOrderRow,
  InventoryRecordRow,
  ProcurementOrderRow,
  ShipmentRow,
  ReturnRecordRow,
} from "@/types/analytics";

export const salesOrderColumns: DataTableColumn<SalesOrderRow>[] = [
  { key: "order_id", header: "Order ID", render: (r) => r.order_id },
  { key: "order_date", header: "Date", render: (r) => r.order_date },
  { key: "product", header: "Product", render: (r) => r.product_name ?? r.product_id },
  { key: "customer", header: "Customer", render: (r) => r.customer_id },
  { key: "warehouse", header: "Warehouse", render: (r) => r.warehouse_name ?? r.warehouse_id },
  { key: "quantity", header: "Qty", align: "right", render: (r) => formatNumber(r.quantity) },
  {
    key: "discount",
    header: "Discount",
    align: "right",
    render: (r) => formatPercent(r.discount_rate * 100),
  },
  { key: "value", header: "Sales Value", align: "right", render: (r) => formatINR(r.sales_value) },
];

export const inventoryRecordColumns: DataTableColumn<InventoryRecordRow>[] = [
  { key: "date", header: "Date", render: (r) => r.inventory_date },
  { key: "product", header: "Product", render: (r) => r.product_name ?? r.product_id },
  { key: "warehouse", header: "Warehouse", render: (r) => r.warehouse_name ?? r.warehouse_id },
  { key: "opening", header: "Opening", align: "right", render: (r) => formatNumber(r.opening_stock) },
  { key: "received", header: "Received", align: "right", render: (r) => formatNumber(r.received_qty) },
  { key: "sold", header: "Sold", align: "right", render: (r) => formatNumber(r.sold_qty) },
  { key: "closing", header: "Closing", align: "right", render: (r) => formatNumber(r.closing_stock) },
  { key: "value", header: "Value", align: "right", render: (r) => formatINR(r.inventory_value) },
  { key: "stockout", header: "Stockout", render: (r) => (r.stockout_flag ? "Yes" : "No") },
];

export const procurementOrderColumns: DataTableColumn<ProcurementOrderRow>[] = [
  { key: "po", header: "PO ID", render: (r) => r.po_id },
  { key: "supplier", header: "Supplier", render: (r) => r.supplier_name ?? r.supplier_id },
  { key: "product", header: "Product", render: (r) => r.product_name ?? r.product_id },
  { key: "warehouse", header: "Warehouse", render: (r) => r.warehouse_name ?? r.warehouse_id },
  { key: "order_date", header: "Order Date", render: (r) => r.order_date },
  { key: "ordered", header: "Ordered", align: "right", render: (r) => formatNumber(r.ordered_qty) },
  { key: "received", header: "Received", align: "right", render: (r) => formatNumber(r.received_qty) },
  { key: "value", header: "PO Value", align: "right", render: (r) => formatINR(r.po_value) },
  {
    key: "status",
    header: "Status",
    render: (r) => (r.delivery_status === "ON_TIME" ? "On Time" : "Late"),
  },
];

export const shipmentColumns: DataTableColumn<ShipmentRow>[] = [
  { key: "shipment", header: "Shipment ID", render: (r) => r.shipment_id },
  { key: "order", header: "Order ID", render: (r) => r.order_id },
  { key: "warehouse", header: "Warehouse", render: (r) => r.warehouse_name ?? r.warehouse_id },
  { key: "carrier", header: "Carrier", render: (r) => r.carrier_name ?? r.carrier_id },
  { key: "dispatch", header: "Dispatched", render: (r) => r.dispatch_date },
  { key: "actual", header: "Delivered", render: (r) => r.actual_delivery_date },
  { key: "distance", header: "Distance (km)", align: "right", render: (r) => formatNumber(r.distance_km) },
  { key: "cost", header: "Shipping Cost", align: "right", render: (r) => formatINR(r.shipping_cost) },
  { key: "status", header: "Status", render: (r) => r.delivery_status },
];

export const returnRecordColumns: DataTableColumn<ReturnRecordRow>[] = [
  { key: "return_id", header: "Return ID", render: (r) => r.return_id },
  { key: "order", header: "Order ID", render: (r) => r.order_id },
  { key: "product", header: "Product", render: (r) => r.product_name ?? r.product_id },
  { key: "warehouse", header: "Warehouse", render: (r) => r.warehouse_name ?? r.warehouse_id },
  { key: "date", header: "Return Date", render: (r) => r.return_date },
  { key: "reason", header: "Reason", render: (r) => r.return_reason },
  { key: "qty", header: "Returned Qty", align: "right", render: (r) => formatNumber(r.returned_qty) },
  { key: "refund", header: "Refund Value", align: "right", render: (r) => formatINR(r.refund_value) },
];
