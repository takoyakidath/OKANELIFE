#!/usr/bin/env bash
# OKANELIFE デプロイスクリプト
#
#   ./deploy.sh web          web/ を Vercel に preview デプロイ
#   ./deploy.sh web --prod   web/ を Vercel に本番デプロイ
#   ./deploy.sh api          api/ を Lolipop にアップロード(FTP_HOST があれば FTPS、なければ SSH)
#   ./deploy.sh all [--prod] api → web の順に両方
#   ./deploy.sh sql [file]   全マイグレーションを1つの SQL に結合(phpMyAdmin からインポートする用)
#   ./deploy.sh api-env      サーバー用 api/.env を .env の値から作って FTPS でアップロード
#
# api のデプロイ先はリポジトリ直下の .env で設定する(git 管理外):
#   FTP_HOST=ftp.lolipop.jp                          # FTPS で送る場合
#   FTP_USER=...
#   FTP_PASS=...
#   FTP_API_DIR=/okanelife-api                       # FTP ルートからの配置先(未設定なら LOLIPOP_API_DIR)
#
#   mysql_host=... mysql_user=... mysql_pass=... mysql_db=...   # api-env 用
#   JWT_SECRET=...   GOOGLE_CLIENT_ID=...                      # api-env 用
#   MIGRATE_TOKEN=...                                          # api-env 用。FTP デプロイ後、
#                                                               # https://.../migrate.php?token=... を開いてマイグレーション実行
#
#   LOLIPOP_SSH_HOST=ssh.lolipop.jp                  # SSH で送る場合(マイグレーションも実行)
#   LOLIPOP_SSH_PORT=2222
#   LOLIPOP_SSH_USER=...
#   LOLIPOP_API_DIR=/home/users/.../okanelife-api
#   LOLIPOP_PHP=php                                  # 任意。サーバー側の PHP CLI
#   LOLIPOP_SSH_KEY=~/.ssh/okanelife_lolipop         # 任意。鍵認証に使う秘密鍵
set -euo pipefail

ROOT="$(cd "$(dirname "$0")" && pwd)"

usage() {
  sed -n '2,27p' "$0" | sed 's/^# \{0,1\}//'
  exit 1
}

load_env() {
  [[ -f "$ROOT/.env" ]] || { echo ".env がありません" >&2; exit 1; }
  set -a; source "$ROOT/.env"; set +a
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
  load_env
  echo "==> api: テスト実行"
  (cd "$ROOT/api" && php tests/run.php)
  if [[ -n "${FTP_HOST:-}" ]]; then
    deploy_api_ftp
  else
    deploy_api_ssh
  fi
}

