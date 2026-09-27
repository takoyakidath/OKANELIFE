import Link from "next/link";

import {
  getStatsSummary,
  getYearlyStats,
  getTimeline,
} from "@/lib/api-server";
import { LifetimeTotal } from "@/components/home/lifetime-total";
import { StatsGrid } from "@/components/home/stats-grid";
import { HomeEmptyState } from "@/components/home/empty-state";
import { RecentFeed } from "@/components/home/recent-feed";
import { RetrospectiveCta } from "@/components/home/retrospective-cta";
import { CumulativeSpark } from "@/components/charts/cumulative-spark";

export default async function HomePage() {
  const [summary, yearly, timeline] = await Promise.all([
    getStatsSummary(),
    getYearlyStats(),
    getTimeline(),
  ]);

  const currentYear = new Date().getFullYear();

  if (summary.income_count === 0) {
    return (
      <div className="flex flex-col gap-6 py-8">
        <LifetimeTotal amount={0} />
        <HomeEmptyState />
      </div>
    );
  }

  return (
    <div className="flex flex-col gap-6 py-6">
      <LifetimeTotal amount={summary.lifetime_total} />

      {yearly.length > 1 && (
        <Link href="/analysis" className="-my-2 block">
          <CumulativeSpark points={yearly.map((y) => ({ label: `${y.year}`, total: y.total }))} />
        </Link>
      )}

      <StatsGrid
        stats={{
          thisMonth: summary.this_month_total,
          thisYear: summary.this_year_total,
          lastMonth: summary.last_month_total,
          bestMonth: summary.best_month_total,
        }}
      />

      {summary.unknown_amount_count > 0 && (
        <Link
          href="/past"
          className="rounded-lg bg-accent px-4 py-3 text-sm text-accent-foreground"
        >
          金額が不明な記録が{summary.unknown_amount_count}件あります。分かる範囲で更新しましょう →
        </Link>
      )}

      <RetrospectiveCta year={currentYear} total={summary.this_year_total} />

      <RecentFeed items={timeline.items} />
    </div>
  );
}
