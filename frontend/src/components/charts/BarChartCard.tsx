"use client";

import { useId } from "react";
import {
  Bar,
  BarChart,
  CartesianGrid,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from "recharts";

export interface BarDatum {
  label: string;
  value: number;
}

interface BarChartCardProps {
  data: BarDatum[];
  valueFormatter?: (value: number) => string;
  color?: string;
  height?: number;
  /** Force angled labels — use when the chart sits in a narrower column (e.g. beside another chart). */
  compact?: boolean;
}

export default function BarChartCard({
  data,
  valueFormatter,
  color = "#2563EB",
  height = 260,
  compact = false,
}: BarChartCardProps) {
  const gradientId = `bar-gradient-${useId()}`;
  const angleLabels = compact ? data.length > 3 : data.length > 6;

  return (
    <ResponsiveContainer width="100%" height={height}>
      <BarChart data={data} margin={{ top: 4, right: 8, left: 4, bottom: 4 }}>
        <defs>
          <linearGradient id={gradientId} x1="0" y1="0" x2="0" y2="1">
            <stop offset="0%" stopColor={color} stopOpacity={0.95} />
            <stop offset="100%" stopColor={color} stopOpacity={0.55} />
          </linearGradient>
        </defs>
        <CartesianGrid strokeDasharray="3 3" stroke="#E4E9F2" vertical={false} />
        <XAxis
          dataKey="label"
          tick={{ fontSize: 11, fill: "#8896AB" }}
          axisLine={{ stroke: "#E4E9F2" }}
          tickLine={false}
          interval={0}
          angle={angleLabels ? -20 : 0}
          textAnchor={angleLabels ? "end" : "middle"}
          height={angleLabels ? 48 : 24}
        />
        <YAxis
          tick={{ fontSize: 11, fill: "#8896AB" }}
          axisLine={false}
          tickLine={false}
          width={60}
          tickFormatter={valueFormatter}
        />
        <Tooltip
          cursor={{ fill: "rgba(148, 163, 184, 0.12)" }}
          formatter={(value) => {
            const num = typeof value === "number" ? value : Number(value);
            return valueFormatter ? valueFormatter(num) : num;
          }}
          contentStyle={{
            borderRadius: 12,
            border: "1px solid #E4E9F2",
            fontSize: 12,
            boxShadow: "0 8px 24px rgba(15,23,42,0.10)",
          }}
        />
        <Bar dataKey="value" fill={`url(#${gradientId})`} radius={[4, 4, 0, 0]} maxBarSize={44} />
      </BarChart>
    </ResponsiveContainer>
  );
}
