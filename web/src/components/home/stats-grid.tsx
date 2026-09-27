import { formatCompactYen } from "@/lib/format";

export function StatsGrid({
  stats,
}: {
  stats: {
    thisMonth: number;
    thisYear: number;
    lastMonth: number;
    bestMonth: number;
  };
}) {
  const monthDiff = stats.thisMonth - stats.lastMonth;
  const items = [
    { label: "今月", value: formatCompactYen(stats.thisMonth) },
    { label: "今年", value: formatCompactYen(stats.thisYear) },
    {
      label: "先月比",
      value:
        stats.lastMonth === 0
          ? "—"
          : `${monthDiff >= 0 ? "+" : ""}${formatCompactYen(monthDiff)}`,
    },
    { label: "過去最高月収", value: formatCompactYen(stats.bestMonth) },
  ];

  return (
    <div className="grid grid-cols-2 gap-3">
      {items.map((item) => (
        <div key={item.label} className="rounded-xl border border-border bg-card p-3.5">
          <p className="text-xs text-muted-foreground">{item.label}</p>
          <p className="mt-1 text-lg font-semibold tabular-nums">{item.value}</p>
        </div>
      ))}
    </div>
  );
}
