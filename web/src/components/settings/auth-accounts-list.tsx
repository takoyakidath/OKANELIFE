"use client";

import { useRouter } from "next/navigation";
import { useState } from "react";
import { Trash2 } from "lucide-react";

import { apiClient, ApiError } from "@/lib/api-client";
import type { AuthAccount } from "@/lib/types";

export function AuthAccountsList({ accounts }: { accounts: AuthAccount[] }) {
  const router = useRouter();
  const [error, setError] = useState<string | null>(null);

  async function remove(id: string) {
    if (accounts.length <= 1) {
      setError("最後の1つのログイン方法は解除できません。先に別のアカウントを追加してください。");
      return;
    }
    if (!confirm("このアカウントとの連携を解除しますか？")) return;
    try {
      await apiClient.delete(`/auth/accounts/${id}`);
      router.refresh();
    } catch (e) {
      setError(e instanceof ApiError ? e.message : "解除に失敗しました");
    }
  }

  return (
    <div className="flex flex-col gap-2">
      {error && <p className="text-sm text-destructive">{error}</p>}
      <div className="flex flex-col divide-y divide-border rounded-xl border border-border bg-card">
        {accounts.map((a) => (
          <div key={a.id} className="flex items-center justify-between px-4 py-3">
            <div>
              <p className="text-sm font-medium">Google</p>
              <p className="text-xs text-muted-foreground">{a.email}</p>
            </div>
            <button
              type="button"
              onClick={() => remove(a.id)}
              className="text-muted-foreground hover:text-destructive"
              aria-label="連携を解除"
            >
              <Trash2 className="size-4" />
            </button>
          </div>
        ))}
      </div>
      <a
        href="/api/auth/google/start?mode=link&redirect=/settings/account"
        className="rounded-lg border border-input py-2.5 text-center text-sm font-medium"
      >
        別のGoogleアカウントを追加
      </a>
    </div>
  );
}
