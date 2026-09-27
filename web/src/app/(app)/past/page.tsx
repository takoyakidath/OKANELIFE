import { getYearlyStats, getMe } from "@/lib/api-server";
import { PastCleanupList } from "@/components/past/past-cleanup-list";

export default async function PastCleanupPage() {
  const [yearly, me] = await Promise.all([getYearlyStats(), getMe()]);
  const currentYear = new Date().getFullYear();

  const birthYear = me.birth_date ? new Date(me.birth_date).getFullYear() : null;
  const startYear = birthYear ?? currentYear - 14;

  const existing = new Map(yearly.map((y) => [y.year, y]));
  const years = [];
  for (let y = currentYear; y >= startYear; y--) {
    const found = existing.get(y);
    years.push({ year: y, total: found?.total ?? 0, count: found?.count ?? 0 });
  }

  return (
    <div className="flex flex-col gap-6 py-6">
      <div>
        <h1 className="text-lg font-semibold">過去の収入を整理</h1>
        <p className="mt-1 text-sm text-muted-foreground">
          銀行口座や給与明細などを見ながら、分かる範囲だけで大丈夫です。あとから修正できます。
        </p>
      </div>

      <PastCleanupList years={years} />

      <p className="text-center text-xs text-muted-foreground">
        今日はここまででも大丈夫です。入力済みのデータは保存されています。
      </p>
    </div>
  );
}
