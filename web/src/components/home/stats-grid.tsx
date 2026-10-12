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

  const [primary, ...rest] = items;

  return (
    <div className="flex flex-col gap-3">
      {/* This month is the figure people check most — give it the weight. */}
      <div className="rounded-2xl border border-border bg-card px-5 py-4">
        <p className="text-xs text-muted-foreground">{primary.label}</p>
        <p className="mt-1 text-2xl font-semibold tabular-nums">{primary.value}</p>
      </div>
      <div className="grid grid-cols-3 gap-2 px-1">
        {rest.map((item) => (
          <div key={item.label}>
            <p className="text-xs text-muted-foreground">{item.label}</p>
            <p className="mt-0.5 text-sm font-semibold tabular-nums">{item.value}</p>
          </div>
        ))}
      </div>
    </div>
  );
}
