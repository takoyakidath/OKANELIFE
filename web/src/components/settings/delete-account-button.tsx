"use client";

import { useState } from "react";
import { apiClient, ApiError } from "@/lib/api-client";
import { Button } from "@/components/ui/button";

export function DeleteAccountButton() {
  const [confirming, setConfirming] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function handleDelete() {
    try {
      await apiClient.delete("/me");
      await fetch("/api/auth/logout", { method: "POST" });
      // Full reload: the session cookie was just cleared server-side, so
      // this needs to be a fresh navigation, not a client-side route change.
      // eslint-disable-next-line @next/next/no-location-assign-relative-destination
      window.location.href = "/login";
    } catch (e) {
      setError(e instanceof ApiError ? e.message : "削除に失敗しました");
    }
  }

  if (!confirming) {
    return (
      <Button variant="destructive" onClick={() => setConfirming(true)}>
        アカウントを削除する
      </Button>
    );
  }

  return (
    <div className="flex flex-col gap-2">
      <p className="text-sm text-destructive">
        本当に削除しますか？すべてのデータが削除され、元に戻せません。
      </p>
      {error && <p className="text-sm text-destructive">{error}</p>}
      <div className="flex gap-2">
        <Button variant="destructive" onClick={handleDelete}>
          削除を確定する
        </Button>
        <Button variant="outline" onClick={() => setConfirming(false)}>
          キャンセル
        </Button>
      </div>
    </div>
  );
}
