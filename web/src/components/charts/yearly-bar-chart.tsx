"use client";

import { BarChart, Bar, XAxis, YAxis, Tooltip, CartesianGrid } from "recharts";
import { formatCompactYen, yenAxis } from "@/lib/format";
import type { YearlyPoint } from "@/lib/types";
import { ChartFrame } from "./chart-frame";

export function YearlyBarChart({ data }: { data: YearlyPoint[] }) {
  const chartData = data.map((d) => ({ label: `${d.year}`, total: d.total }));
  const axis = yenAxis(chartData.map((d) => d.total));
  return (
    <>
      <p className="mb-1 text-right text-xs text-muted-foreground">単位：{axis.unit}</p>
      <ChartFrame height={220} label="年別収入の棒グラフ">
        {(width) => (
          <BarChart width={width} height={220} data={chartData} margin={{ top: 8, right: 8, left: 0, bottom: 0 }}>
            <CartesianGrid vertical={false} stroke="var(--color-border)" />
            <XAxis
              dataKey="label"
              tickLine={false}
              axisLine={false}
              fontSize={11}
              tick={{ fill: "var(--color-muted-foreground)" }}
            />
            <YAxis
              tickLine={false}
              axisLine={false}
              fontSize={11}
              tick={{ fill: "var(--color-muted-foreground)" }}
              tickFormatter={axis.format}
              width={56}
            />
            <Tooltip
              formatter={(value) => formatCompactYen(Number(value))}
              contentStyle={{
                fontSize: 12,
                borderRadius: 8,
                border: "1px solid var(--color-border)",
                backgroundColor: "var(--color-card)",
                color: "var(--color-card-foreground)",
              }}
            />
            <Bar dataKey="total" fill="var(--color-chart-2)" radius={[4, 4, 0, 0]} />
          </BarChart>
        )}
      </ChartFrame>
    </>
  );
}
