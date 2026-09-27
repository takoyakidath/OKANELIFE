import Link from "next/link";
import { ChevronRight, Trophy } from "lucide-react";

import { getMe, getMilestones } from "@/lib/api-server";
import { MILESTONE_LABELS } from "@/lib/milestones";

export default async function SettingsPage() {
  const [me, milestones] = await Promise.all([getMe(), getMilestones()]);

  return (
    <div className="flex flex-col gap-6 py-6">
      <div>
        <h1 className="text-lg font-semibold">設定</h1>
        <p className="mt-1 text-sm text-muted-foreground">{me.name ?? me.email}</p>
      </div>

      {milestones.length > 0 && (
        <div className="rounded-xl border border-border bg-card p-4">
          <div className="mb-2 flex items-center gap-2">
            <Trophy className="size-4 text-primary" />
            <p className="text-sm font-medium">マイルストーン</p>
          </div>
          <div className="flex flex-wrap gap-2">
            {milestones.slice(0, 6).map((m) => (
              <span
                key={m.uuid}
                className="rounded-full bg-secondary px-3 py-1 text-xs text-secondary-foreground"
              >
                {MILESTONE_LABELS[m.type]?.(m.value) ?? m.type}
              </span>
            ))}
          </div>
        </div>
      )}

      <nav className="flex flex-col divide-y divide-border overflow-hidden rounded-xl border border-border bg-card">
        <SettingsLink href="/settings/account" label="アカウント" />
        <SettingsLink href="/settings/data" label="データ（エクスポート・インポート）" />
        <SettingsLink href="/past" label="過去の収入を整理" />
      </nav>

      <form action="/api/auth/logout" method="POST">
        <button
          type="submit"
          className="w-full rounded-lg border border-input py-2.5 text-sm font-medium text-muted-foreground"
        >
          ログアウト
        </button>
      </form>
    </div>
  );
}

function SettingsLink({ href, label }: { href: string; label: string }) {
  return (
    <Link href={href} className="flex items-center justify-between px-4 py-3.5 text-sm">
      {label}
      <ChevronRight className="size-4 text-muted-foreground" />
    </Link>
  );
}
