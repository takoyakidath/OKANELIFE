# OKANELIFE

「あなたは、これまでの人生でいくら稼いだ？」

収入を記録し、積み重ね、あとから振り返るためのお金のライフログ。企画の全文は
[`product.txt`](./product.txt)、実装にあたってのレビューと設計判断は
[`docs/DESIGN.md`](./docs/DESIGN.md) を参照してください。

## 構成

```
web/    Next.js (App Router) — フロントエンド + BFF層。Vercelにデプロイ。
api/    PHP (依存ゼロ) — バックエンドAPI。Lolipop + MySQLにデプロイ。
docs/   設計レビュー・アーキテクチャ文書。
```

ブラウザは常に `web/` としか通信しません。Google OAuth・PHPバックエンドとの
通信はすべて `web/` のサーバー側(Route Handlers)が仲介します — 詳細は
`docs/DESIGN.md` §2。

## はじめ方

```bash
# バックエンド(SQLiteでMySQL不要のローカル起動 — 詳細は api/README.md)
cd api && php -S 127.0.0.1:8000 -t public

# フロントエンド
cd web && cp .env.local.example .env.local && npm install && npm run dev
```

それぞれの `README.md`(`web/README.md`, `api/README.md`)に詳しい手順があります。

## 実装範囲

`docs/DESIGN.md` §8 に MVP スコープと、意図的に次フェーズへ回した項目
(自動バックアップの定期実行、Google以外の認証プロバイダ 等)を記載しています。
