"use client";

import { LineChart, Line, XAxis, YAxis, Tooltip, CartesianGrid } from "recharts";
import { formatCompactYen } from "@/lib/format";
import type { AgePoint } from "@/lib/types";
import { ChartFrame } from "./chart-frame";

export function AgeLineChart({ data }: { data: AgePoint[] }) {
  const chartData = data.map((d) => ({ label: `${d.age}歳`, total: d.total }));
  return (
    <ChartFrame height={220}>
      {(width) => (
        <LineChart width={width} height={220} data={chartData} margin={{ top: 8, right: 8, left: 0, bottom: 0 }}>
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
          <Line type="monotone" dataKey="total" stroke="var(--color-chart-3)" strokeWidth={2} dot={{ r: 3 }} />
        </LineChart>
      )}
    </ChartFrame>
  );
}
