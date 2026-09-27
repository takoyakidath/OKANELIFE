"use client";

import { useEffect, useRef, useState } from "react";
import { useRouter } from "next/navigation";
import { Loader2, Check } from "lucide-react";

import {
  Sheet,
  SheetContent,
  SheetHeader,
  SheetTitle,
  SheetDescription,
  SheetFooter,
} from "@/components/ui/sheet";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { apiClient } from "@/lib/api-client";
import type { AmountPrecision, DatePrecision, IncomeSource } from "@/lib/types";

const MONTHS = Array.from({ length: 12 }, (_, i) => i + 1);

export function PastEntrySheet({
  year,
  onOpenChange,
  onSaved,
}: {
  year: number | null;
  onOpenChange: (open: boolean) => void;
  onSaved: (year: number, amount: number) => void;
}) {
  const router = useRouter();
  const [sources, setSources] = useState<IncomeSource[]>([]);
  const [amount, setAmount] = useState("");
  const [amountPrecision, setAmountPrecision] = useState<AmountPrecision>("estimated");
  const [datePrecision, setDatePrecision] = useState<DatePrecision>("month");
  const [month, setMonth] = useState<string>("1");
  const [day, setDay] = useState<string>("1");
  const [sourceUuid, setSourceUuid] = useState<string>("");
  const [companyName, setCompanyName] = useState("");
  const [memo, setMemo] = useState("");
  const [status, setStatus] = useState<"idle" | "submitting" | "success" | "error">("idle");
  const amountRef = useRef<HTMLInputElement>(null);

  const open = year !== null;

  useEffect(() => {
    if (!open) return;
    apiClient
      .get<IncomeSource[]>("/sources")
      .then((data) => {
        setSources(data);
        if (!sourceUuid && data.length > 0) setSourceUuid(data[0].uuid);
      })
      .catch(() => {});
    setTimeout(() => amountRef.current?.focus(), 50);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [open, year]);

  function reset() {
    setAmount("");
    setAmountPrecision("estimated");
    setDatePrecision("month");
    setMonth("1");
    setDay("1");
    setCompanyName("");
    setMemo("");
    setStatus("idle");
  }

  function incomeDateFor(y: number) {
    if (datePrecision === "day") return `${y}-${pad(month)}-${pad(day)}`;
    if (datePrecision === "month") return `${y}-${pad(month)}-01`;
    return `${y}-01-01`;
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!year) return;
    const numericAmount =
      amountPrecision === "unknown" ? null : Number(amount.replace(/[^0-9]/g, ""));
    if (amountPrecision !== "unknown" && (!numericAmount || numericAmount <= 0)) {
      return;
    }

    setStatus("submitting");
    try {
      await apiClient.post("/incomes", {
        amount: numericAmount,
        amount_precision: amountPrecision,
        income_date: incomeDateFor(year),
        date_precision: datePrecision,
        source_uuid: sourceUuid || null,
        company_name: companyName || null,
        memo: memo || null,
      });
      setStatus("success");
      onSaved(year, numericAmount ?? 0);
      router.refresh();
      setTimeout(() => {
        onOpenChange(false);
        reset();
      }, 700);
    } catch {
      setStatus("error");
    }
  }

  return (
    <Sheet open={open} onOpenChange={(next) => { onOpenChange(next); if (!next) reset(); }}>
      <SheetContent side="bottom">
        <SheetHeader>
          <SheetTitle>{year}年の収入を追加</SheetTitle>
          <SheetDescription>
            分かる範囲で大丈夫です。あとから正確な値に修正できます。
          </SheetDescription>
        </SheetHeader>

        <form onSubmit={handleSubmit} className="flex flex-col gap-4 px-5">
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
              <Label htmlFor="past-amount">
                {amountPrecision === "estimated" ? "約いくら" : "金額"}
              </Label>
              <div className="relative">
                <span className="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 text-lg text-muted-foreground">
                  ¥
                </span>
                <Input
                  ref={amountRef}
                  id="past-amount"
                  inputMode="numeric"
                  placeholder="0"
                  value={amount}
                  onChange={(e) => setAmount(e.target.value)}
                  className="h-14 pl-8 text-2xl font-semibold tabular-nums"
                />
              </div>
            </div>
          )}

          <div className="flex flex-col gap-1.5">
            <Label>時期の精度</Label>
            <div className="grid grid-cols-3 gap-2">
              {(["year", "month", "day"] as const).map((p) => (
                <button
                  type="button"
                  key={p}
                  onClick={() => setDatePrecision(p)}
                  className={`rounded-md border px-2 py-1.5 text-xs font-medium ${
                    datePrecision === p
                      ? "border-primary bg-primary/10 text-primary"
                      : "border-input text-muted-foreground"
                  }`}
                >
                  {p === "year" ? `${year}年のみ` : p === "month" ? "月まで" : "日まで"}
                </button>
              ))}
            </div>
          </div>

          {datePrecision !== "year" && (
            <div className="grid grid-cols-2 gap-3">
              <div className="flex flex-col gap-1.5">
                <Label>月</Label>
                <Select value={month} onValueChange={setMonth}>
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    {MONTHS.map((m) => (
                      <SelectItem key={m} value={String(m)}>
                        {m}月
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              {datePrecision === "day" && (
                <div className="flex flex-col gap-1.5">
                  <Label>日</Label>
                  <Input
                    type="number"
                    min={1}
                    max={31}
                    value={day}
                    onChange={(e) => setDay(e.target.value)}
                  />
                </div>
              )}
            </div>
          )}

          <div className="flex flex-col gap-1.5">
            <Label>収入源</Label>
            <Select value={sourceUuid} onValueChange={setSourceUuid}>
              <SelectTrigger>
                <SelectValue placeholder="選択" />
              </SelectTrigger>
              <SelectContent>
                {sources.map((s) => (
                  <SelectItem key={s.uuid} value={s.uuid}>
                    {s.name}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          <div className="flex flex-col gap-1.5">
            <Label htmlFor="past-company">会社・組織（任意）</Label>
            <Input
              id="past-company"
              value={companyName}
              onChange={(e) => setCompanyName(e.target.value)}
            />
          </div>

          <div className="flex flex-col gap-1.5">
            <Label htmlFor="past-memo">メモ（任意）</Label>
            <Input id="past-memo" value={memo} onChange={(e) => setMemo(e.target.value)} />
          </div>

          <SheetFooter>
            <Button type="submit" size="lg" disabled={status === "submitting"}>
              {status === "submitting" && <Loader2 className="size-4 animate-spin" />}
              {status === "success" && <Check className="size-4" />}
              追加する
            </Button>
          </SheetFooter>
        </form>
      </SheetContent>
    </Sheet>
  );
}

function pad(v: string) {
  return v.padStart(2, "0");
}
