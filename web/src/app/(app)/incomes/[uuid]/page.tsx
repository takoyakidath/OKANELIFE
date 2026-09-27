import { getIncome } from "@/lib/api-server";
import { IncomeEditForm } from "@/components/income/income-edit-form";

export default async function IncomeDetailPage({
  params,
}: PageProps<"/incomes/[uuid]">) {
  const { uuid } = await params;
  const income = await getIncome(uuid);

  return (
    <div className="flex flex-col gap-6 py-6">
      <h1 className="text-lg font-semibold">収入の記録を編集</h1>
      <IncomeEditForm income={income} />
    </div>
  );
}
