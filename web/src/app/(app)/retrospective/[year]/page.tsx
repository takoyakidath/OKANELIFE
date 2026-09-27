import Link from "next/link";
import { ChevronLeft, ChevronRight } from "lucide-react";

import { getRetrospective } from "@/lib/api-server";
import { formatCompactYen, formatYenWithPrecision, formatDateWithPrecision } from "@/lib/format";
import { MonthlyBarChart } from "@/components/charts/monthly-bar-chart";

export default async function RetrospectivePage({
  params,
}: PageProps<"/retrospective/[year]">) {
  const { year: yearParam } = await params;
  const year = Number(yearParam);
  const data = await getRetrospective(year);

  return (
    <div className="flex flex-col gap-6 py-6">
      <div className="flex items-center justify-between">
        <Link
          href={`/retrospective/${year - 1}`}
          className="flex size-9 items-center justify-center rounded-full border border-border"
        >
          <ChevronLeft className="size-4" />
        </Link>
        <h1 className="text-lg font-semibold">{year}年を振り返る</h1>
        <Link
          href={`/retrospective/${year + 1}`}
          className="flex size-9 items-center justify-center rounded-full border border-border"
        >
          <ChevronRight className="size-4" />
        </Link>
      </div>

      <div className="rounded-2xl bg-primary px-6 py-8 text-center text-primary-foreground">
        <p className="text-sm opacity-80">あなたは{year}年に</p>
        <p className="mt-1 text-3xl font-bold tabular-nums">{formatCompactYen(data.total)}</p>
        <p className="text-sm opacity-80">稼ぎました{data.age !== null ? `（${data.age}歳）` : ""}</p>
      </div>

      {data.total === 0 ? (
        <p className="py-8 text-center text-sm text-muted-foreground">
          この年の記録はまだありません。過去整理モードから追加できます。
        </p>
      ) : (
        <>
          <div className="grid grid-cols-2 gap-3">
            <SummaryCard
              label="最も収入が多かった月"
              value={data.best_month ? `${data.best_month.month}月` : "—"}
              sub={data.best_month ? formatCompactYen(data.best_month.total) : undefined}
            />
            <SummaryCard
              label="主な収入源"
              value={data.top_sources[0]?.label ?? "—"}
              sub={data.top_sources[0] ? formatCompactYen(data.top_sources[0].total) : undefined}
            />
          </div>

          <div className="rounded-xl border border-border bg-card p-4">
            <p className="mb-2 text-sm font-medium">月ごとの推移</p>
            <MonthlyBarChart data={data.monthly} />
          </div>

          {data.top_companies.length > 0 && (
            <div className="rounded-xl border border-border bg-card p-4">
              <p className="mb-3 text-sm font-medium">主な会社・組織</p>
              <div className="flex flex-col gap-2">
                {data.top_companies.slice(0, 5).map((c) => (
                  <div key={c.key} className="flex items-center justify-between text-sm">
                    <span>{c.label}</span>
                    <span className="tabular-nums text-muted-foreground">
                      {formatCompactYen(c.total)}
                    </span>
                  </div>
                ))}
              </div>
            </div>
          )}

          {data.notable_events.length > 0 && (
            <div className="flex flex-col gap-2">
              <p className="text-sm font-medium">この年のできごと</p>
              <div className="flex flex-col divide-y divide-border rounded-xl border border-border bg-card">
                {data.notable_events.map((e) => (
                  <div key={e.uuid} className="px-4 py-3">
                    <p className="text-sm font-medium">{e.title}</p>
                    <p className="text-xs text-muted-foreground">
                      {formatDateWithPrecision(e.event_date, "day")}
                      {e.income ? ` · ${formatYenWithPrecision(e.income.amount, "exact")}` : ""}
                    </p>
                  </div>
                ))}
              </div>
            </div>
          )}
        </>
      )}
    </div>
  );
}

function SummaryCard({
  label,
  value,
  sub,
}: {
  label: string;
  value: string;
  sub?: string;
}) {
  return (
    <div className="rounded-xl border border-border bg-card p-4">
      <p className="text-xs text-muted-foreground">{label}</p>
      <p className="mt-1 text-base font-semibold">{value}</p>
      {sub && <p className="text-xs text-muted-foreground">{sub}</p>}
    </div>
  );
}
