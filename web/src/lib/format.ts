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

/** Y-axis tick formatter for a yen chart. The unit is chosen once per chart
 * (from its largest value) and shown as a caption, so tick labels stay short
 * (`50`, `100`) instead of repeating "万円" on every tick. */
export function yenAxis(values: number[]): {
  unit: "万円" | "円";
  format: (v: number) => string;
} {
  const max = Math.max(0, ...values.map((v) => Math.abs(v)));
  if (max >= 10000) {
    return {
      unit: "万円",
      format: (v) =>
        (v / 10000).toLocaleString("ja-JP", { maximumFractionDigits: 1 }),
    };
  }
  return { unit: "円", format: (v) => v.toLocaleString("ja-JP") };
}
