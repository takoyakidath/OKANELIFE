"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { Loader2, Trash2 } from "lucide-react";

import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { apiClient } from "@/lib/api-client";
import type { AmountPrecision, DatePrecision, Income } from "@/lib/types";

export function IncomeEditForm({ income }: { income: Income }) {
  const router = useRouter();
  const [amount, setAmount] = useState(income.amount?.toString() ?? "");
  const [amountPrecision, setAmountPrecision] = useState<AmountPrecision>(
    income.amount_precision
  );
  const [incomeDate, setIncomeDate] = useState(income.income_date.slice(0, 10));
  const [datePrecision, setDatePrecision] = useState<DatePrecision>(income.date_precision);
  const [memo, setMemo] = useState(income.memo ?? "");
  const [status, setStatus] = useState<"idle" | "saving" | "deleting">("idle");

  async function handleSave(e: React.FormEvent) {
    e.preventDefault();
    setStatus("saving");
    await apiClient.patch(`/incomes/${income.uuid}`, {
      amount: amountPrecision === "unknown" ? null : Number(amount) || 0,
      amount_precision: amountPrecision,
      income_date: incomeDate,
      date_precision: datePrecision,
      memo: memo || null,
    });
    router.push("/timeline");
    router.refresh();
  }

  async function handleDelete() {
    if (!confirm("この収入の記録を削除しますか？")) return;
    setStatus("deleting");
    await apiClient.delete(`/incomes/${income.uuid}`);
    router.push("/timeline");
    router.refresh();
  }

  return (
    <form onSubmit={handleSave} className="flex flex-col gap-4">
      <div className="flex flex-col gap-1.5">
        <Label>金額の精度</Label>
        <div className="grid grid-cols-3 gap-2">
          {(["exact", "estimated", "unknown"] as const).map((p) => (
            <button
              type="button"
              key={p}
              onClick={() => setAmountPrecision(p)}
              className={`rounded-md border px-2 py-1.5 text-xs font-medium ${
                amountPrecision === p
                  ? "border-primary bg-primary/10 text-primary"
                  : "border-input text-muted-foreground"
              }`}
            >
              {p === "exact" ? "正確" : p === "estimated" ? "だいたい" : "不明"}
            </button>
          ))}
        </div>
      </div>

      {amountPrecision !== "unknown" && (
        <div className="flex flex-col gap-1.5">
          <Label htmlFor="edit-amount">金額</Label>
          <Input
            id="edit-amount"
            inputMode="numeric"
            value={amount}
            onChange={(e) => setAmount(e.target.value)}
          />
        </div>
      )}

      <div className="grid grid-cols-2 gap-3">
        <div className="flex flex-col gap-1.5">
          <Label htmlFor="edit-date">日付</Label>
          <Input
            id="edit-date"
            type="date"
            value={incomeDate}
            onChange={(e) => setIncomeDate(e.target.value)}
          />
        </div>
        <div className="flex flex-col gap-1.5">
          <Label>時期の精度</Label>
          <div className="grid grid-cols-3 gap-1">
            {(["day", "month", "year"] as const).map((p) => (
              <button
                type="button"
                key={p}
                onClick={() => setDatePrecision(p)}
                className={`rounded-md border px-1.5 py-1.5 text-[11px] font-medium ${
                  datePrecision === p
                    ? "border-primary bg-primary/10 text-primary"
                    : "border-input text-muted-foreground"
                }`}
              >
                {p === "day" ? "日" : p === "month" ? "月" : "年"}
              </button>
            ))}
          </div>
        </div>
      </div>

      <div className="flex flex-col gap-1.5">
        <Label htmlFor="edit-memo">メモ</Label>
        <Input id="edit-memo" value={memo} onChange={(e) => setMemo(e.target.value)} />
      </div>

      <div className="flex gap-2">
        <Button type="submit" disabled={status === "saving"} className="flex-1">
          {status === "saving" && <Loader2 className="size-4 animate-spin" />}
          保存する
        </Button>
        <Button
          type="button"
          variant="outline"
          onClick={handleDelete}
          disabled={status === "deleting"}
        >
          <Trash2 className="size-4" />
        </Button>
      </div>
    </form>
  );
}
