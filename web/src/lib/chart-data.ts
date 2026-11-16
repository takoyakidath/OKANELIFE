import type { CategoryTotal } from "./types";

/** Keeps the largest `limit` categories and folds the rest into "その他", so
 * the donut never needs more colors than the palette has. */
export function groupTopCategories(
  data: CategoryTotal[],
  limit = 5
): CategoryTotal[] {
  if (data.length <= limit) return data;
  const sorted = [...data].sort((a, b) => b.total - a.total);
  const rest = sorted.slice(limit);
  return [
    ...sorted.slice(0, limit),
    {
      key: "other",
      label: "その他",
      total: rest.reduce((sum, c) => sum + c.total, 0),
    },
  ];
}
