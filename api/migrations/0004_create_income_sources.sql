CREATE TABLE income_sources (
    id BIGINT UNSIGNED AUTO_INCREMENT PRIMARY KEY,
    uuid CHAR(36) NOT NULL,
    user_id BIGINT UNSIGNED NULL,
    name VARCHAR(100) NOT NULL,
    category VARCHAR(32) NOT NULL,
    is_system TINYINT(1) NOT NULL DEFAULT 0,
    created_at DATETIME NOT NULL,
    CONSTRAINT fk_income_sources_user FOREIGN KEY (user_id) REFERENCES users (id) ON DELETE CASCADE,
    UNIQUE KEY uniq_income_sources_uuid_user (uuid, user_id)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;
