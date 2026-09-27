# OKANELIFE 設計レビュー & アーキテクチャ

このドキュメントは `product.txt`(企画書)を実装可能な設計に落とし込むためのレビュー記録です。
企画の意図(「家計簿ではなく、お金の人生を振り返るライフログ」)は完全に維持しつつ、
UX・DB・API・認証・セキュリティ・PWA・データポータビリティ・長期運用の観点で
変更した点と、その理由をまとめます。

実装コードを読む前に一度通読してください。今後の機能追加・仕様変更もこの文書を更新する前提で行います。

---

## 1. 総評

企画書の思想(生涯ログ・過去データ歓迎・データポータビリティ最優先)はそのまま良い設計方針です。
レビューで変更したのは主に **実装の堅牢性と長期運用性** に関わる部分で、UXの方向性そのものは変えていません。

変更のスタンスは3つ:

1. **企画の「体験」は変えない**(ホーム画面の構成、過去整理モード、振り返り画面、マイルストーンの温度感 等)
2. **企画の「データモデル」は精緻化する**(exact/estimated/unknownの扱い、通貨、内部IDと公開IDの分離 等)
3. **企画の「インフラ構成」は1点だけ大きく変える**(下記2章 BFFパターン)。理由は次章で説明します。

---

## 2. アーキテクチャ: BFF (Backend for Frontend) パターンの採用

### 企画書の構成
```
Google → Next.js/Vercel → Lolipop PHP API → MySQL
```
このままだと、ブラウザ(Next.js のクライアントコンポーネント)から **直接** `*.lolipop.jp` のPHP APIを
`fetch` する構成になりがちです。これには3つの問題があります。

1. **クロスオリジンCookie問題**: Vercel(独自ドメイン)とLolipop(別ドメイン)間でCookieベースの
   セッションを使うと、`SameSite=None` が必須になり、iOS Safari のITP等でブロックされやすく、
   将来的にサードパーティCookieが完全に廃止された場合に詰みます。
2. **CORSが実質的に「誰でも呼べるAPI」になる**: ブラウザから直接叩けるようにする以上、
   Originを絞っても攻撃対象領域が広い(トークンの保管場所もブラウザ)。
3. **秘密情報をクライアントに置く必要が出る**: Google Client Secret等をどこで扱うか曖昧になる。

### 採用する構成
```
ブラウザ
  ↓ (Cookie: httpOnly, SameSite=Lax, Vercelドメインのみ)
Next.js Route Handlers (Vercel, サーバー側)  ← BFF層
  ↓ (Bearer JWT, サーバー間通信のみ)
Lolipop PHP API
  ↓
MySQL
```

- ブラウザは **常に自分のオリジン(Next.js)としか通信しない**。Cookieは同一オリジンのhttpOnly Cookieのみ。
- Next.jsのRoute Handler(`app/api/**/route.ts`)がCookieからアクセストークンを取り出し、
  PHP APIへは `Authorization: Bearer <JWT>` を付けてサーバー間で中継する。
- PHP API は **ブラウザから直接呼ばれることを想定しない**。CORSはNext.jsのオリジンすら許可不要
  (サーバー間通信はCORS対象外)。これにより攻撃対象領域が大きく減る。
- Google OAuthの「Authorization Code」交換もNext.js側のRoute Handlerで行い、
  Google Client SecretはVercelの環境変数にのみ置く。PHP側はGoogleと直接通信しない
  (Googleの公開鍵でIDトークンの署名を検証するだけ)。

このパターンにより、**Cookie/CORS/秘密情報管理の3つの懸念が同時に解消**されます。
将来Vercel/Lolipopのどちらかを別サービスに置き換えても、境界はBFF層に閉じているため影響が少ないです。

---

## 3. 認証設計

### 3.1 ユーザーモデル(企画書どおり、独立ID)
```
okanelife_users (内部ユーザー)
  └── auth_accounts (1:N) — Google等の外部IDと紐付け
```
Googleの `sub`(Google User ID)をアプリのユーザーIDとして絶対に使わない。

### 3.2 フロー
1. ブラウザ → Next.js `/api/auth/google/start` → Googleの認可画面へリダイレクト
2. Google → Next.js `/api/auth/google/callback`(Authorization Code受け取り)
3. Next.js が Google と直接通信し、**IDトークンを取得**(サーバー間、Client Secret使用)
4. Next.js が PHP API `/v1/auth/google` に IDトークンを転送
5. PHP が Google の JWKS (公開鍵) でIDトークンの署名・aud・issを検証
   (Googleの `/tokeninfo` を都度叩かず、JWKSをキャッシュして自前検証することで外部依存・レート制限を回避)
