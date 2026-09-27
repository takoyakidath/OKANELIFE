CREATE TABLE milestones (
    id BIGINT UNSIGNED AUTO_INCREMENT PRIMARY KEY,
    uuid CHAR(36) NOT NULL UNIQUE,
    user_id BIGINT UNSIGNED NOT NULL,
    type VARCHAR(32) NOT NULL,
    value BIGINT NULL,
    achieved_at DATETIME NOT NULL,
    seen TINYINT(1) NOT NULL DEFAULT 0,
    CONSTRAINT fk_milestones_user FOREIGN KEY (user_id) REFERENCES users (id) ON DELETE CASCADE,
    UNIQUE KEY uniq_milestone (user_id, type, value)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;
