CREATE TABLE events (
    id BIGINT UNSIGNED AUTO_INCREMENT PRIMARY KEY,
    uuid CHAR(36) NOT NULL,
    user_id BIGINT UNSIGNED NOT NULL,
    income_id BIGINT UNSIGNED NULL,
    company_id BIGINT UNSIGNED NULL,
    title VARCHAR(255) NOT NULL,
    description VARCHAR(2000) NULL,
    event_date DATE NOT NULL,
    deleted_at DATETIME NULL,
    created_at DATETIME NOT NULL,
    CONSTRAINT fk_events_user FOREIGN KEY (user_id) REFERENCES users (id) ON DELETE CASCADE,
    CONSTRAINT fk_events_income FOREIGN KEY (income_id) REFERENCES incomes (id) ON DELETE SET NULL,
    CONSTRAINT fk_events_company FOREIGN KEY (company_id) REFERENCES companies (id) ON DELETE SET NULL,
    UNIQUE KEY uniq_events_uuid_user (uuid, user_id)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;

CREATE INDEX idx_events_user_date ON events (user_id, event_date);
