"use client";

import { useEffect } from "react";
import { Button } from "@/components/ui/button";

export default function AppError({
  error,
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  useEffect(() => {
    console.error(error);
  }, [error]);

  return (
    <div className="flex flex-1 flex-col items-center justify-center gap-4 py-16 text-center">
      <p className="font-medium">読み込みに失敗しました</p>
      <p className="max-w-xs text-sm text-muted-foreground">
        サーバーとの通信でエラーが発生しました。しばらくしてから再度お試しください。
      </p>
      <Button onClick={reset}>もう一度試す</Button>
    </div>
  );
}
