CREATE TABLE export_jobs (
    id BIGINT UNSIGNED AUTO_INCREMENT PRIMARY KEY,
    uuid CHAR(36) NOT NULL UNIQUE,
    user_id BIGINT UNSIGNED NOT NULL,
    status VARCHAR(16) NOT NULL DEFAULT 'pending',
    trigger_reason VARCHAR(32) NOT NULL DEFAULT 'manual',
    format_version INT NOT NULL DEFAULT 1,
    file_path VARCHAR(500) NULL,
    download_token CHAR(64) NULL,
    error_message VARCHAR(1000) NULL,
    expires_at DATETIME NULL,
    created_at DATETIME NOT NULL,
    completed_at DATETIME NULL,
    CONSTRAINT fk_export_jobs_user FOREIGN KEY (user_id) REFERENCES users (id) ON DELETE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;

CREATE INDEX idx_export_jobs_status ON export_jobs (status);
