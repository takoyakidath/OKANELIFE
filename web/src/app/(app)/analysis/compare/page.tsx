import { getYearComparison } from "@/lib/api-server";
import { formatCompactYen } from "@/lib/format";

export default async function CompareYearsPage({
  searchParams,
}: PageProps<"/analysis/compare">) {
  const params = await searchParams;
  const now = new Date().getFullYear();
  const a = Number(params.a) || now - 1;
  const b = Number(params.b) || now;

  const data = await getYearComparison(Math.min(a, b), Math.max(a, b));
  const totalA = data.a.monthly.reduce((sum, m) => sum + m.total, 0);
  const totalB = data.b.monthly.reduce((sum, m) => sum + m.total, 0);

  return (
    <div className="flex flex-col gap-6 py-6">
      <h1 className="text-lg font-semibold">年比較</h1>

      <div className="grid grid-cols-2 gap-3">
        <YearCard year={data.a.year} total={totalA} />
        <YearCard year={data.b.year} total={totalB} />
      </div>

      <div className="rounded-xl border border-border bg-card p-4">
        <p className="mb-3 text-sm font-medium">月別の差分</p>
        <div className="flex flex-col divide-y divide-border">
          {Array.from({ length: 12 }, (_, i) => i + 1).map((month) => {
            const valA = data.a.monthly.find((m) => m.month === month)?.total ?? 0;
            const valB = data.b.monthly.find((m) => m.month === month)?.total ?? 0;
            const diff = valB - valA;
            return (
              <div key={month} className="flex items-center justify-between py-2 text-sm">
                <span className="text-muted-foreground">{month}月</span>
                <span className="tabular-nums">
                  {formatCompactYen(valA)} → {formatCompactYen(valB)}
                </span>
                <span
                  className={
                    diff >= 0 ? "text-success tabular-nums" : "text-destructive tabular-nums"
                  }
                >
                  {diff >= 0 ? "+" : ""}
                  {formatCompactYen(diff)}
                </span>
              </div>
            );
          })}
        </div>
      </div>
    </div>
  );
}

function YearCard({ year, total }: { year: number; total: number }) {
  return (
    <div className="rounded-xl border border-border bg-card p-4 text-center">
      <p className="text-sm text-muted-foreground">{year}年</p>
      <p className="mt-1 text-xl font-semibold tabular-nums">{formatCompactYen(total)}</p>
    </div>
  );
}
