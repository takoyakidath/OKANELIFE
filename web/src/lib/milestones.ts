import { formatCompactYen } from "./format";

export const MILESTONE_LABELS: Record<string, (value: number | null) => string> = {
  first_income: () => "初めて収入を記録",
  cumulative_total: (v) => `累計${formatCompactYen(v ?? 0)}`,
  income_count: (v) => `収入記録${v}件`,
  best_month: () => "月収最高記録",
  best_year: () => "年収最高記録",
  streak_12_months: () => "12か月連続収入",
};
