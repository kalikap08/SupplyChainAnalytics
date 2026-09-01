"use client";

import { useState } from "react";
import PageShell from "@/components/PageShell";
import KpiCard from "@/components/KpiCard";
import SectionCard from "@/components/SectionCard";
import DataTable from "@/components/DataTable";
import Tabs from "@/components/Tabs";
import DrilldownModal from "@/components/DrilldownModal";
import BarChartCard from "@/components/charts/BarChartCard";
import RadialGaugeChartCard from "@/components/charts/RadialGaugeChartCard";
import { fetchLogisticsData, fetchLogisticsShipments } from "@/lib/api";
import { formatINR, formatNumber, formatPercent } from "@/lib/format";
import { shipmentColumns } from "@/lib/drilldownColumns";
import type { LogisticsRow, ShipmentRow } from "@/types/analytics";
import { IconTruck, IconShippingCost, IconDelivery } from "@/components/icons";

export default function LogisticsPage() {
  const [shipmentsOpen, setShipmentsOpen] = useState(false);

  return (
    <PageShell
      title="Logistics"
      subtitle="Shipments, carrier performance, and delivery timeliness"
      fetcher={fetchLogisticsData}
    >
      {(rows) => {
        const byWarehouse = rows
          .filter((r) => r.analysis_type === "WAREHOUSE")
          .slice()
          .sort((a, b) => b.total_shipments - a.total_shipments);
        const byCarrier = rows
          .filter((r) => r.analysis_type === "CARRIER")
          .slice()
          .sort((a, b) => b.on_time_delivery_percent - a.on_time_delivery_percent);

        const totalShipments = byWarehouse.reduce(
          (sum, r) => sum + r.total_shipments,
          0
        );
        const totalShippingCost = byWarehouse.reduce(
          (sum, r) => sum + r.total_shipping_cost,
          0
        );
        const totalOnTime = byWarehouse.reduce(
          (sum, r) => sum + r.on_time_shipments,
          0
        );
        const onTimePercent =
          totalShipments > 0 ? (totalOnTime / totalShipments) * 100 : 0;
        const avgDeliveryDays =
          byWarehouse.length > 0
            ? byWarehouse.reduce((sum, r) => sum + r.average_delivery_days, 0) /
              byWarehouse.length
            : 0;

        return (
          <div className="space-y-6">
            <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-4">
              <KpiCard
                label="Total Shipments"
                value={formatNumber(totalShipments)}
                description="Shipments dispatched across all warehouses"
                icon={IconTruck}
                accent="cyan"
                onClick={() => setShipmentsOpen(true)}
              />
              <KpiCard
                label="Total Shipping Cost"
                value={formatINR(totalShippingCost)}
                description="Total cost of shipments"
                icon={IconShippingCost}
                accent="amber"
                onClick={() => setShipmentsOpen(true)}
              />
              <KpiCard
                label="On-Time Delivery"
                value={formatPercent(onTimePercent)}
                description="Shipments delivered by expected date"
                icon={IconDelivery}
                accent="emerald"
                onClick={() => setShipmentsOpen(true)}
              />
              <KpiCard
                label="Avg Delivery Days"
                value={avgDeliveryDays.toFixed(2)}
                description="Average delivery time in days"
                icon={IconTruck}
                accent="blue"
                onClick={() => setShipmentsOpen(true)}
              />
            </div>

            <SectionCard title="Logistics Breakdown">
              <Tabs
                tabs={[
                  {
                    id: "carrier",
                    label: "By Carrier",
                    content: (
                      <div className="space-y-6">
                        <RadialGaugeChartCard
                          data={byCarrier.map((r) => ({
                            label: r.carrier_name ?? r.carrier_id ?? r.analysis_key,
                            value: r.on_time_delivery_percent,
                          }))}
                          valueFormatter={(v) => formatPercent(v)}
                        />
                        <DataTable<LogisticsRow>
                          rowKey={(r) => r.analysis_key}
                          rows={byCarrier}
                          columns={[
                            {
                              key: "carrier",
                              header: "Carrier",
                              render: (r) => r.carrier_name ?? r.carrier_id ?? r.analysis_key,
                            },
                            {
                              key: "shipments",
                              header: "Shipments",
                              align: "right",
                              render: (r) => formatNumber(r.total_shipments),
                            },
                            {
                              key: "ontime",
                              header: "On-Time",
                              align: "right",
                              render: (r) => formatPercent(r.on_time_delivery_percent),
                            },
                            {
                              key: "avgdays",
                              header: "Avg Delivery Days",
                              align: "right",
                              render: (r) => r.average_delivery_days.toFixed(2),
                            },
                            {
                              key: "cost",
                              header: "Shipping Cost",
                              align: "right",
                              render: (r) => formatINR(r.total_shipping_cost),
                            },
                          ]}
                        />
                      </div>
                    ),
                  },
                  {
                    id: "warehouse",
                    label: "By Warehouse",
                    content: (
                      <BarChartCard
                        data={byWarehouse.map((r) => ({
                          label: r.warehouse_name ?? r.analysis_key,
                          value: r.total_shipping_cost,
                        }))}
                        valueFormatter={(v) => formatINR(v)}
                        color="#2563EB"
                      />
                    ),
                  },
                ]}
              />
            </SectionCard>

            <DrilldownModal<ShipmentRow>
              open={shipmentsOpen}
              onClose={() => setShipmentsOpen(false)}
              title="All Shipments"
              description="Every shipment behind the KPIs above — searchable by shipment, order, carrier, or warehouse."
              columns={shipmentColumns}
              rowKey={(r) => r.shipment_id}
              fetcher={fetchLogisticsShipments}
              searchPlaceholder="Search shipment ID, order ID, carrier, warehouse…"
            />
          </div>
        );
      }}
    </PageShell>
  );
}
