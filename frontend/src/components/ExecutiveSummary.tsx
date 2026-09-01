import type { ExecutiveData } from "@/types/analytics";
import { formatINR, formatNumber, formatPercent } from "@/lib/format";

interface ExecutiveSummaryProps {
  data: ExecutiveData;
}

export default function ExecutiveSummary({ data }: ExecutiveSummaryProps) {
  const observations = [
    `Total revenue is ${formatINR(data.total_revenue)} across ${formatNumber(
      data.total_orders
    )} orders and ${formatNumber(data.total_units_sold)} units sold.`,
    `Total procurement value is ${formatINR(
      data.total_procurement_value
    )} across ${formatNumber(data.total_purchase_orders)} purchase orders.`,
    `Supplier fulfillment is currently ${formatPercent(
      data.supplier_fill_rate_percent
    )}.`,
    `Total inventory value is ${formatINR(
      data.total_inventory_value
    )}, with ${formatNumber(data.total_closing_stock)} units of closing stock and ${formatNumber(
      data.stockout_records
    )} recorded stockouts.`,
    `On-time delivery is ${formatPercent(
      data.on_time_delivery_percent
    )} across ${formatNumber(data.total_shipments)} shipments, with a total shipping cost of ${formatINR(
      data.total_shipping_cost
    )}.`,
    `Return rate is ${formatPercent(data.return_rate_percent)}, covering ${formatNumber(
      data.total_returns
    )} returns and ${formatNumber(
      data.total_returned_units
    )} returned units, with ${formatINR(data.total_refund_value)} refunded.`,
  ];

  return (
    <section className="rounded-xl2 border border-surface-border bg-surface-card p-6 shadow-card">
      <h2 className="text-[15px] font-semibold text-ink-900">
        Executive Summary
      </h2>
      <p className="mt-1 text-[12.5px] text-ink-400">
        Observations generated directly from the current API response.
      </p>
      <ul className="mt-4 space-y-2.5">
        {observations.map((line) => (
          <li
            key={line}
            className="flex items-start gap-2.5 text-[13.5px] leading-relaxed text-ink-600"
          >
            <span className="mt-2 h-1.5 w-1.5 shrink-0 rounded-full bg-accent-blue" />
            {line}
          </li>
        ))}
      </ul>
    </section>
  );
}
