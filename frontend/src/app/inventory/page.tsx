"use client";

import { useState } from "react";
import PageShell from "@/components/PageShell";
import KpiCard from "@/components/KpiCard";
import SectionCard from "@/components/SectionCard";
import DataTable from "@/components/DataTable";
import Tabs from "@/components/Tabs";
import DrilldownModal from "@/components/DrilldownModal";
import BarChartCard from "@/components/charts/BarChartCard";
import PieChartCard from "@/components/charts/PieChartCard";
import { fetchInventoryData, fetchInventoryRecords } from "@/lib/api";
import { formatINR, formatNumber, formatPercent } from "@/lib/format";
import { inventoryRecordColumns } from "@/lib/drilldownColumns";
import type { InventoryRow, InventoryRecordRow } from "@/types/analytics";
import {
  IconInventory,
  IconUnits,
  IconStockout,
  IconFillRate,
} from "@/components/icons";

export default function InventoryPage() {
  const [recordsOpen, setRecordsOpen] = useState(false);

  return (
    <PageShell
      title="Inventory"
      subtitle="Stock levels, valuation, and stockout exposure"
      fetcher={fetchInventoryData}
    >
      {(rows) => {
        const byWarehouse = rows
          .filter((r) => r.analysis_type === "WAREHOUSE")
          .slice()
          .sort((a, b) => b.inventory_value - a.inventory_value);
        const byProduct = rows
          .filter((r) => r.analysis_type === "PRODUCT")
          .slice();

        const totalInventoryValue = byWarehouse.reduce(
          (sum, r) => sum + r.inventory_value,
          0
        );
        const totalClosingStock = byWarehouse.reduce(
          (sum, r) => sum + r.closing_stock,
          0
        );
        const totalStockoutRecords = byWarehouse.reduce(
          (sum, r) => sum + r.stockout_records,
          0
        );
        const avgStockoutRate =
          byProduct.length > 0
            ? byProduct.reduce((sum, r) => sum + r.stockout_rate_percent, 0) /
              byProduct.length
            : 0;

        const topByValue = byProduct
          .slice()
          .sort((a, b) => b.inventory_value - a.inventory_value)
          .slice(0, 10);
        const topByStockoutRate = byProduct
          .slice()
          .sort((a, b) => b.stockout_rate_percent - a.stockout_rate_percent)
          .slice(0, 10);

        return (
          <div className="space-y-6">
            <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-4">
              <KpiCard
                label="Total Inventory Value"
                value={formatINR(totalInventoryValue)}
                description="Value of stock on hand across warehouses"
                icon={IconInventory}
                accent="amber"
                onClick={() => setRecordsOpen(true)}
              />
              <KpiCard
                label="Total Closing Stock"
                value={formatNumber(totalClosingStock)}
                description="Units in stock at period close"
                icon={IconUnits}
                accent="blue"
                onClick={() => setRecordsOpen(true)}
              />
              <KpiCard
                label="Stockout Records"
                value={formatNumber(totalStockoutRecords)}
                description="Recorded instances of stock unavailability"
                icon={IconStockout}
                accent="rose"
                onClick={() => setRecordsOpen(true)}
              />
              <KpiCard
                label="Avg Stockout Rate"
                value={formatPercent(avgStockoutRate)}
                description="Average stockout rate across products"
                icon={IconFillRate}
                accent="violet"
                onClick={() => setRecordsOpen(true)}
              />
            </div>

            <SectionCard title="Inventory Breakdown">
              <Tabs
                tabs={[
                  {
                    id: "warehouse",
                    label: "By Warehouse",
                    content: (
                      <div className="grid grid-cols-1 gap-6 lg:grid-cols-2">
                        <BarChartCard
                          data={byWarehouse.map((r) => ({
                            label: r.warehouse_name ?? r.analysis_key,
                            value: r.inventory_value,
                          }))}
                          valueFormatter={(v) => formatINR(v)}
                          color="#B45309"
                          compact
                        />
                        <PieChartCard
                          data={byWarehouse.map((r) => ({
                            label: r.warehouse_name ?? r.analysis_key,
                            value: r.inventory_value,
                          }))}
                          valueFormatter={(v) => formatINR(v)}
                        />
                      </div>
                    ),
                  },
                  {
                    id: "product",
                    label: "By Product",
                    content: (
                      <div className="space-y-6">
                        <BarChartCard
                          data={topByStockoutRate.map((r) => ({
                            label: r.product_id ?? r.analysis_key,
                            value: r.stockout_rate_percent,
                          }))}
                          valueFormatter={(v) => formatPercent(v)}
                          color="#BE123C"
                        />
                        <DataTable<InventoryRow>
                          rowKey={(r) => r.analysis_key}
                          rows={topByValue}
                          columns={[
                            {
                              key: "product",
                              header: "Product",
                              render: (r) => r.product_name ?? r.analysis_key,
                            },
                            {
                              key: "category",
                              header: "Category",
                              render: (r) => r.category ?? "—",
                            },
                            {
                              key: "value",
                              header: "Inventory Value",
                              align: "right",
                              render: (r) => formatINR(r.inventory_value),
                            },
                            {
                              key: "stock",
                              header: "Closing Stock",
                              align: "right",
                              render: (r) => formatNumber(r.closing_stock),
                            },
                            {
                              key: "stockout",
                              header: "Stockout Rate",
                              align: "right",
                              render: (r) => formatPercent(r.stockout_rate_percent),
                            },
                          ]}
                        />
                      </div>
                    ),
                  },
                ]}
              />
            </SectionCard>

            <DrilldownModal<InventoryRecordRow>
              open={recordsOpen}
              onClose={() => setRecordsOpen(false)}
              title="All Inventory Records"
              description="Every daily product/warehouse snapshot behind the KPIs above."
              columns={inventoryRecordColumns}
              rowKey={(r) => `${r.inventory_date}-${r.product_id}-${r.warehouse_id}`}
              fetcher={fetchInventoryRecords}
              searchPlaceholder="Search product or warehouse…"
            />
          </div>
        );
      }}
    </PageShell>
  );
}
