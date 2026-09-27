CREATE TABLE incomes (
    id BIGINT UNSIGNED AUTO_INCREMENT PRIMARY KEY,
    uuid CHAR(36) NOT NULL,
    user_id BIGINT UNSIGNED NOT NULL,
    amount BIGINT NULL,
    amount_precision VARCHAR(16) NOT NULL DEFAULT 'exact',
    currency CHAR(3) NOT NULL DEFAULT 'JPY',
    income_date DATE NOT NULL,
    date_precision VARCHAR(16) NOT NULL DEFAULT 'day',
    source_id BIGINT UNSIGNED NULL,
    company_id BIGINT UNSIGNED NULL,
    memo VARCHAR(1000) NULL,
    deleted_at DATETIME NULL,
    created_at DATETIME NOT NULL,
    updated_at DATETIME NOT NULL,
    CONSTRAINT fk_incomes_user FOREIGN KEY (user_id) REFERENCES users (id) ON DELETE CASCADE,
    CONSTRAINT fk_incomes_source FOREIGN KEY (source_id) REFERENCES income_sources (id) ON DELETE SET NULL,
    CONSTRAINT fk_incomes_company FOREIGN KEY (company_id) REFERENCES companies (id) ON DELETE SET NULL,
    UNIQUE KEY uniq_incomes_uuid_user (uuid, user_id)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;

CREATE INDEX idx_incomes_user_date ON incomes (user_id, income_date);
CREATE INDEX idx_incomes_user_company ON incomes (user_id, company_id);
CREATE INDEX idx_incomes_user_source ON incomes (user_id, source_id);
