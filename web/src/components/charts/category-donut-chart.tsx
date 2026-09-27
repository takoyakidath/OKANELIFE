"use client";

import { PieChart, Pie, Cell, Tooltip, Legend } from "recharts";
import { formatCompactYen } from "@/lib/format";
import type { CategoryTotal } from "@/lib/types";
import { ChartFrame } from "./chart-frame";

const COLORS = [
  "var(--color-chart-1)",
  "var(--color-chart-2)",
  "var(--color-chart-3)",
  "var(--color-chart-4)",
  "var(--color-chart-5)",
];

export function CategoryDonutChart({ data }: { data: CategoryTotal[] }) {
  return (
    <ChartFrame height={260}>
      {(width) => (
        <PieChart width={width} height={260}>
          <Pie data={data} dataKey="total" nameKey="label" innerRadius="55%" outerRadius="85%" paddingAngle={2}>
            {data.map((_, i) => (
              <Cell key={i} fill={COLORS[i % COLORS.length]} />
            ))}
          </Pie>
          <Tooltip
            formatter={(value) => formatCompactYen(Number(value))}
            contentStyle={{ fontSize: 12, borderRadius: 8, border: "1px solid var(--color-border)" }}
          />
          <Legend wrapperStyle={{ fontSize: 12 }} />
        </PieChart>
      )}
    </ChartFrame>
  );
}
