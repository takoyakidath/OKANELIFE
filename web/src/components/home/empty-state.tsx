import Link from "next/link";
import { Sparkles } from "lucide-react";
import { Button } from "@/components/ui/button";

export function HomeEmptyState() {
  return (
    <div className="flex flex-col items-center gap-4 rounded-2xl border border-dashed border-border px-6 py-12 text-center">
      <Sparkles className="size-8 text-primary" />
      <div className="space-y-1">
        <p className="font-medium">まだ記録がありません</p>
        <p className="text-sm text-muted-foreground">
          右下の「＋」から、今月の収入を記録してみましょう。
          <br />
          過去の収入も、あとからまとめて追加できます。
        </p>
      </div>
      <Button asChild variant="outline">
        <Link href="/past">過去の収入を整理する</Link>
      </Button>
    </div>
  );
}
