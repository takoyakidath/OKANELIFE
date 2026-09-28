# OKANELIFE — API (PHP, for Lolipop)

Dependency-free PHP backend (no Composer packages) — see
[`../docs/DESIGN.md`](../docs/DESIGN.md) §9 for why. The web root is
`public/`; everything else lives outside it.

## Local development (no MySQL required)

The test suite and local dev both work against SQLite so you don't need a
MySQL server to hack on this:

```bash
cp .env.example .env
# then edit .env:
#   DB_DRIVER=sqlite
#   DB_PATH=/tmp/okanelife_dev.sqlite
#   JWT_SECRET=<any long random string>
#   GOOGLE_CLIENT_ID=<matches the Next.js app's GOOGLE_CLIENT_ID>

php -r '
$pdo = new PDO("sqlite:/tmp/okanelife_dev.sqlite");
$pdo->exec("PRAGMA foreign_keys = ON");
foreach (array_filter(array_map("trim", explode(";\n", file_get_contents("tests/schema.sqlite.sql")))) as $s) {
    if (trim($s) !== "") $pdo->exec($s);
}
'

php -S 127.0.0.1:8000 -t public
```

(In production, migrations run against real MySQL via `bin/migrate.php` —
see below. The SQLite path above is a dev/test convenience only; the two
schemas are hand-kept in sync, see `tests/schema.sqlite.sql`'s header.)

## Tests

```bash
php tests/run.php
```

Dependency-free (no PHPUnit) — each `tests/*Test.php` file returns a map of
`name => callable`, run against a fresh in-memory SQLite database per test.

## Deploying to Lolipop

1. Create a MySQL database in the Lolipop control panel.
2. Upload this `api/` directory. Point the domain/subdomain's document root
   at `api/public`.
3. Copy `.env.example` to `.env` (same directory as `bootstrap.php`, i.e.
   one level above `public/`) and fill in the MySQL credentials, a random
   `JWT_SECRET`, and `GOOGLE_CLIENT_ID`.

   Generate `JWT_SECRET` from a CSPRNG (96 hex chars) and write it straight
   into the repo-root `.env` without echoing it:
   ```bash
   sed -i '' "s/^JWT_SECRET.*/JWT_SECRET=$(openssl rand -hex 48)/" .env
   ```
   (`sed -i` without `''` on Linux.) Rotating it invalidates every issued
   access token.

   With FTP only, `./deploy.sh api-env` (repo root) builds this file from the
   repo-root `.env` (`mysql_*`, `JWT_SECRET`, `GOOGLE_CLIENT_ID`) and uploads
   it over FTPS; `./deploy.sh sql` bundles the migrations for a one-time
   phpMyAdmin import in place of step 4.
4. Run migrations once, over SSH if your plan has it, or via a one-off PHP
   CLI script:
   ```bash
   php bin/migrate.php
   ```
5. Set up a cron job (Lolipop's control panel has a cron feature) to run
   every 1–5 minutes:
   ```bash
   php /path/to/api/bin/worker.php
   ```
   This processes pending data-export jobs (see `docs/DESIGN.md` §9 for why
   this is cron-based rather than a background worker process — Lolipop
   shared hosting has no persistent process).
6. Confirm `public/.htaccess` is present (routes everything through
   `index.php`) and that Apache's `mod_rewrite`/`mod_headers` are enabled
   (they are, by default, on Lolipop's standard PHP plans).

## Structure

- `public/index.php` — single entry point
- `src/Support/` — Router, Request/Response, JWT (self-rolled HS256),
  Google ID token verification (self-rolled, no SDK), rate limiter,
  validator
- `src/Domain/` — repositories + services (auth, stats, milestones,
  retrospective, timeline, export, import)
- `src/Http/` — Kernel (route table + error handling), controllers, auth
  middleware
- `migrations/*.sql` — MySQL schema, applied in order by `bin/migrate.php`
- `bin/worker.php` — cron entry point for export jobs
- `tests/` — the test runner and test files (SQLite-only, never touches
  the MySQL migrations directly)
