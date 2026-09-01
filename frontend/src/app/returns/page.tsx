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
import { fetchReturnsData, fetchReturnsRecords } from "@/lib/api";
import { formatINR, formatNumber } from "@/lib/format";
import { returnRecordColumns } from "@/lib/drilldownColumns";
import type { ReturnsRow, ReturnRecordRow } from "@/types/analytics";
import { IconReturns, IconReturnedUnits, IconRevenue } from "@/components/icons";

export default function ReturnsPage() {
  const [recordsOpen, setRecordsOpen] = useState(false);

  return (
    <PageShell
      title="Returns"
      subtitle="Return volume, refund value, and root causes"
      fetcher={fetchReturnsData}
    >
      {(rows) => {
        const byReason = rows
          .filter((r) => r.analysis_type === "REASON")
          .slice()
          .sort((a, b) => b.return_count - a.return_count);
        const byWarehouse = rows
          .filter((r) => r.analysis_type === "WAREHOUSE")
          .slice()
          .sort((a, b) => b.refund_value - a.refund_value);
        const byProduct = rows
          .filter((r) => r.analysis_type === "PRODUCT")
          .slice()
          .sort((a, b) => b.refund_value - a.refund_value);

        const totalReturns = byReason.reduce((sum, r) => sum + r.return_count, 0);
        const totalReturnedUnits = byReason.reduce(
          (sum, r) => sum + r.returned_units,
          0
        );
        const totalRefundValue = byReason.reduce(
          (sum, r) => sum + r.refund_value,
          0
        );

        const topProducts = byProduct.slice(0, 10);

        return (
          <div className="space-y-6">
            <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3">
              <KpiCard
                label="Total Returns"
                value={formatNumber(totalReturns)}
                description="Total number of returned orders"
                icon={IconReturns}
                accent="rose"
                onClick={() => setRecordsOpen(true)}
              />
              <KpiCard
                label="Returned Units"
                value={formatNumber(totalReturnedUnits)}
                description="Total units returned by customers"
                icon={IconReturnedUnits}
                accent="rose"
                onClick={() => setRecordsOpen(true)}
              />
              <KpiCard
                label="Total Refund Value"
                value={formatINR(totalRefundValue)}
                description="Total value refunded to customers"
                icon={IconRevenue}
                accent="amber"
                onClick={() => setRecordsOpen(true)}
              />
            </div>

            <SectionCard title="Returns Breakdown">
              <Tabs
                tabs={[
                  {
                    id: "reason",
                    label: "By Reason",
                    content: (
                      <PieChartCard
                        data={byReason.map((r) => ({
                          label: r.return_reason ?? r.analysis_key,
                          value: r.return_count,
                        }))}
                        valueFormatter={(v) => formatNumber(v)}
                      />
                    ),
                  },
                  {
                    id: "warehouse",
                    label: "By Warehouse",
                    content: (
                      <BarChartCard
                        data={byWarehouse.map((r) => ({
                          label: r.warehouse_name ?? r.analysis_key,
                          value: r.refund_value,
                        }))}
                        valueFormatter={(v) => formatINR(v)}
                        color="#B45309"
                      />
                    ),
                  },
                  {
                    id: "product",
                    label: "By Product",
                    content: (
                      <DataTable<ReturnsRow>
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
                            key: "count",
                            header: "Return Count",
                            align: "right",
                            render: (r) => formatNumber(r.return_count),
                          },
                          {
                            key: "units",
                            header: "Returned Units",
                            align: "right",
                            render: (r) => formatNumber(r.returned_units),
                          },
                          {
                            key: "refund",
                            header: "Refund Value",
                            align: "right",
                            render: (r) => formatINR(r.refund_value),
                          },
                        ]}
                      />
                    ),
                  },
                ]}
              />
            </SectionCard>

            <DrilldownModal<ReturnRecordRow>
              open={recordsOpen}
              onClose={() => setRecordsOpen(false)}
              title="All Return Records"
              description="Every return behind the KPIs above — searchable by return, order, product, reason, or warehouse."
              columns={returnRecordColumns}
              rowKey={(r) => r.return_id}
              fetcher={fetchReturnsRecords}
              searchPlaceholder="Search return ID, order ID, product, reason…"
            />
          </div>
        );
      }}
    </PageShell>
  );
}
