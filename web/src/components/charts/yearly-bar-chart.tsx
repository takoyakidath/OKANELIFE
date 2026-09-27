"use client";

import { BarChart, Bar, XAxis, YAxis, Tooltip, CartesianGrid } from "recharts";
import { formatCompactYen } from "@/lib/format";
import type { YearlyPoint } from "@/lib/types";
import { ChartFrame } from "./chart-frame";

export function YearlyBarChart({ data }: { data: YearlyPoint[] }) {
  const chartData = data.map((d) => ({ label: `${d.year}`, total: d.total }));
  return (
    <ChartFrame height={220}>
      {(width) => (
        <BarChart width={width} height={220} data={chartData} margin={{ top: 8, right: 8, left: 0, bottom: 0 }}>
          <CartesianGrid vertical={false} stroke="var(--color-border)" />
          <XAxis dataKey="label" tickLine={false} axisLine={false} fontSize={11} />
          <YAxis
            tickLine={false}
            axisLine={false}
            fontSize={11}
            tickFormatter={(v) => formatCompactYen(v)}
            width={56}
          />
          <Tooltip
            formatter={(value) => formatCompactYen(Number(value))}
            contentStyle={{ fontSize: 12, borderRadius: 8, border: "1px solid var(--color-border)" }}
          />
          <Bar dataKey="total" fill="var(--color-chart-2)" radius={[4, 4, 0, 0]} />
        </BarChart>
      )}
    </ChartFrame>
  );
}
