#!/usr/bin/env bash
# OKANELIFE デプロイスクリプト
#
#   ./deploy.sh web          web/ を Vercel に preview デプロイ
#   ./deploy.sh web --prod   web/ を Vercel に本番デプロイ
#   ./deploy.sh api          api/ を Lolipop に rsync してマイグレーション実行
#   ./deploy.sh all [--prod] api → web の順に両方
#
# api のデプロイ先はリポジトリ直下の .env で設定する(git 管理外):
#   LOLIPOP_SSH_HOST=ssh.lolipop.jp
#   LOLIPOP_SSH_PORT=2222
#   LOLIPOP_SSH_USER=...
#   LOLIPOP_API_DIR=/home/users/.../okanelife-api   # api/ をこのディレクトリに同期
#   LOLIPOP_PHP=php                                  # 任意。サーバー側の PHP CLI
set -euo pipefail

ROOT="$(cd "$(dirname "$0")" && pwd)"

usage() {
  sed -n '2,14p' "$0" | sed 's/^# \{0,1\}//'
  exit 1
}

deploy_web() {
  local prod="${1:-}"
  command -v vercel >/dev/null || { echo "vercel CLI がありません: npm i -g vercel" >&2; exit 1; }
  cd "$ROOT/web"
  if [[ "$prod" == "--prod" ]]; then
    echo "==> web: Vercel 本番デプロイ"
    vercel deploy --prod
  else
    echo "==> web: Vercel preview デプロイ"
    vercel deploy
  fi
}

deploy_api() {
  [[ -f "$ROOT/.env" ]] || { echo ".env がありません(LOLIPOP_* を設定してください)" >&2; exit 1; }
  set -a; source "$ROOT/.env"; set +a
  : "${LOLIPOP_SSH_HOST:?.env に LOLIPOP_SSH_HOST がありません}"
  : "${LOLIPOP_SSH_USER:?.env に LOLIPOP_SSH_USER がありません}"
  : "${LOLIPOP_API_DIR:?.env に LOLIPOP_API_DIR がありません}"
  local port="${LOLIPOP_SSH_PORT:-2222}"
  local php="${LOLIPOP_PHP:-php}"
  local target="$LOLIPOP_SSH_USER@$LOLIPOP_SSH_HOST"

  echo "==> api: テスト実行"
  (cd "$ROOT/api" && php tests/run.php)

  echo "==> api: $target:$LOLIPOP_API_DIR へ同期"
  # サーバー側の .env とユーザーデータ(storage/)は上書き・削除しない
  rsync -az --delete \
    -e "ssh -p $port" \
    --exclude '.env' \
    --exclude 'storage/exports/*' \
    --exclude 'storage/imports/*' \
    --exclude 'tests/' \
    "$ROOT/api/" "$target:$LOLIPOP_API_DIR/"

  echo "==> api: マイグレーション"
  ssh -p "$port" "$target" "cd '$LOLIPOP_API_DIR' && $php bin/migrate.php"
}

case "${1:-}" in
  web) deploy_web "${2:-}" ;;
  api) deploy_api ;;
  all) deploy_api; deploy_web "${2:-}" ;;
  *) usage ;;
esac