6. PHP が `auth_accounts.provider_account_id = sub` で既存ユーザーを検索、無ければ新規 `users` + `auth_accounts` を作成
7. PHP が **アクセストークン(短命JWT, 15分)** と **リフレッシュトークン(長命, DB保存・ハッシュ化)** を発行
8. Next.js が受け取り、リフレッシュトークンを httpOnly/Secure/SameSite=Lax Cookie に保存(Vercel側のみ)。
   アクセストークンはサーバーメモリ/短命Cookieのみで、クライアントJSには渡さない。

### 3.3 なぜGoogleトークンをDBに保存しないか
Googleのアクセストークン/リフレッシュトークンは **一切保存しない**。
サインイン時にIDトークンを検証して本人確認するだけなので、Google側のトークンを保持する必要がなく、
「もし漏洩したら」という懸念がそもそも発生しない設計にした(企画書 28章の要求を設計レベルで満たす)。

### 3.4 アカウント移行(Google変更)
`auth_accounts` に複数行を持てるため:
1. 設定画面で「別のGoogleアカウントを追加」→ 新しい `auth_accounts` 行を **既存ログイン中のユーザーに** 追加
2. 追加時、既に別ユーザーに紐付いているGoogleアカウントでないことを確認(乗っ取り防止)
3. 旧アカウントの解除は「最低1つの認証方法が残る」ことを必須条件にする(ロックアウト防止)
4. 解除前に再認証(直近ログインから一定時間以内、または再度Google認証)を要求

---

## 4. データベース設計

命名は企画書に準拠しつつ、以下を追加/変更しています(理由付き)。

### 変更点サマリ

| 変更 | 理由 |
|---|---|
| 全テーブルに `uuid`(公開ID)を追加、内部PKは非公開 | 連番IDの推測・スクレイピング防止、将来DB移行時もエクスポート上のIDが安定 |
| 金額は `BIGINT`(円の整数)。小数・浮動小数を使わない | JPYに小数はない。float誤差を排除 |
| `currency` 列を先に用意(既定 `JPY`) | 将来の多通貨対応を安価に確保(生涯利用前提のため) |
| 論理削除 `deleted_at` を主要テーブルに追加 | 誤削除からの復旧、エクスポート/インポートの整合性 |
| `refresh_tokens` テーブルを追加 | 個別デバイスのログアウト、Google移行時の安全な失効 |
| `export_jobs`/`import_jobs` を分離し `download_token` を追加 | エクスポートURLの推測防止(企画書28章要求) |
| `milestones` に一意制約 `(user_id, type, value)` | 重複生成防止 |
| `income_sources` は `user_id NULL` (システム標準) と `user_id` あり(独自) を同一テーブルで表現 | 標準/独自を統一的に扱え、将来カテゴリ追加が容易 |

### ER概要
```
users 1───N auth_accounts
users 1───N refresh_tokens
users 1───N income_sources (user_id NULL = システム共通)
users 1───N companies
users 1───N incomes ──N:1── income_sources
                    └─N:1── companies
users 1───N events ──N:1(nullable)── incomes
users 1───N milestones
users 1───N export_jobs
users 1───N import_jobs
```

詳細なCREATE TABLE文は `api/migrations/` を正とします(このドキュメントはコピーを維持しません)。

### 金額・日付の精度モデル
- `amount_precision`: `exact` | `estimated` | `unknown`
  - `unknown` の場合も `amount` カラム自体は保持可能(NULL許容)にし、集計からは除外してUI上に
    「金額不明のレコードが N 件あります」と明示する。ゼロ扱いで計算に混ぜない(誤ったグラフを避ける)。
- `date_precision`: `day` | `month` | `year` | `unknown`
  - 保存は常に `income_date`(DATE型、1日埋め等で正規化)+ `date_precision` の組。
  - 例: 「2024年」だけ分かる → `income_date = 2024-01-01`, `date_precision = year`。UIは精度に応じて
    「2024年」「2024年6月頃」「2024/6/15」のように表示を切り替える。

---

## 5. API設計 (v1)

### 方針変更
- パスに `/v1/` を付与(企画書26章にはなかったが、長期運用のため必須)。
- 個別リソースの一覧APIに加え、**画面の文脈に合わせた集約API**を追加(下記)。
  理由: フロントで複数APIをその都度組み合わせると、「振り返り」「タイムライン」のような
  ストーリー性のある画面のロジックがフロントに散らばり、保守性が落ちる。集約はサーバーで行う。

