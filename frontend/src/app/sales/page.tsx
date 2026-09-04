"use client";

import { useState } from "react";
import PageShell from "@/components/PageShell";
import KpiCard from "@/components/KpiCard";
import SectionCard from "@/components/SectionCard";
import DataTable from "@/components/DataTable";
import Tabs from "@/components/Tabs";
import DrilldownModal from "@/components/DrilldownModal";
import LineChartCard from "@/components/charts/LineChartCard";
import BarChartCard from "@/components/charts/BarChartCard";
import PieChartCard from "@/components/charts/PieChartCard";
import { fetchSalesData, fetchSalesOrders } from "@/lib/api";
import { formatINR, formatINRCompact, formatNumber } from "@/lib/format";
import { salesOrderColumns } from "@/lib/drilldownColumns";
import type { SalesRow, SalesOrderRow } from "@/types/analytics";
import { IconRevenue, IconOrders, IconUnits, IconTrend } from "@/components/icons";

function formatMonthLabel(key: string) {
  const date = new Date(`${key}T00:00:00`);
  return date.toLocaleDateString("en-US", { month: "short", year: "2-digit" });
}

export default function SalesPage() {
  const [ordersOpen, setOrdersOpen] = useState(false);

  return (
    <PageShell
      title="Sales & Demand"
      subtitle="Order volume, revenue, and demand trends"
      fetcher={fetchSalesData}
    >
      {(rows) => {
        const monthly = rows
          .filter((r) => r.analysis_type === "MONTHLY")
          .sort((a, b) => a.analysis_key.localeCompare(b.analysis_key));
        const byProduct = rows
          .filter((r) => r.analysis_type === "PRODUCT")
          .slice()
          .sort((a, b) => b.revenue - a.revenue);
        const byWarehouse = rows
          .filter((r) => r.analysis_type === "WAREHOUSE")
          .slice()
          .sort((a, b) => b.revenue - a.revenue);

        const totalRevenue = monthly.reduce((sum, r) => sum + r.revenue, 0);
        const totalOrders = monthly.reduce((sum, r) => sum + r.total_orders, 0);
        const totalUnits = monthly.reduce((sum, r) => sum + r.units_sold, 0);
        const avgOrderValue = totalOrders > 0 ? totalRevenue / totalOrders : 0;

        const topProducts = byProduct.slice(0, 10);

        return (
          <div className="space-y-6">
            <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-4">
              <KpiCard
                label="Total Revenue"
                value={formatINR(totalRevenue)}
                description="Revenue across all months on record"
                icon={IconRevenue}
                accent="emerald"
                onClick={() => setOrdersOpen(true)}
              />
              <KpiCard
                label="Total Orders"
                value={formatNumber(totalOrders)}
                description="Sales orders placed"
                icon={IconOrders}
                accent="blue"
                onClick={() => setOrdersOpen(true)}
              />
              <KpiCard
                label="Units Sold"
                value={formatNumber(totalUnits)}
                description="Units sold across all orders"
                icon={IconUnits}
                accent="blue"
                onClick={() => setOrdersOpen(true)}
              />
              <KpiCard
                label="Average Order Value"
                value={formatINR(avgOrderValue)}
                description="Revenue divided by total orders"
                icon={IconTrend}
                accent="violet"
                onClick={() => setOrdersOpen(true)}
              />
            </div>

            <SectionCard title="Sales Breakdown">
              <Tabs
                tabs={[
                  {
                    id: "monthly",
                    label: "Monthly Trend",
                    content: (
                      <LineChartCard
                        data={monthly.map((r) => ({
                          label: formatMonthLabel(r.analysis_key),
                          value: r.revenue,
                        }))}
                        valueFormatter={(v) => formatINR(v)}
                        axisValueFormatter={formatINRCompact}
                        color="#2563EB"
                      />
                    ),
                  },
                  {
                    id: "product",
                    label: "By Product",
                    content: (
                      <div className="space-y-6">
                        <BarChartCard
                          title="Top 10 Products by Revenue"
                          data={topProducts.map((r) => ({
                            label: r.product_name ?? r.analysis_key,
                            value: r.revenue,
                          }))}
                          valueFormatter={(v) => formatINR(v)}
                          axisValueFormatter={formatINRCompact}
                          color="#2563EB"
                          compact
                        />
                        <DataTable<SalesRow>
                          rowKey={(r) => r.analysis_key}
                          rows={topProducts}
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
                              key: "orders",
                              header: "Orders",
                              align: "right",
                              render: (r) => formatNumber(r.total_orders),
                            },
                            {
                              key: "units",
                              header: "Units Sold",
                              align: "right",
                              render: (r) => formatNumber(r.units_sold),
                            },
                            {
                              key: "revenue",
                              header: "Revenue",
                              align: "right",
                              render: (r) => formatINR(r.revenue),
                            },
                            {
                              key: "aov",
                              header: "Avg Order Value",
                              align: "right",
                              render: (r) => formatINR(r.average_order_value),
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
                      <div className="grid grid-cols-1 gap-6 lg:grid-cols-2">
                        <BarChartCard
                          data={byWarehouse.map((r) => ({
                            label: r.warehouse_name ?? r.analysis_key,
                            value: r.revenue,
                          }))}
                          valueFormatter={(v) => formatINR(v)}
                          axisValueFormatter={formatINRCompact}
                          color="#0D9488"
                          compact
                        />
                        <PieChartCard
                          data={byWarehouse.map((r) => ({
                            label: r.warehouse_name ?? r.analysis_key,
                            value: r.revenue,
                          }))}
                          valueFormatter={(v) => formatINR(v)}
                        />
                      </div>
                    ),
                  },
                ]}
              />
            </SectionCard>

            <DrilldownModal<SalesOrderRow>
              open={ordersOpen}
              onClose={() => setOrdersOpen(false)}
              title="All Sales Orders"
              description="Every order line behind the KPIs above — searchable by order, customer, product, or warehouse."
              columns={salesOrderColumns}
              rowKey={(r) => r.order_id}
              fetcher={fetchSalesOrders}
              searchPlaceholder="Search order ID, customer, product, warehouse…"
            />
          </div>
        );
      }}
    </PageShell>
  );
}
