import Link from "next/link";
import { ChevronRight } from "lucide-react";
import { formatCompactYen } from "@/lib/format";

export function RetrospectiveCta({
  year,
  total,
}: {
  year: number;
  total: number;
}) {
  return (
    <Link
      href={`/retrospective/${year}`}
      className="flex items-center justify-between rounded-2xl bg-primary px-5 py-4 text-primary-foreground"
    >
      <div>
        <p className="text-xs opacity-80">振り返る</p>
        <p className="font-semibold">
          {year}年、あなたは{formatCompactYen(total)}稼ぎました
        </p>
      </div>
      <ChevronRight className="size-5 shrink-0" />
    </Link>
  );
}