### エンドポイント一覧(抜粋、MVP実装分)
```
POST   /v1/auth/google              Google IDトークンを検証しログイン/新規登録
POST   /v1/auth/refresh             リフレッシュトークンでアクセストークン再発行
POST   /v1/auth/logout              現在のリフレッシュトークンを失効
GET    /v1/auth/accounts            紐付いている認証アカウント一覧
POST   /v1/auth/accounts/link       別Googleアカウントを追加
DELETE /v1/auth/accounts/:id        認証アカウントの解除(最後の1つは不可)

GET    /v1/me                       プロフィール
PATCH  /v1/me                       生年月日等の更新
DELETE /v1/me                       アカウント削除(要エクスポート案内)

GET    /v1/incomes                  一覧(カーソルページング, フィルタ: year, company_id, source_id)
POST   /v1/incomes
GET    /v1/incomes/:uuid
PATCH  /v1/incomes/:uuid
DELETE /v1/incomes/:uuid            論理削除

GET    /v1/companies
POST   /v1/companies
GET    /v1/companies/:uuid          累計/月別/最初と最後の収入などを含む詳細
PATCH  /v1/companies/:uuid
DELETE /v1/companies/:uuid

GET    /v1/sources                  システム標準+自分のカスタム
POST   /v1/sources

GET    /v1/events
POST   /v1/events
PATCH  /v1/events/:uuid
DELETE /v1/events/:uuid

GET    /v1/timeline                 収入+イベントを統合した時系列フィード(カーソルページング)

GET    /v1/stats/summary            ホーム画面向け(生涯合計/今月/今年/前月比/最高月収 等)
GET    /v1/stats/monthly?year=
GET    /v1/stats/yearly
GET    /v1/stats/by-source
GET    /v1/stats/by-company
GET    /v1/stats/by-age             生年月日必須。未設定ならエラーではなく「設定してください」を返す
GET    /v1/stats/compare-years?a=&b=
GET    /v1/stats/simulation         現在ペースの単純延長

GET    /v1/retrospective/:year      「n年を振り返る」画面の集約API

GET    /v1/milestones               達成済み一覧

POST   /v1/exports                  エクスポートジョブ作成(非同期)
GET    /v1/exports                  ジョブ一覧
GET    /v1/exports/:uuid            ステータス確認
GET    /v1/exports/:uuid/download?token=  署名付きダウンロード(短期有効)

POST   /v1/imports/preview          プレビュー(件数・重複・差分を返す、DB変更なし)
POST   /v1/imports                  実行(事前に自動バックアップを作成)
```

### ページング
一覧APIは `?cursor=` 方式(オフセットではなく)。生涯ログは数千件になり得るため、
オフセットページングは大きくずれた際に性能劣化するのを避ける。

### レート制限
書き込み系API(POST/PATCH/DELETE)とログインAPIに対し、`user_id`または`IP`単位でMySQLのカウンタテーブル
(`rate_limit_buckets`)を使ったスライディングウィンドウ制限を実装(Redis等の追加ミドルウェアはLolipopの
共有ホスティングでは前提にできないため)。

---

## 6. データエクスポート形式

企画書のファイル構成を採用しつつ、**フォーマットをアプリのDBスキーマから独立させる**ため
以下を追加します。

- 各JSONファイル自身にも `"schema_version"` を持たせる(manifestだけでなく)。
  → 将来 `incomes.json` だけ形式が変わっても、ファイル単位で移行ロジックを書ける。
- 関連付けは内部の連番IDではなく **UUID** で行う(companies.json の `uuid` を incomes.json が参照する)。
  → 将来DBを移行してAUTO_INCREMENT値が変わっても、エクスポートされたデータの整合性は崩れない。
- `README.txt` には「このZIPは誰でも将来パースできるように」という設計意図と、
  各JSONの最小限のフィールド説明を平文で書く(サービスが終了してもテキストエディタで読める)。
- 金額精度・日付精度もそのままエクスポートし、インポート側で再現する。

```
okanelife-export-YYYY-MM-DD.zip
├── README.txt
├── manifest.json        { format, version, created_at, app_version, counts }
├── profile.json          schema_version 付き
├── incomes.json          schema_version 付き, company/sourceはuuid参照
├── incomes.csv           人間が開く用(Excel等)
├── companies.json
├── income-sources.json
├── milestones.json
├── events.json
└── settings.json
```

秘密情報(トークン・パスワードハッシュ・内部連番ID)は**エクスポート対象から明示的に除外**。

