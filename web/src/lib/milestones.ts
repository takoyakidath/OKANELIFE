import { formatCompactYen } from "./format";

export const MILESTONE_LABELS: Record<string, (value: number | null) => string> = {
  first_income: () => "初めて収入を記録",
  cumulative_total: (v) => `累計${formatCompactYen(v ?? 0)}`,
  income_count: (v) => `収入記録${v}件`,
  best_month: () => "月収最高記録",
  best_year: () => "年収最高記録",
  streak_12_months: () => "12か月連続収入",
};

/** Display priority when several milestones land at once — only one toast is
 * shown, so the most significant wins (larger cumulative thresholds first). */
const MILESTONE_PRIORITY = [
  "cumulative_total",
  "streak_12_months",
  "best_year",
  "income_count",
  "first_income",
  "best_month",
];

export function pickHighlightMilestone<
  T extends { type: string; value: number | null },
>(milestones: T[]): T | null {
  const rank = (type: string) => {
    const i = MILESTONE_PRIORITY.indexOf(type);
    return i === -1 ? MILESTONE_PRIORITY.length : i;
  };
  return (
    [...milestones].sort(
      (a, b) => rank(a.type) - rank(b.type) || (b.value ?? 0) - (a.value ?? 0)
    )[0] ?? null
  );
}
