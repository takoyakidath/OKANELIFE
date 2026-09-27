import Link from "next/link";
import { Wallet, Sparkle } from "lucide-react";

import { formatYenWithPrecision, formatDateWithPrecision } from "@/lib/format";
import type { TimelineItem } from "@/lib/types";

export function RecentFeed({ items }: { items: TimelineItem[] }) {
  if (items.length === 0) return null;

  return (
    <div className="flex flex-col gap-2">
      <div className="flex items-center justify-between">
        <h2 className="text-sm font-semibold text-muted-foreground">最近の出来事</h2>
        <Link href="/timeline" className="text-xs text-primary">
          タイムラインを見る
        </Link>
      </div>
      <div className="flex flex-col divide-y divide-border rounded-xl border border-border bg-card">
        {items.slice(0, 5).map((item) => (
          <div key={item.uuid} className="flex items-center gap-3 px-4 py-3">
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
              </p>
            </div>
            {item.kind === "income" && (
              <p className="shrink-0 text-sm font-semibold tabular-nums">
                {formatYenWithPrecision(item.amount, item.amount_precision)}
              </p>
            )}
          </div>
        ))}
      </div>
    </div>
  );
}