### インポート
1. `POST /v1/imports/preview`: ZIPを一時領域に展開しmanifestのversionを検査、既存データとの
   重複(UUID一致)・新規件数・警告(未知のschema_versionなど)を返す。DBはまだ変更しない。
2. ユーザーが確認後 `POST /v1/imports` を実行 → 実行直前に現在データを自動エクスポート
   (`export_jobs.trigger = 'pre_import_backup'`)→ トランザクション内でUPSERT(UUID一致は上書き、
   ポリシーはユーザー選択: 「重複はスキップ」/「重複は上書き」)。

---

## 7. UI/UX方針(実装ガイド)

企画書のUX方針(記録→蓄積→可視化→分析→振り返り)をナビゲーション構造に落とし込む。

### ナビゲーション(モバイル優先: ボトムタブ)
```
[ホーム] [タイムライン] [(+ 記録)] [分析] [設定]
```
「記録」は中央の目立つボタン(FAB的配置)。どの画面からもワンタップで金額入力に到達できることを最優先。

### ホーム画面の構成(上から)
1. 生涯合計(大きく、カウントアップアニメーション)
2. 今月/今年/前月比/過去最高月収のスタッツ行(小さめ、数字の圧迫感を避けるため4つまで)
3. 「これまでの人生」ミニ累積グラフ(全期間、タップでフル分析画面へ)
4. 最近の出来事(収入+イベント混在、3〜5件、タイムラインへの導線)
5. 「n年を振り返る」への導線カード(データが十分ある場合)/ 新規ユーザーには過去データ追加の案内
6. データが少ない新規ユーザー向けの空状態: 「まずは今月の収入を記録してみましょう」+
   「過去の収入も追加できます」の2択を常に見せる

### トーン
- 金融系の「青×グレー」の堅い配色を避け、暖色寄りのアクセント1色 + ニュートラルな余白の多い配色。
- shadcn/ui のコンポーネントをベースに、カードの角丸・余白を大きめに。
- マイルストーン達成は控えめなトースト+アイコン程度(企画書29章「過剰にゲーム化しない」を厳守)。

---

## 8. MVP範囲(このセッションで実装するスコープ)

企画書のPhase1は「素のCRUD」に見えてしまうため、**Phase1に「振り返り」「タイムライン」「過去整理モード」
「マイルストーン」の最小版を前倒しで含める**。これらが無いと「家計簿と同じ」体験になってしまい、
最重要コンセプトに反するため。

含む:
- Google OAuth(BFFパターン)、複数アカウント紐付け
- 収入CRUD(精度対応)、会社、収入源(標準+独自)
- ホーム画面、タイムライン、年別振り返り画面、基本分析(月別/年別/累計/収入源別/会社別/年齢別/年比較)
- 将来シミュレーション(単純延長)
- 過去整理モード、初回オンボーディング選択
- マイルストーン自動判定(基本セット)
- エクスポート(非同期ジョブ→ZIP)/インポート(プレビュー→実行→自動バックアップ)
- PWA(manifest, icons, service worker, オフライン基本UI)
- セキュリティ基礎(JWT, 入力検証, レート制限, CORS制限, ダウンロードトークン)

含まない(設計はDB/APIレベルで拒まないが実装は次フェーズ):
- 自動バックアップの定期実行(cron)自体 — `export_jobs.trigger` で受け皿は用意
- シェアカード、複数認証プロバイダ(Google以外)
- オフライン時の書き込みキュー・同期(企画書の指示どおり複雑化を避け、オフラインは読み取りキャッシュのみ)

---

## 9. 長期運用への配慮

- **DBマイグレーション**: 番号付きSQLファイル(`api/migrations/0001_xxx.sql`)+ 自前の軽量マイグレーション
  ランナー(`api/bin/migrate.php`)。Composer不要、Lolipopのどのプランでも `php bin/migrate.php` で実行可能。
- **APIバージョニング**: `/v1/` プレフィックス。破壊的変更は `/v2/` を並走させ、フロントを段階移行。
- **エクスポート形式バージョニング**: 上記6章。DBスキーマと1:1にしない。
- **依存ゼロのPHPバックエンド**: JWTも自前実装(HS256, 30行程度)。Composer/ライブラリの
  メンテ停止・脆弱性リスクを最小化し、10年後でも動かせるようにする。
- **フロントの型安全**: TypeScript + zodでAPIレスポンスをランタイム検証し、バックエンドの
  スキーマ変更をビルド時/実行時に検知できるようにする。
