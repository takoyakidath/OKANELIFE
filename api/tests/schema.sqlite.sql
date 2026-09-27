-- SQLite mirror of api/migrations/*.sql, used only by tests/run.php.
-- MySQL is the real target (see docs/DESIGN.md §9) — this file exists
-- because SQLite's DDL dialect can't parse the MySQL migrations directly
-- (ENGINE=, UNSIGNED, AUTO_INCREMENT, etc.). Keep the columns in sync by
-- hand when a migration changes.

CREATE TABLE users (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    uuid TEXT NOT NULL UNIQUE,
    name TEXT NULL,
    email TEXT NULL,
    birth_date TEXT NULL,
    onboarding_completed_at TEXT NULL,
    history_start_choice TEXT NULL,
    deleted_at TEXT NULL,
    created_at TEXT NOT NULL,
    updated_at TEXT NOT NULL
);

CREATE TABLE auth_accounts (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    uuid TEXT NOT NULL UNIQUE,
    user_id INTEGER NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    provider TEXT NOT NULL,
    provider_account_id TEXT NOT NULL,
    email TEXT NULL,
    created_at TEXT NOT NULL,
    UNIQUE (provider, provider_account_id)
);

CREATE TABLE refresh_tokens (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    user_id INTEGER NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    token_hash TEXT NOT NULL UNIQUE,
    expires_at TEXT NOT NULL,
    revoked_at TEXT NULL,
    user_agent TEXT NULL,
    created_at TEXT NOT NULL
);

CREATE TABLE income_sources (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    uuid TEXT NOT NULL,
    user_id INTEGER NULL REFERENCES users(id) ON DELETE CASCADE,
    name TEXT NOT NULL,
    category TEXT NOT NULL,
    is_system INTEGER NOT NULL DEFAULT 0,
    created_at TEXT NOT NULL,
    UNIQUE (uuid, user_id)
);

CREATE TABLE companies (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    uuid TEXT NOT NULL,
    user_id INTEGER NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    name TEXT NOT NULL,
    memo TEXT NULL,
    deleted_at TEXT NULL,
    created_at TEXT NOT NULL,
    updated_at TEXT NOT NULL,
    UNIQUE (uuid, user_id)
);

CREATE TABLE incomes (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    uuid TEXT NOT NULL,
    user_id INTEGER NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    amount INTEGER NULL,
    amount_precision TEXT NOT NULL DEFAULT 'exact',
    currency TEXT NOT NULL DEFAULT 'JPY',
    income_date TEXT NOT NULL,
    date_precision TEXT NOT NULL DEFAULT 'day',
    source_id INTEGER NULL REFERENCES income_sources(id) ON DELETE SET NULL,
    company_id INTEGER NULL REFERENCES companies(id) ON DELETE SET NULL,
    memo TEXT NULL,
    deleted_at TEXT NULL,
    created_at TEXT NOT NULL,
    updated_at TEXT NOT NULL,
    UNIQUE (uuid, user_id)
);

CREATE TABLE events (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    uuid TEXT NOT NULL,
    user_id INTEGER NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    income_id INTEGER NULL REFERENCES incomes(id) ON DELETE SET NULL,
    company_id INTEGER NULL REFERENCES companies(id) ON DELETE SET NULL,
    title TEXT NOT NULL,
    description TEXT NULL,
    event_date TEXT NOT NULL,
    deleted_at TEXT NULL,
    created_at TEXT NOT NULL,
    UNIQUE (uuid, user_id)
);

CREATE TABLE milestones (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    uuid TEXT NOT NULL UNIQUE,
    user_id INTEGER NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    type TEXT NOT NULL,
    value INTEGER NULL,
    achieved_at TEXT NOT NULL,
    seen INTEGER NOT NULL DEFAULT 0,
    UNIQUE (user_id, type, value)
);

CREATE TABLE export_jobs (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    uuid TEXT NOT NULL UNIQUE,
    user_id INTEGER NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    status TEXT NOT NULL DEFAULT 'pending',
    trigger_reason TEXT NOT NULL DEFAULT 'manual',
    format_version INTEGER NOT NULL DEFAULT 1,
    file_path TEXT NULL,
    download_token TEXT NULL,
    error_message TEXT NULL,
    expires_at TEXT NULL,
    created_at TEXT NOT NULL,
    completed_at TEXT NULL
);

CREATE TABLE rate_limit_buckets (
    bucket_key TEXT PRIMARY KEY,
    window_start INTEGER NOT NULL,
    count INTEGER NOT NULL DEFAULT 0
);

INSERT INTO income_sources (uuid, user_id, name, category, is_system, created_at) VALUES
    ('00000000-0000-4000-8000-000000000001', NULL, '給与', 'salary', 1, '2025-01-01 00:00:00'),
    ('00000000-0000-4000-8000-000000000002', NULL, 'アルバイト', 'part_time', 1, '2025-01-01 00:00:00'),
    ('00000000-0000-4000-8000-000000000003', NULL, '副業', 'side_business', 1, '2025-01-01 00:00:00'),
    ('00000000-0000-4000-8000-000000000004', NULL, 'フリーランス', 'freelance', 1, '2025-01-01 00:00:00'),
    ('00000000-0000-4000-8000-000000000005', NULL, '売却', 'sale', 1, '2025-01-01 00:00:00'),
    ('00000000-0000-4000-8000-000000000006', NULL, 'お小遣い', 'allowance', 1, '2025-01-01 00:00:00'),
    ('00000000-0000-4000-8000-000000000007', NULL, '投資', 'investment', 1, '2025-01-01 00:00:00'),
    ('00000000-0000-4000-8000-000000000008', NULL, 'その他', 'other', 1, '2025-01-01 00:00:00');
