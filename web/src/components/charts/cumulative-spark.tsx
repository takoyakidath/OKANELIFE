"use client";

import { AreaChart, Area, Tooltip } from "recharts";
import { formatCompactYen } from "@/lib/format";
import { ChartFrame } from "./chart-frame";

export function CumulativeSpark({
  points,
}: {
  points: { label: string; total: number }[];
}) {
  const data = points.reduce<{ label: string; cumulative: number }[]>(
    (acc, p) => {
      const previous = acc.at(-1)?.cumulative ?? 0;
      acc.push({ label: p.label, cumulative: previous + p.total });
      return acc;
    },
    []
  );

  return (
    <ChartFrame height={96}>
      {(width) => (
        <AreaChart width={width} height={96} data={data} margin={{ top: 4, right: 0, bottom: 0, left: 0 }}>
          <defs>
            <linearGradient id="cumulativeFill" x1="0" y1="0" x2="0" y2="1">
              <stop offset="0%" stopColor="var(--color-primary)" stopOpacity={0.35} />
              <stop offset="100%" stopColor="var(--color-primary)" stopOpacity={0} />
            </linearGradient>
          </defs>
          <Tooltip
            formatter={(value) => formatCompactYen(Number(value))}
            labelFormatter={(label) => label}
            contentStyle={{
              fontSize: 12,
              borderRadius: 8,
              border: "1px solid var(--color-border)",
            }}
          />
          <Area
            type="monotone"
            dataKey="cumulative"
            stroke="var(--color-primary)"
            strokeWidth={2}
            fill="url(#cumulativeFill)"
          />
        </AreaChart>
      )}
    </ChartFrame>
  );
}
