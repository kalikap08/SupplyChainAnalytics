"use client";

import { useId } from "react";
import {
  Area,
  AreaChart,
  CartesianGrid,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from "recharts";

export interface LineDatum {
  label: string;
  value: number;
}

interface LineChartCardProps {
  data: LineDatum[];
  valueFormatter?: (value: number) => string;
  color?: string;
  height?: number;
}

export default function LineChartCard({
  data,
  valueFormatter,
  color = "#2563EB",
  height = 260,
}: LineChartCardProps) {
  const gradientId = `area-gradient-${useId()}`;

  return (
    <ResponsiveContainer width="100%" height={height}>
      <AreaChart data={data} margin={{ top: 4, right: 8, left: 4, bottom: 4 }}>
        <defs>
          <linearGradient id={gradientId} x1="0" y1="0" x2="0" y2="1">
            <stop offset="0%" stopColor={color} stopOpacity={0.35} />
            <stop offset="100%" stopColor={color} stopOpacity={0.02} />
          </linearGradient>
        </defs>
        <CartesianGrid strokeDasharray="3 3" stroke="#E4E9F2" vertical={false} />
        <XAxis
          dataKey="label"
          tick={{ fontSize: 10.5, fill: "#8896AB" }}
          axisLine={{ stroke: "#E4E9F2" }}
          tickLine={false}
          interval={Math.max(0, Math.floor(data.length / 8) - 1)}
        />
        <YAxis
          tick={{ fontSize: 11, fill: "#8896AB" }}
          axisLine={false}
          tickLine={false}
          width={60}
          tickFormatter={valueFormatter}
        />
        <Tooltip
          cursor={{ stroke: "#CBD5E1", strokeWidth: 1 }}
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
        <Area
          type="monotone"
          dataKey="value"
          stroke={color}
          strokeWidth={2}
          fill={`url(#${gradientId})`}
          dot={false}
          activeDot={{ r: 4 }}
        />
      </AreaChart>
    </ResponsiveContainer>
  );
}
