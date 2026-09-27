import type { AmountPrecision, DatePrecision } from "./types";

const yenFormatter = new Intl.NumberFormat("ja-JP", {
  style: "currency",
  currency: "JPY",
  maximumFractionDigits: 0,
});

export function formatYen(amount: number | null): string {
  if (amount === null) return "金額不明";
  return yenFormatter.format(amount);
}

export function formatYenWithPrecision(
  amount: number | null,
  precision: AmountPrecision
): string {
  if (amount === null || precision === "unknown") return "金額不明";
  const formatted = yenFormatter.format(amount);
  return precision === "estimated" ? `約${formatted}` : formatted;
}

export function formatDateWithPrecision(
  isoDate: string,
  precision: DatePrecision
): string {
  const d = new Date(isoDate);
  const year = d.getFullYear();
  const month = d.getMonth() + 1;
  const day = d.getDate();
  switch (precision) {
    case "day":
      return `${year}/${month}/${day}`;
    case "month":
      return `${year}年${month}月頃`;
    case "year":
      return `${year}年`;
    case "unknown":
    default:
      return "時期不明";
  }
}

export function formatCompactYen(amount: number): string {
  if (Math.abs(amount) >= 10000) {
    return `${(amount / 10000).toLocaleString("ja-JP", {
      maximumFractionDigits: 1,
    })}万円`;
  }
  return yenFormatter.format(amount);
}
