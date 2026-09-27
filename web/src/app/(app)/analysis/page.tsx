import Link from "next/link";

import {
  getMonthlyStats,
  getYearlyStats,
  getBySource,
  getByCompany,
  getAgeStats,
  getMe,
} from "@/lib/api-server";
import { Tabs, TabsList, TabsTrigger, TabsContent } from "@/components/ui/tabs";
import { MonthlyBarChart } from "@/components/charts/monthly-bar-chart";
import { YearlyBarChart } from "@/components/charts/yearly-bar-chart";
import { CategoryDonutChart } from "@/components/charts/category-donut-chart";
import { AgeLineChart } from "@/components/charts/age-line-chart";

export default async function AnalysisPage() {
  const currentYear = new Date().getFullYear();
  const [monthly, yearly, bySource, byCompany, me] = await Promise.all([
    getMonthlyStats(currentYear),
    getYearlyStats(),
    getBySource(),
    getByCompany(),
    getMe(),
  ]);
  const age = me.birth_date ? await getAgeStats() : null;

  return (
    <div className="flex flex-col gap-6 py-6">
      <div>
        <h1 className="text-lg font-semibold">分析</h1>
        <p className="text-sm text-muted-foreground">
          数字の裏にある、自分の人生の変化を見るためのグラフです。
        </p>
      </div>

      <Tabs defaultValue="monthly">
        <TabsList className="grid w-full grid-cols-5">
          <TabsTrigger value="monthly">月別</TabsTrigger>
          <TabsTrigger value="yearly">年別</TabsTrigger>
          <TabsTrigger value="source">収入源</TabsTrigger>
          <TabsTrigger value="company">会社</TabsTrigger>
          <TabsTrigger value="age">年齢</TabsTrigger>
        </TabsList>

        <TabsContent value="monthly">
          <ChartCard title={`${currentYear}年の月別収入`}>
            <MonthlyBarChart data={monthly} />
          </ChartCard>
        </TabsContent>

        <TabsContent value="yearly">
          <ChartCard title="年別収入">
            <YearlyBarChart data={yearly} />
          </ChartCard>
        </TabsContent>

        <TabsContent value="source">
          <ChartCard title="収入源別の割合">
            {bySource.length > 0 ? (
              <CategoryDonutChart data={bySource} />
            ) : (
              <EmptyChart />
            )}
          </ChartCard>
        </TabsContent>

        <TabsContent value="company">
          <ChartCard title="会社・組織別の割合">
            {byCompany.length > 0 ? (
              <CategoryDonutChart data={byCompany} />
            ) : (
              <EmptyChart />
            )}
          </ChartCard>
        </TabsContent>

        <TabsContent value="age">
          <ChartCard title="年齢ごとの収入">
            {age ? (
              <AgeLineChart data={age} />
            ) : (
              <div className="flex flex-col items-center gap-2 py-10 text-center text-sm text-muted-foreground">
                <p>生年月日を設定すると、年齢ごとの収入の変化が見られます。</p>
                <Link href="/settings" className="text-primary">
                  設定で生年月日を登録する →
                </Link>
              </div>
            )}
          </ChartCard>
        </TabsContent>
      </Tabs>

      <div className="grid grid-cols-2 gap-3">
        <Link
          href="/analysis/compare"
          className="rounded-xl border border-border bg-card p-4 text-sm font-medium"
        >
          年比較 →
        </Link>
        <Link
          href="/analysis/simulation"
          className="rounded-xl border border-border bg-card p-4 text-sm font-medium"
        >
          将来シミュレーション →
        </Link>
      </div>
    </div>
  );
}

function ChartCard({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <div className="rounded-xl border border-border bg-card p-4">
      <p className="mb-2 text-sm font-medium">{title}</p>
      {children}
    </div>
  );
}

function EmptyChart() {
  return (
    <p className="py-10 text-center text-sm text-muted-foreground">
      まだデータがありません。
    </p>
  );
}
