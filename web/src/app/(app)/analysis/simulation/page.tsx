import { getSimulation } from "@/lib/api-server";
import { formatCompactYen } from "@/lib/format";

export default async function SimulationPage() {
  const data = await getSimulation();

  return (
    <div className="flex flex-col gap-6 py-6">
      <div>
        <h1 className="text-lg font-semibold">将来シミュレーション</h1>
        <p className="mt-1 text-sm text-muted-foreground">
          これは未来予測ではありません。今のペースが続いた場合の単純な延長です。
        </p>
      </div>

      <div className="rounded-xl border border-border bg-card p-4 text-center">
        <p className="text-sm text-muted-foreground">現在の年間収入ペース</p>
        <p className="mt-1 text-2xl font-semibold tabular-nums">
          {formatCompactYen(data.current_annual_pace)}
        </p>
      </div>

      <div className="flex flex-col divide-y divide-border rounded-xl border border-border bg-card">
        {data.projections.map((p) => (
          <div key={p.years} className="flex items-center justify-between px-4 py-3">
            <span className="text-sm text-muted-foreground">{p.years}年後</span>
            <span className="text-lg font-semibold tabular-nums">
              {formatCompactYen(p.total)}
            </span>
          </div>
        ))}
      </div>
    </div>
  );
}
