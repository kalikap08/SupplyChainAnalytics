"use client";

import { Cell, Legend, Pie, PieChart, ResponsiveContainer, Tooltip } from "recharts";
import { CHART_OTHER_COLOR, colorForIndex } from "./palette";

export interface PieDatum {
  label: string;
  value: number;
}

interface PieChartCardProps {
  data: PieDatum[];
  valueFormatter?: (value: number) => string;
  height?: number;
  maxSlices?: number;
}

export default function PieChartCard({
  data,
  valueFormatter,
  height = 280,
  maxSlices = 6,
}: PieChartCardProps) {
  const sorted = data.slice().sort((a, b) => b.value - a.value);
  const head = sorted.slice(0, maxSlices);
  const tail = sorted.slice(maxSlices);
  const otherTotal = tail.reduce((sum, d) => sum + d.value, 0);
  const slices: PieDatum[] =
    otherTotal > 0 ? [...head, { label: "Other", value: otherTotal }] : head;

  const total = slices.reduce((sum, d) => sum + d.value, 0);
  const format = (v: number) => (valueFormatter ? valueFormatter(v) : String(v));

  return (
    <ResponsiveContainer width="100%" height={height}>
      <PieChart margin={{ top: 4, right: 8, left: 8, bottom: 4 }}>
        <Pie
          data={slices}
          dataKey="value"
          nameKey="label"
          innerRadius="55%"
          outerRadius="82%"
          paddingAngle={2}
          cornerRadius={4}
          strokeWidth={0}
          label={({ percent }) =>
            (percent ?? 0) >= 0.05 ? `${Math.round((percent ?? 0) * 100)}%` : ""
          }
          labelLine={false}
        >
          {slices.map((entry, index) => (
            <Cell
              key={entry.label}
              fill={
                entry.label === "Other" && otherTotal > 0
                  ? CHART_OTHER_COLOR
                  : colorForIndex(index)
              }
            />
          ))}
        </Pie>
        <Tooltip
          formatter={(value, name) => {
            const num = typeof value === "number" ? value : Number(value);
            const pct = total > 0 ? ((num / total) * 100).toFixed(1) : "0";
            return [`${format(num)} (${pct}%)`, name];
          }}
          contentStyle={{
            borderRadius: 12,
            border: "1px solid #E4E9F2",
            fontSize: 12,
            boxShadow: "0 8px 24px rgba(15,23,42,0.10)",
          }}
        />
        <Legend
          layout="vertical"
          verticalAlign="middle"
          align="right"
          iconType="circle"
          iconSize={8}
          wrapperStyle={{ fontSize: 12, color: "#52514E", lineHeight: "20px" }}
        />
      </PieChart>
    </ResponsiveContainer>
  );
}
