"use client";

import { useState } from "react";
import PageShell from "@/components/PageShell";
import KpiCard from "@/components/KpiCard";
import ExecutiveSummary from "@/components/ExecutiveSummary";
import DrilldownModal from "@/components/DrilldownModal";
import {
  fetchExecutiveData,
  fetchSalesOrders,
  fetchInventoryRecords,
  fetchProcurementOrders,
  fetchLogisticsShipments,
  fetchReturnsRecords,
} from "@/lib/api";
import {
  salesOrderColumns,
  inventoryRecordColumns,
  procurementOrderColumns,
  shipmentColumns,
  returnRecordColumns,
} from "@/lib/drilldownColumns";
import { formatINR, formatNumber, formatPercent } from "@/lib/format";
import type {
  ExecutiveData,
  SalesOrderRow,
  InventoryRecordRow,
  ProcurementOrderRow,
  ShipmentRow,
  ReturnRecordRow,
} from "@/types/analytics";
import {
  IconRevenue,
  IconOrders,
  IconUnits,
  IconProcurement,
  IconInventory,
  IconFillRate,
  IconDelivery,
  IconReturnRate,
  IconShippingCost,
  IconReturns,
  IconReturnedUnits,
  IconStockout,
} from "@/components/icons";

type Domain = "sales" | "inventory" | "procurement" | "logistics" | "returns";

export default function ExecutivePage() {
  const [openDomain, setOpenDomain] = useState<Domain | null>(null);

  return (
    <PageShell
      title="Executive Overview"
      subtitle="Supply chain performance at a glance"
      fetcher={fetchExecutiveData}
    >
      {(data) => (
        <div className="space-y-6">
          {buildKpiRows(data).map((row, i) => (
            <div
              key={i}
              className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-4"
            >
              {row.map((card) => (
                <KpiCard
                  key={card.label}
                  label={card.label}
                  value={card.value}
                  description={card.description}
                  icon={card.icon}
                  accent={card.accent}
                  onClick={() => setOpenDomain(card.domain)}
                />
              ))}
            </div>
          ))}

          <ExecutiveSummary data={data} />

          <DrilldownModal<SalesOrderRow>
            open={openDomain === "sales"}
            onClose={() => setOpenDomain(null)}
            title="All Sales Orders"
            description="Every order line behind the KPIs above."
            columns={salesOrderColumns}
            rowKey={(r) => r.order_id}
            fetcher={fetchSalesOrders}
            searchPlaceholder="Search order ID, customer, product, warehouse…"
          />
          <DrilldownModal<InventoryRecordRow>
            open={openDomain === "inventory"}
            onClose={() => setOpenDomain(null)}
            title="All Inventory Records"
            description="Every daily product/warehouse snapshot behind the KPIs above."
            columns={inventoryRecordColumns}
            rowKey={(r) => `${r.inventory_date}-${r.product_id}-${r.warehouse_id}`}
            fetcher={fetchInventoryRecords}
            searchPlaceholder="Search product or warehouse…"
          />
          <DrilldownModal<ProcurementOrderRow>
            open={openDomain === "procurement"}
            onClose={() => setOpenDomain(null)}
            title="All Purchase Orders"
            description="Every purchase order behind the KPIs above."
            columns={procurementOrderColumns}
            rowKey={(r) => r.po_id}
            fetcher={fetchProcurementOrders}
            searchPlaceholder="Search PO ID, supplier, product, warehouse…"
          />
          <DrilldownModal<ShipmentRow>
            open={openDomain === "logistics"}
            onClose={() => setOpenDomain(null)}
            title="All Shipments"
            description="Every shipment behind the KPIs above."
            columns={shipmentColumns}
            rowKey={(r) => r.shipment_id}
            fetcher={fetchLogisticsShipments}
            searchPlaceholder="Search shipment ID, order ID, carrier, warehouse…"
          />
          <DrilldownModal<ReturnRecordRow>
            open={openDomain === "returns"}
            onClose={() => setOpenDomain(null)}
            title="All Return Records"
            description="Every return behind the KPIs above."
            columns={returnRecordColumns}
            rowKey={(r) => r.return_id}
            fetcher={fetchReturnsRecords}
            searchPlaceholder="Search return ID, order ID, product, reason…"
          />
        </div>
      )}
    </PageShell>
  );
}

function buildKpiRows(data: ExecutiveData) {
  return [
    [
      {
        label: "Total Revenue",
        value: formatINR(data.total_revenue),
        description: "Total sales revenue",
        icon: IconRevenue,
        accent: "emerald" as const,
        domain: "sales" as Domain,
      },
      {
        label: "Total Orders",
        value: formatNumber(data.total_orders),
        description: "Total number of sales orders",
        icon: IconOrders,
        accent: "blue" as const,
        domain: "sales" as Domain,
      },
      {
        label: "Units Sold",
        value: formatNumber(data.total_units_sold),
        description: "Total units sold across all orders",
        icon: IconUnits,
        accent: "blue" as const,
        domain: "sales" as Domain,
      },
      {
        label: "Procurement Value",
        value: formatINR(data.total_procurement_value),
        description: "Total value of goods procured",
        icon: IconProcurement,
        accent: "violet" as const,
        domain: "procurement" as Domain,
      },
    ],
    [
      {
        label: "Inventory Value",
        value: formatINR(data.total_inventory_value),
        description: "Total value of current inventory",
        icon: IconInventory,
        accent: "amber" as const,
        domain: "inventory" as Domain,
      },
      {
        label: "Supplier Fill Rate",
        value: formatPercent(data.supplier_fill_rate_percent),
        description: "Percentage of ordered quantity received",
        icon: IconFillRate,
        accent: "violet" as const,
        domain: "procurement" as Domain,
      },
      {
        label: "On-Time Delivery",
        value: formatPercent(data.on_time_delivery_percent),
        description: "Shipments delivered by expected date",
        icon: IconDelivery,
        accent: "cyan" as const,
        domain: "logistics" as Domain,
      },
      {
        label: "Return Rate",
        value: formatPercent(data.return_rate_percent),
        description: "Orders resulting in returns",
        icon: IconReturnRate,
        accent: "rose" as const,
        domain: "returns" as Domain,
      },
    ],
    [
      {
        label: "Shipping Cost",
        value: formatINR(data.total_shipping_cost),
        description: "Total cost of shipments",
        icon: IconShippingCost,
        accent: "cyan" as const,
        domain: "logistics" as Domain,
      },
      {
        label: "Total Returns",
        value: formatNumber(data.total_returns),
        description: "Total number of returned orders",
        icon: IconReturns,
        accent: "rose" as const,
        domain: "returns" as Domain,
      },
      {
        label: "Returned Units",
        value: formatNumber(data.total_returned_units),
        description: "Total units returned by customers",
        icon: IconReturnedUnits,
        accent: "rose" as const,
        domain: "returns" as Domain,
      },
      {
        label: "Stockout Records",
        value: formatNumber(data.stockout_records),
        description: "Recorded instances of stock unavailability",
        icon: IconStockout,
        accent: "amber" as const,
        domain: "inventory" as Domain,
      },
    ],
  ];
}
