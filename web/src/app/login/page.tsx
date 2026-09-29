import { TrendingUp } from "lucide-react";

const ERROR_MESSAGES: Record<string, string> = {
  google_denied: "Googleログインがキャンセルされました。",
  oauth_state: "ログイン処理がタイムアウトしました。もう一度お試しください。",
  google_token_exchange: "Googleとの通信に失敗しました。もう一度お試しください。",
  no_id_token: "Googleからの応答を確認できませんでした。",
};

export default async function LoginPage({
  searchParams,
}: PageProps<"/login">) {
  const params = await searchParams;
  const redirectParam = typeof params.redirect === "string" ? params.redirect : "/";
  const errorParam = typeof params.error === "string" ? params.error : undefined;
  const errorMessage = errorParam
    ? ERROR_MESSAGES[errorParam] ?? "ログインに失敗しました。もう一度お試しください。"
    : null;

  const startUrl = `/api/auth/google/start?redirect=${encodeURIComponent(redirectParam)}`;

  return (
    <main className="flex flex-1 flex-col items-center justify-center gap-10 px-6 py-16 text-center">
      <div className="flex flex-col items-center gap-3">
        <div className="flex size-14 items-center justify-center rounded-2xl bg-primary text-primary-foreground">
          <TrendingUp className="size-7" />
        </div>
        <h1 className="text-2xl font-semibold">OKANELIFE</h1>
        <p className="max-w-xs text-sm leading-relaxed text-muted-foreground">
          あなたは、これまでの人生でいくら稼いだ？
          <br />
          お金の記録を積み重ね、あとから振り返るためのライフログ。
        </p>
      </div>

      {errorMessage && (
        <p className="rounded-md bg-destructive/10 px-4 py-2 text-sm text-destructive">
          {errorMessage}
        </p>
      )}

      <a
        href={startUrl}
        className="flex h-12 w-full max-w-xs items-center justify-center gap-2 rounded-lg border border-input bg-card px-4 text-sm font-medium shadow-sm transition-colors hover:bg-accent"
      >
        <GoogleGlyph />
        Googleでログイン
      </a>

      <p className="max-w-xs text-xs text-muted-foreground">
        OKANELIFEはあなたのGoogleアカウントとは別に、独立したユーザーIDでデータを保管します。
        Googleアカウントを変更してもデータは失われません。
      </p>
    </main>
  );
}

function GoogleGlyph() {
  return (
    <svg viewBox="0 0 24 24" className="size-4" aria-hidden>
      <path
        fill="#4285F4"
        d="M23.52 12.27c0-.85-.08-1.67-.22-2.45H12v4.63h6.48c-.28 1.5-1.13 2.77-2.41 3.62v3.01h3.89c2.28-2.1 3.56-5.2 3.56-8.81z"
      />
      <path
        fill="#34A853"
        d="M12 24c3.24 0 5.95-1.07 7.96-2.92l-3.89-3.01c-1.08.73-2.46 1.16-4.07 1.16-3.13 0-5.78-2.11-6.73-4.96H1.24v3.11C3.24 21.3 7.28 24 12 24z"
      />
      <path
        fill="#FBBC05"
        d="M5.27 14.27a7.2 7.2 0 0 1 0-4.54V6.62H1.24a11.98 11.98 0 0 0 0 10.76z"
      />
      <path
        fill="#EA4335"
        d="M12 4.75c1.77 0 3.35.61 4.6 1.8l3.45-3.45C17.94 1.19 15.24 0 12 0 7.28 0 3.24 2.7 1.24 6.62l4.03 3.11C6.22 6.86 8.87 4.75 12 4.75z"
      />
    </svg>
  );
}
