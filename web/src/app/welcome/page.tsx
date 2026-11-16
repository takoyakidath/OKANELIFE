import {
  Building2,
  CalendarRange,
  ChartLine,
  Download,
  Flag,
  Sprout,
  TrendingUp,
} from "lucide-react";
import type { Metadata } from "next";

export const metadata: Metadata = {
  title: "あなたは、これまでの人生でいくら稼いだ？",
};

const START_URL = "/api/auth/google/start?redirect=%2F";

const FEATURES = [
  {
    icon: Sprout,
    title: "はじめての収入から記録",
    body: "お小遣い、アルバイト、給料、副業。15歳の1,000円も、いまの給料も、同じ場所に積み重ねます。",
  },
  {
    icon: Building2,
    title: "どこから稼いだかが見える",
    body: "会社・収入源ごとの累計がひと目で分かります。これまでお世話になった場所を振り返れます。",
  },
  {
    icon: ChartLine,
    title: "年別・月別・年齢別の推移",
    body: "いつ収入が増えたのか、何歳でいくら稼いでいたのか。グラフで人生の流れをたどれます。",
  },
  {
    icon: Flag,
    title: "マイルストーン",
    body: "最初の1万円、100万円、1,000万円。節目を越えた瞬間が、記録として残ります。",
  },
  {
    icon: CalendarRange,
    title: "1年の振り返り",
    body: "年ごとのまとめと、前の年との比較。今年の自分を、数字と一緒に見返せます。",
  },
  {
    icon: Download,
    title: "データはあなたのもの",
    body: "いつでもエクスポートできます。Googleアカウントを変えても、データは失われません。",
  },
];

const STEPS = [
  { n: "1", title: "Googleでログイン", body: "アカウント登録は不要。数秒で始められます。" },
  { n: "2", title: "収入を記録する", body: "金額と日付だけでOK。過去の分もあとから足せます。" },
  { n: "3", title: "振り返る", body: "積み重ねるほど、あなたのお金の人生が見えてきます。" },
];

export default function WelcomePage() {
  return (
    <div className="flex flex-1 flex-col">
      <header className="mx-auto flex w-full max-w-5xl items-center justify-between px-6 py-5">
        <span className="flex items-center gap-2 font-semibold">
          <span className="flex size-8 items-center justify-center rounded-lg bg-primary text-primary-foreground">
            <TrendingUp className="size-4" />
          </span>
          OKANELIFE
        </span>
        <a
          href={START_URL}
          className="rounded-lg px-3 py-2 text-sm font-medium text-muted-foreground transition-colors hover:text-foreground"
        >
          ログイン
        </a>
      </header>

      <main className="flex flex-1 flex-col">
        {/* Hero */}
        <section className="mx-auto grid w-full max-w-5xl items-center gap-12 px-6 pb-20 pt-10 md:grid-cols-[1.1fr_0.9fr] md:pt-20">
          <div className="flex flex-col items-start gap-6">
            <h1 className="text-4xl font-semibold leading-tight tracking-tight md:text-5xl">
              あなたは、これまでの
              <br />
              人生でいくら稼いだ？
            </h1>
            <p className="max-w-md leading-relaxed text-muted-foreground">
              {
                "OKANELIFEは、収入を記録し、積み重ね、あとから振り返るためのお金のライフログ。家計簿が「使ったお金」を見るなら、こちらは「得てきたお金」を見ます。"
              }
            </p>
            <a
              href={START_URL}
              className="inline-flex h-12 items-center justify-center rounded-lg bg-primary px-6 text-sm font-medium text-primary-foreground shadow-sm transition-opacity hover:opacity-90"
            >
              Googleではじめる
            </a>
            <p className="text-xs text-muted-foreground">無料で始められます。</p>
          </div>

          <HeroSample />
        </section>

        {/* Features */}
        <section className="bg-muted/60">
          <div className="mx-auto w-full max-w-5xl px-6 py-20">
            <h2 className="text-2xl font-semibold">記録するほど、人生が見えてくる</h2>
            <ul className="mt-10 grid gap-x-10 gap-y-10 sm:grid-cols-2 lg:grid-cols-3">
              {FEATURES.map(({ icon: Icon, title, body }) => (
                <li key={title} className="flex flex-col gap-3">
                  <Icon className="size-6 text-primary" aria-hidden />
                  <h3 className="font-semibold">{title}</h3>
                  <p className="text-sm leading-relaxed text-muted-foreground">{body}</p>
                </li>
              ))}
            </ul>
          </div>
        </section>

        {/* Steps */}
        <section className="mx-auto w-full max-w-5xl px-6 py-20">
          <h2 className="text-2xl font-semibold">3ステップで始める</h2>
          <ol className="mt-10 grid gap-8 md:grid-cols-3">
            {STEPS.map((step) => (
              <li key={step.n} className="flex gap-4">
                <span className="flex size-9 shrink-0 items-center justify-center rounded-full bg-accent font-semibold text-accent-foreground">
                  {step.n}
                </span>
                <div>
                  <h3 className="font-semibold">{step.title}</h3>
                  <p className="mt-1 text-sm leading-relaxed text-muted-foreground">
                    {step.body}
                  </p>
                </div>
              </li>
            ))}
          </ol>
        </section>

        {/* Final CTA */}
        <section className="mx-auto w-full max-w-5xl px-6 pb-24">
          <div className="flex flex-col items-start gap-5 rounded-3xl bg-secondary px-8 py-12 md:flex-row md:items-center md:justify-between">
            <p className="text-xl font-semibold leading-snug md:text-2xl">
              最初の1行から、
              <br className="md:hidden" />
              あなたのお金の人生を。
            </p>
            <a
              href={START_URL}
              className="inline-flex h-12 shrink-0 items-center justify-center rounded-lg bg-primary px-6 text-sm font-medium text-primary-foreground shadow-sm transition-opacity hover:opacity-90"
            >
              Googleではじめる
            </a>
          </div>
        </section>
      </main>

      <footer className="mx-auto w-full max-w-5xl px-6 pb-10 text-xs text-muted-foreground">
        OKANELIFEはGoogleアカウントとは別に、独立したユーザーIDでデータを保管します。
      </footer>
    </div>
  );
}

/** Illustrative only — static numbers, not real data. */
function HeroSample() {
  return (
    <figure
      className="rounded-3xl border bg-card p-6 shadow-sm"
      aria-label="表示イメージ(サンプル)"
    >
      <p className="text-xs text-muted-foreground">これまでの収入の合計</p>
      <p className="mt-1 text-4xl font-semibold tabular-nums tracking-tight">¥12,480,000</p>
      <svg viewBox="0 0 300 100" className="mt-6 h-24 w-full" role="img" aria-hidden>
        <path
          d="M0 92 C40 90 60 86 90 78 S140 62 170 50 S230 28 300 8"
          fill="none"
          stroke="var(--primary)"
          strokeWidth="3"
          strokeLinecap="round"
        />
      </svg>
      <figcaption className="mt-4 flex justify-between text-xs text-muted-foreground">
        <span>15歳</span>
        <span>いま</span>
      </figcaption>
    </figure>
  );
}
