import { getCompany } from "@/lib/api-server";
import { getIncomes } from "@/lib/api-server";
import { formatCompactYen, formatYenWithPrecision, formatDateWithPrecision } from "@/lib/format";

export default async function CompanyDetailPage({
  params,
}: PageProps<"/companies/[uuid]">) {
  const { uuid } = await params;
  const [company, incomes] = await Promise.all([
    getCompany(uuid),
    getIncomes(`?company=${uuid}&limit=20`),
  ]);

  return (
    <div className="flex flex-col gap-6 py-6">
      <div>
        <h1 className="text-lg font-semibold">{company.name}</h1>
        {company.memo && <p className="text-sm text-muted-foreground">{company.memo}</p>}
      </div>

      <div className="grid grid-cols-2 gap-3">
        <InfoCard label="累計収入" value={formatCompactYen(company.total_amount ?? 0)} />
        <InfoCard
          label="収入期間"
          value={
            company.first_income_date
              ? `${formatDateWithPrecision(company.first_income_date, "month")} 〜 ${
                  company.last_income_date
                    ? formatDateWithPrecision(company.last_income_date, "month")
                    : "現在"
                }`
              : "—"
          }
        />
      </div>

      <div className="flex flex-col gap-2">
        <h2 className="text-sm font-semibold text-muted-foreground">記録一覧</h2>
        <div className="flex flex-col divide-y divide-border rounded-xl border border-border bg-card">
          {incomes.items.map((income) => (
            <div key={income.uuid} className="flex items-center justify-between px-4 py-3">
              <div>
                <p className="text-sm font-medium">
                  {formatDateWithPrecision(income.income_date, income.date_precision)}
                </p>
                {income.memo && <p className="text-xs text-muted-foreground">{income.memo}</p>}
              </div>
              <p className="text-sm font-semibold tabular-nums">
                {formatYenWithPrecision(income.amount, income.amount_precision)}
              </p>
            </div>
          ))}
          {incomes.items.length === 0 && (
            <p className="px-4 py-6 text-center text-sm text-muted-foreground">
              記録がありません
            </p>
          )}
        </div>
      </div>
    </div>
  );
}

function InfoCard({ label, value }: { label: string; value: string }) {
  return (
    <div className="rounded-xl border border-border bg-card p-4">
      <p className="text-xs text-muted-foreground">{label}</p>
      <p className="mt-1 text-base font-semibold">{value}</p>
    </div>
  );
}
