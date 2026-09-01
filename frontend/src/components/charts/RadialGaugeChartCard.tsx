"use client";

import {
  Legend,
  PolarAngleAxis,
  RadialBar,
  RadialBarChart,
  ResponsiveContainer,
  Tooltip,
} from "recharts";
import { colorForIndex } from "./palette";

export interface GaugeDatum {
  label: string;
  value: number;
}

interface RadialGaugeChartCardProps {
  data: GaugeDatum[];
  valueFormatter?: (value: number) => string;
  height?: number;
  maxBars?: number;
  domainMax?: number;
}

export default function RadialGaugeChartCard({
  data,
  valueFormatter,
  height = 300,
  maxBars = 8,
  domainMax = 100,
}: RadialGaugeChartCardProps) {
  const bars = data
    .slice()
    .sort((a, b) => b.value - a.value)
    .slice(0, maxBars)
    .map((d, index) => ({ ...d, fill: colorForIndex(index) }));

  const format = (v: number) => (valueFormatter ? valueFormatter(v) : String(v));

  return (
    <ResponsiveContainer width="100%" height={height}>
      <RadialBarChart
        data={bars}
        innerRadius="22%"
        outerRadius="95%"
        startAngle={90}
        endAngle={-270}
        margin={{ top: 4, right: 8, left: 8, bottom: 4 }}
      >
        <PolarAngleAxis type="number" domain={[0, domainMax]} tick={false} />
        <RadialBar
          background={{ fill: "#F1F4F9" }}
          dataKey="value"
          cornerRadius={6}
          label={{ position: "insideStart", fill: "#fff", fontSize: 11 }}
        />
        <Tooltip
          formatter={(value, _name, item) => {
            const num = typeof value === "number" ? value : Number(value);
            const payload = item?.payload as GaugeDatum | undefined;
            return [format(num), payload?.label ?? ""];
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
          formatter={(_value, entry) => {
            const payload = (entry as unknown as { payload?: GaugeDatum }).payload;
            return payload ? `${payload.label} — ${format(payload.value)}` : String(_value);
          }}
        />
      </RadialBarChart>
    </ResponsiveContainer>
  );
}
