"use client";

import { useState } from "react";
import PageShell from "@/components/PageShell";
import KpiCard from "@/components/KpiCard";
import SectionCard from "@/components/SectionCard";
import DataTable from "@/components/DataTable";
import DrilldownModal from "@/components/DrilldownModal";
import BarChartCard from "@/components/charts/BarChartCard";
import { fetchProcurementData, fetchProcurementOrders } from "@/lib/api";
import { formatINR, formatNumber, formatPercent } from "@/lib/format";
import { procurementOrderColumns } from "@/lib/drilldownColumns";
import type { ProcurementRow, ProcurementOrderRow } from "@/types/analytics";
import {
  IconProcurement,
  IconUnits,
  IconFillRate,
  IconDelivery,
} from "@/components/icons";

export default function ProcurementPage() {
  const [ordersOpen, setOrdersOpen] = useState(false);

  return (
    <PageShell
      title="Procurement"
      subtitle="Purchase orders, supplier fill rates, and delivery performance"
      fetcher={fetchProcurementData}
    >
      {(rows) => {
        const totalPOs = rows.length;
        const totalOrderedQty = rows.reduce((sum, r) => sum + r.ordered_qty, 0);
        const totalReceivedQty = rows.reduce(
          (sum, r) => sum + r.received_qty,
          0
        );
        const totalPOValue = rows.reduce((sum, r) => sum + r.po_value, 0);
        const avgFillRate =
          totalPOs > 0
            ? rows.reduce((sum, r) => sum + r.fill_rate_percent, 0) / totalPOs
            : 0;
        const onTimeCount = rows.filter(
          (r) => r.delivery_status === "ON_TIME"
        ).length;
        const onTimePercent = totalPOs > 0 ? (onTimeCount / totalPOs) * 100 : 0;

        const supplierMap = new Map<
          string,
          { supplier_id: string; poValue: number; poCount: number; fillRateSum: number }
        >();
        for (const r of rows) {
          const entry = supplierMap.get(r.supplier_id) ?? {
            supplier_id: r.supplier_id,
            poValue: 0,
            poCount: 0,
            fillRateSum: 0,
          };
          entry.poValue += r.po_value;
          entry.poCount += 1;
          entry.fillRateSum += r.fill_rate_percent;
          supplierMap.set(r.supplier_id, entry);
        }
        const topSuppliers = Array.from(supplierMap.values())
          .sort((a, b) => b.poValue - a.poValue)
          .slice(0, 10);

        const recentPOs = rows
          .slice()
          .sort((a, b) => b.order_date.localeCompare(a.order_date))
          .slice(0, 10);

        return (
          <div className="space-y-6">
            <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-4">
              <KpiCard
                label="Total Procurement Value"
                value={formatINR(totalPOValue)}
                description={`Across ${formatNumber(totalPOs)} purchase orders`}
                icon={IconProcurement}
                accent="violet"
                onClick={() => setOrdersOpen(true)}
              />
              <KpiCard
                label="Ordered vs Received"
                value={`${formatNumber(totalReceivedQty)} / ${formatNumber(
                  totalOrderedQty
                )}`}
                description="Units received against units ordered"
                icon={IconUnits}
                accent="blue"
                onClick={() => setOrdersOpen(true)}
              />
              <KpiCard
                label="Average Fill Rate"
                value={formatPercent(avgFillRate)}
                description="Mean fill rate across purchase orders"
                icon={IconFillRate}
                accent="emerald"
                onClick={() => setOrdersOpen(true)}
              />
              <KpiCard
                label="On-Time Delivery"
                value={formatPercent(onTimePercent)}
                description="Purchase orders delivered on or before expected date"
                icon={IconDelivery}
                accent="cyan"
                onClick={() => setOrdersOpen(true)}
              />
            </div>

            <SectionCard
              title="Procurement Value by Supplier"
              description="Top 10 suppliers by total purchase order value"
            >
              <BarChartCard
                data={topSuppliers.map((s) => ({
                  label: s.supplier_id,
                  value: s.poValue,
                }))}
                valueFormatter={(v) => formatINR(v)}
                color="#7C3AED"
              />
            </SectionCard>

            <SectionCard
              title="Recent Purchase Orders"
              description="Most recently placed purchase orders"
            >
              <DataTable<ProcurementRow>
                rowKey={(r) => r.po_id}
                rows={recentPOs}
                columns={[
                  { key: "po", header: "PO ID", render: (r) => r.po_id },
                  {
                    key: "supplier",
                    header: "Supplier",
                    render: (r) => r.supplier_id,
                  },
                  {
                    key: "product",
                    header: "Product",
                    render: (r) => r.product_id,
                  },
                  {
                    key: "ordered",
                    header: "Ordered",
                    align: "right",
                    render: (r) => formatNumber(r.ordered_qty),
                  },
                  {
                    key: "received",
                    header: "Received",
                    align: "right",
                    render: (r) => formatNumber(r.received_qty),
                  },
                  {
                    key: "fillrate",
                    header: "Fill Rate",
                    align: "right",
                    render: (r) => formatPercent(r.fill_rate_percent),
                  },
                  {
                    key: "status",
                    header: "Status",
                    render: (r) => (
                      <span
                        className={`rounded-full px-2 py-0.5 text-[11px] font-medium ${
                          r.delivery_status === "ON_TIME"
                            ? "bg-accent-emerald/10 text-accent-emerald"
                            : "bg-accent-rose/10 text-accent-rose"
                        }`}
                      >
                        {r.delivery_status === "ON_TIME" ? "On Time" : "Late"}
                      </span>
                    ),
                  },
                ]}
              />
            </SectionCard>

            <DrilldownModal<ProcurementOrderRow>
              open={ordersOpen}
              onClose={() => setOrdersOpen(false)}
              title="All Purchase Orders"
              description="Every purchase order behind the KPIs above — searchable by PO, supplier, product, or warehouse."
              columns={procurementOrderColumns}
              rowKey={(r) => r.po_id}
              fetcher={fetchProcurementOrders}
              searchPlaceholder="Search PO ID, supplier, product, warehouse…"
            />
          </div>
        );
      }}
    </PageShell>
  );
}
