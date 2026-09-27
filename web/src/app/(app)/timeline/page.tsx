import Link from "next/link";
import { Wallet, Sparkle } from "lucide-react";

import { getTimeline } from "@/lib/api-server";
import { formatYenWithPrecision, formatDateWithPrecision } from "@/lib/format";

export default async function TimelinePage({
  searchParams,
}: PageProps<"/timeline">) {
  const params = await searchParams;
  const cursor = typeof params.cursor === "string" ? params.cursor : undefined;
  const { items, next_cursor } = await getTimeline(cursor);

  const groups = groupByYear(items);

  return (
    <div className="flex flex-col gap-6 py-6">
      <h1 className="text-lg font-semibold">タイムライン</h1>
      <p className="text-sm text-muted-foreground">
        収入とできごとを時系列でまとめた、あなたのお金の人生の記録です。
      </p>

      {items.length === 0 && (
        <p className="py-12 text-center text-sm text-muted-foreground">
          まだ記録がありません。
        </p>
      )}

      {Object.entries(groups)
        .sort(([a], [b]) => Number(b) - Number(a))
        .map(([year, yearItems]) => (
        <div key={year} className="flex flex-col gap-2">
          <h2 className="text-sm font-semibold text-muted-foreground">{year}年</h2>
          <div className="flex flex-col divide-y divide-border rounded-xl border border-border bg-card">
            {yearItems.map((item) => {
              const Row = (
                <div className="flex items-center gap-3 px-4 py-3">
                  <div className="flex size-9 shrink-0 items-center justify-center rounded-full bg-secondary text-secondary-foreground">
                    {item.kind === "income" ? (
                      <Wallet className="size-4" />
                    ) : (
                      <Sparkle className="size-4" />
                    )}
                  </div>
                  <div className="flex-1 overflow-hidden">
                    <p className="truncate text-sm font-medium">
                      {item.kind === "income"
                        ? item.company?.name ?? item.source?.name ?? "収入"
                        : item.title}
                    </p>
                    <p className="text-xs text-muted-foreground">
                      {formatDateWithPrecision(
                        item.kind === "income" ? item.income_date : item.event_date,
                        item.kind === "income" ? item.date_precision : "day"
                      )}
                      {item.kind === "income" && item.memo ? ` · ${item.memo}` : ""}
                    </p>
                  </div>
                  {item.kind === "income" && (
                    <p className="shrink-0 text-sm font-semibold tabular-nums">
                      {formatYenWithPrecision(item.amount, item.amount_precision)}
                    </p>
                  )}
                </div>
              );
              return item.kind === "income" ? (
                <Link key={item.uuid} href={`/incomes/${item.uuid}`}>
                  {Row}
                </Link>
              ) : (
                <div key={item.uuid}>{Row}</div>
              );
            })}
          </div>
        </div>
      ))}

      {next_cursor && (
        <Link
          href={`/timeline?cursor=${encodeURIComponent(next_cursor)}`}
          className="rounded-lg border border-border py-2.5 text-center text-sm font-medium"
        >
          もっと見る
        </Link>
      )}
    </div>
  );
}

function groupByYear<T extends { kind: string }>(
  items: (T & { income_date?: string; event_date?: string })[]
) {
  const groups: Record<string, typeof items> = {};
  for (const item of items) {
    const date = item.kind === "income" ? item.income_date : item.event_date;
    const year = date ? new Date(date).getFullYear() : "不明";
    groups[year] = groups[year] ? [...groups[year], item] : [item];
  }
  return groups;
}