ftp_api_dir() {
  local dir="${FTP_API_DIR:-${LOLIPOP_API_DIR:-}}"
  [[ -n "$dir" ]] || { echo ".env に FTP_API_DIR がありません" >&2; exit 1; }
  [[ "$dir" == /* ]] || dir="/$dir"
  echo "$dir"
}

deploy_api_ftp() {
  FTP_API_DIR="$(ftp_api_dir)"
  : "${FTP_USER:?.env に FTP_USER がありません}"
  : "${FTP_PASS:?.env に FTP_PASS がありません}"
  command -v lftp >/dev/null || { echo "lftp がありません: brew install lftp" >&2; exit 1; }

  echo "==> api: ftps://$FTP_HOST$FTP_API_DIR へ同期"
  # パスワードはコマンドライン引数に出さず、LFTP_PASSWORD 経由で渡す。
  # サーバー側の .env とユーザーデータ(storage/)は上書き・削除しない。
  LFTP_PASSWORD="$FTP_PASS" lftp --env-password -u "$FTP_USER" "$FTP_HOST" <<LFTP
set ftp:ssl-force true
set ftp:ssl-protect-data true
set net:max-retries 2
mkdir -pf "$FTP_API_DIR"
mirror --reverse --delete --verbose --only-newer --exclude-glob .env --exclude-glob .DS_Store --exclude ^tests/ --exclude ^storage/exports/ --exclude ^storage/imports/ "$ROOT/api/" "$FTP_API_DIR/"
mkdir -pf "$FTP_API_DIR/storage/exports" "$FTP_API_DIR/storage/imports"
bye
LFTP

  echo
  echo "FTP ではマイグレーションを実行できません。新しいマイグレーションがあれば"
  echo "  https://<domain>/migrate.php?token=\$MIGRATE_TOKEN を開いて適用してください"
  echo "  (api-env で MIGRATE_TOKEN 未設定の場合は先に ./deploy.sh api-env を実行)。"
  echo "  初回導入など phpMyAdmin から直接流したい場合は ./deploy.sh sql も使えます。"
}

deploy_api_ssh() {
  : "${LOLIPOP_SSH_HOST:?.env に LOLIPOP_SSH_HOST がありません}"
  : "${LOLIPOP_SSH_USER:?.env に LOLIPOP_SSH_USER がありません}"
  : "${LOLIPOP_API_DIR:?.env に LOLIPOP_API_DIR がありません}"
  local port="${LOLIPOP_SSH_PORT:-2222}"
  local php="${LOLIPOP_PHP:-php}"
  local target="$LOLIPOP_SSH_USER@$LOLIPOP_SSH_HOST"
  local key="${LOLIPOP_SSH_KEY:-$HOME/.ssh/okanelife_lolipop}"
  key="${key/#\~/$HOME}"
  local ssh_cmd="ssh -p $port -o BatchMode=yes"
  [[ -f "$key" ]] && ssh_cmd+=" -i $key -o IdentitiesOnly=yes"

  echo "==> api: $target:$LOLIPOP_API_DIR へ同期"
  # サーバー側の .env とユーザーデータ(storage/)は上書き・削除しない
  rsync -az --delete \
    -e "$ssh_cmd" \
    --exclude '.env' \
    --exclude 'storage/exports/*' \
    --exclude 'storage/imports/*' \
    --exclude 'tests/' \
    "$ROOT/api/" "$target:$LOLIPOP_API_DIR/"

  echo "==> api: マイグレーション"
  $ssh_cmd "$target" "cd '$LOLIPOP_API_DIR' && $php bin/migrate.php"
}

# ルートの .env からサーバー用 api/.env を組み立て、FTPS で配置する。
# 値は画面に出さず、一時ファイルも終了時に消す。
deploy_api_env() {
  load_env
  FTP_API_DIR="$(ftp_api_dir)"
  local k
  for k in mysql_host mysql_user mysql_pass mysql_db JWT_SECRET GOOGLE_CLIENT_ID MIGRATE_TOKEN FTP_HOST FTP_USER FTP_PASS; do
    [[ -n "${!k:-}" ]] || { echo ".env に $k がありません" >&2; exit 1; }
  done
  [[ ${#JWT_SECRET} -ge 64 ]] || { echo "JWT_SECRET は 64 文字以上にしてください" >&2; exit 1; }
  [[ ${#MIGRATE_TOKEN} -ge 32 ]] || { echo "MIGRATE_TOKEN は 32 文字以上にしてください" >&2; exit 1; }

  local tmp; tmp="$(mktemp)"
  trap 'rm -f "$tmp"' EXIT
  chmod 600 "$tmp"
  cat > "$tmp" <<ENV
DB_DRIVER=mysql
DB_HOST=$mysql_host
DB_PORT=${mysql_port:-3306}
DB_NAME=$mysql_db
DB_USER=$mysql_user
DB_PASS=$mysql_pass
JWT_SECRET=$JWT_SECRET
GOOGLE_CLIENT_ID=$GOOGLE_CLIENT_ID
MIGRATE_TOKEN=$MIGRATE_TOKEN
API_BASE_PATH=${API_BASE_PATH:-}
ENV

  echo "==> api: ftps://$FTP_HOST$FTP_API_DIR/.env を配置"
  LFTP_PASSWORD="$FTP_PASS" lftp --env-password -u "$FTP_USER" "$FTP_HOST" <<LFTP
set ftp:ssl-force true
set ftp:ssl-protect-data true
put "$tmp" -o "$FTP_API_DIR/.env"
chmod 600 "$FTP_API_DIR/.env"
bye
LFTP
}

# bin/migrate.php と同じ順で全マイグレーションを結合し、schema_migrations にも
# 記録する SQL を出力する。SSH が使えない環境で phpMyAdmin から初回に流す用。
build_sql() {
  local out="${1:-$ROOT/okanelife-migrations.sql}"
  {
    echo "CREATE TABLE IF NOT EXISTS schema_migrations ("
    echo "    filename VARCHAR(255) NOT NULL PRIMARY KEY,"
    echo "    applied_at DATETIME NOT NULL"
    echo ");"
    local f name
    for f in "$ROOT"/api/migrations/*.sql; do
      name="$(basename "$f")"
      echo
      echo "-- $name"
      cat "$f"
      echo
      echo "INSERT INTO schema_migrations (filename, applied_at) VALUES ('$name', NOW());"
    done
  } > "$out"
  echo "==> $out を作成しました(phpMyAdmin の「インポート」で実行)"
}

case "${1:-}" in
  web) deploy_web "${2:-}" ;;
  api) deploy_api ;;
  sql) build_sql "${2:-}" ;;
  api-env) deploy_api_env ;;
  all) deploy_api; deploy_web "${2:-}" ;;
  *) usage ;;
esac
