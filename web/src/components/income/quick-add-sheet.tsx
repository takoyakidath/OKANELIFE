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
import { formatYen } from "@/lib/format";
import { MILESTONE_LABELS, pickHighlightMilestone } from "@/lib/milestones";
import type { Company, IncomeSource, Milestone } from "@/lib/types";

const LAST_SOURCE_KEY = "okanelife:last-source";

/** Local calendar date as YYYY-MM-DD. (`toISOString()` is UTC, which returns
 * the previous day in Japan before 9:00.) */
function localDate(offsetDays = 0) {
  const d = new Date();
  d.setDate(d.getDate() + offsetDays);
  const pad = (n: number) => String(n).padStart(2, "0");
  return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}`;
}

function today() {
  return localDate();
}

function readLastSource(): string | null {
  try {
    return localStorage.getItem(LAST_SOURCE_KEY);
  } catch {
    return null;
  }
}

function writeLastSource(uuid: string) {
  try {
    localStorage.setItem(LAST_SOURCE_KEY, uuid);
  } catch {
    // storage unavailable (private mode etc.) — falls back to the first source
  }
}

export function QuickAddSheet({
  open,
  onOpenChange,
  onMilestone,
}: {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onMilestone?: (message: string) => void;
}) {
  const router = useRouter();
  const [sources, setSources] = useState<IncomeSource[]>([]);
  const [companies, setCompanies] = useState<Company[]>([]);
  const [amount, setAmount] = useState("");
  const [date, setDate] = useState(today());
  const [sourceUuid, setSourceUuid] = useState<string>("");
  const [companyName, setCompanyName] = useState("");
  const [memo, setMemo] = useState("");
  const [recordedAmount, setRecordedAmount] = useState<number | null>(null);
  const [status, setStatus] = useState<"idle" | "submitting" | "success" | "error">(
    "idle"
  );
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const amountInputRef = useRef<HTMLInputElement>(null);
  // Milestone uuids known before this record, to tell which ones are new.
  const knownMilestonesRef = useRef<Set<string> | null>(null);

  useEffect(() => {
    if (!open) return;
    apiClient
      .get<IncomeSource[]>("/sources")
      .then((data) => {
        setSources(data);
        if (!sourceUuid && data.length > 0) {
          const last = readLastSource();
          const remembered = data.find((s) => s.uuid === last);
          setSourceUuid((remembered ?? data[0]).uuid);
        }
      })
      .catch(() => {});
    knownMilestonesRef.current = null;
    apiClient
      .get<Milestone[]>("/milestones")
      .then((list) => {
        knownMilestonesRef.current = new Set(list.map((m) => m.uuid));
      })
      .catch(() => {});
    apiClient
      .get<Company[]>("/companies?recent=1")
      .then(setCompanies)
      .catch(() => {});
    setTimeout(() => amountInputRef.current?.focus(), 50);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [open]);

  function reset() {
    setAmount("");
    setDate(today());
    setCompanyName("");
    setMemo("");
    setStatus("idle");
    setRecordedAmount(null);
    setErrorMessage(null);
  }

  async function findNewMilestoneMessage(): Promise<string | null> {
    const known = knownMilestonesRef.current;
    if (!known) return null;
    try {
      const after = await apiClient.get<Milestone[]>("/milestones");
      const highlight = pickHighlightMilestone(
        after.filter((m) => !known.has(m.uuid))
      );
      if (!highlight) return null;
      const label = MILESTONE_LABELS[highlight.type]?.(highlight.value);
      return label ? `マイルストーン達成：${label}` : null;
    } catch {
      return null;
    }
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    const numericAmount = Number(amount.replace(/[^0-9]/g, ""));
    if (!numericAmount || numericAmount <= 0) {
      setErrorMessage("金額を入力してください");
      return;
    }

    setStatus("submitting");
    setErrorMessage(null);
    try {
      await apiClient.post("/incomes", {
        amount: numericAmount,
        amount_precision: "exact",
        income_date: date,
        date_precision: "day",
        source_uuid: sourceUuid || null,
        company_name: companyName || null,
        memo: memo || null,
      });
      setRecordedAmount(numericAmount);
      setStatus("success");
      if (sourceUuid) writeLastSource(sourceUuid);
      router.refresh();
      const milestoneMessage = await findNewMilestoneMessage();
      setTimeout(() => {
        onOpenChange(false);
        reset();
        if (milestoneMessage) onMilestone?.(milestoneMessage);
      }, 900);
    } catch {
      setStatus("error");
      setErrorMessage("保存できませんでした。もう一度お試しください。");
    }
  }

  return (
    <Sheet
      open={open}
      onOpenChange={(next) => {
        onOpenChange(next);
        if (!next) reset();
      }}
    >
      <SheetContent side="bottom">
        <SheetHeader>
          <SheetTitle>収入を記録</SheetTitle>
          <SheetDescription>金額だけ入れて、あとはそのまま記録できます。</SheetDescription>
        </SheetHeader>

        <form onSubmit={handleSubmit} className="flex flex-col gap-4 px-5">
          <div className="flex flex-col gap-1.5">
            <Label htmlFor="amount">金額</Label>
            <div className="relative">
              <span className="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 text-lg text-muted-foreground">
                ¥
              </span>
              <Input
                ref={amountInputRef}
                id="amount"
                inputMode="numeric"
                autoComplete="off"
                placeholder="0"
                value={amount}
                onChange={(e) => setAmount(e.target.value)}
                className="h-14 pl-8 text-2xl font-semibold tabular-nums"
              />
            </div>
          </div>

          <div className="flex flex-col gap-1.5">
            <Label htmlFor="date">日付</Label>
            <div className="flex items-center gap-2">
              <Input
                id="date"
                type="date"
                value={date}
                max={today()}
                onChange={(e) => setDate(e.target.value)}
                className="flex-1"
              />
              {[
                { label: "今日", value: localDate() },
                { label: "昨日", value: localDate(-1) },
              ].map((chip) => (
                <Button
                  key={chip.label}
                  type="button"
                  variant={date === chip.value ? "secondary" : "outline"}
                  aria-pressed={date === chip.value}
                  className="h-11"
                  onClick={() => setDate(chip.value)}
                >
                  {chip.label}
                </Button>
              ))}
            </div>
          </div>

          <div className="flex flex-col gap-4 border-t border-border pt-4">
            <p className="text-xs font-medium text-muted-foreground">
              詳細（あとからでも追加できます）
            </p>

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
              <Label htmlFor="company">会社・組織（任意）</Label>
              <Input
                id="company"
                list="recent-companies"
                placeholder="例：サイゼリヤ"
                value={companyName}
                onChange={(e) => setCompanyName(e.target.value)}
              />
              <datalist id="recent-companies">
                {companies.map((c) => (
                  <option key={c.uuid} value={c.name} />
                ))}
              </datalist>
            </div>

            <div className="flex flex-col gap-1.5">
              <Label htmlFor="memo">メモ（任意）</Label>
              <Input
                id="memo"
                placeholder="例：9月分給与"
                value={memo}
                onChange={(e) => setMemo(e.target.value)}
              />
            </div>
          </div>

          {errorMessage && (
            <p className="text-sm text-destructive">{errorMessage}</p>
          )}

          <SheetFooter>
            <Button
              type="submit"
              size="lg"
              disabled={status === "submitting" || status === "success"}
            >
              {status === "submitting" && <Loader2 className="size-4 animate-spin" />}
              {status === "success" && <Check className="size-4" />}
              {status === "success" && recordedAmount !== null
                ? `${formatYen(recordedAmount)}を記録しました`
                : "記録する"}
            </Button>
          </SheetFooter>
        </form>
      </SheetContent>
    </Sheet>
  );
}
