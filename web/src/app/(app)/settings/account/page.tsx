import Link from "next/link";
import { getMe, getAuthAccounts } from "@/lib/api-server";
import { BirthDateForm } from "@/components/settings/birth-date-form";
import { AuthAccountsList } from "@/components/settings/auth-accounts-list";
import { DeleteAccountButton } from "@/components/settings/delete-account-button";

export default async function AccountSettingsPage() {
  const [me, accounts] = await Promise.all([getMe(), getAuthAccounts()]);

  return (
    <div className="flex flex-col gap-6 py-6">
      <h1 className="text-lg font-semibold">アカウント</h1>

      <section className="rounded-xl border border-border bg-card p-4">
        <BirthDateForm initialValue={me.birth_date} />
        <p className="mt-2 text-xs text-muted-foreground">
          設定すると、年齢ごとの収入の変化を振り返れるようになります。他のユーザーとは共有されません。
        </p>
      </section>

      <section className="flex flex-col gap-2">
        <p className="text-sm font-medium">ログイン方法</p>
        <p className="text-xs text-muted-foreground">
          Googleアカウントを変更しても、OKANELIFEのデータは失われません。新しいアカウントを追加してから、古いものを解除してください。
        </p>
        <AuthAccountsList accounts={accounts} />
      </section>

      <section className="flex flex-col gap-2 rounded-xl border border-destructive/30 bg-destructive/5 p-4">
        <p className="text-sm font-medium text-destructive">アカウントの削除</p>
        <p className="text-xs text-muted-foreground">
          削除する前に、データをエクスポートしておくことをおすすめします。
        </p>
        <Link href="/settings/data" className="text-xs text-primary">
          データをエクスポートする →
        </Link>
        <div className="mt-2">
          <DeleteAccountButton />
        </div>
      </section>
    </div>
  );
}
