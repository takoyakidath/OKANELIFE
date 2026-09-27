"use client";

import { useState } from "react";
import { Plus, Check } from "lucide-react";

import { formatCompactYen } from "@/lib/format";
import { PastEntrySheet } from "./past-entry-sheet";

export function PastCleanupList({
  years,
}: {
  years: { year: number; total: number; count: number }[];
}) {
  const [openYear, setOpenYear] = useState<number | null>(null);
  const [addedYears, setAddedYears] = useState<Set<number>>(new Set());

  return (
    <>
      <div className="flex flex-col gap-2">
        {years.map((y) => {
          const hasData = y.count > 0 || addedYears.has(y.year);
          return (
            <div
              key={y.year}
              className="flex items-center justify-between rounded-xl border border-border bg-card px-4 py-3"
            >
              <div>
                <p className="font-medium">{y.year}年</p>
                <p className="text-xs text-muted-foreground">
                  {hasData ? `${formatCompactYen(y.total)}（${y.count}件）` : "記録なし"}
                </p>
              </div>
              <button
                type="button"
                onClick={() => setOpenYear(y.year)}
                className="flex items-center gap-1 rounded-lg border border-input px-3 py-1.5 text-sm font-medium"
              >
                {hasData ? <Check className="size-3.5" /> : <Plus className="size-3.5" />}
                収入を追加
              </button>
            </div>
          );
        })}
      </div>

      <PastEntrySheet
        year={openYear}
        onOpenChange={(open) => !open && setOpenYear(null)}
        onSaved={(year) => setAddedYears((prev) => new Set(prev).add(year))}
      />
    </>
  );
}
