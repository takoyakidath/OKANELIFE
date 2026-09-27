<?php

namespace Okanelife\Domain;

use Okanelife\Support\Database;
use Okanelife\Support\Uuid;

final class CompanyRepository
{
    public function findOrCreateByName(int $userId, string $name): array
    {
        $stmt = Database::pdo()->prepare(
            'SELECT * FROM companies WHERE user_id = ? AND name = ? AND deleted_at IS NULL LIMIT 1'
        );
        $stmt->execute([$userId, $name]);
        $existing = $stmt->fetch();
        if ($existing !== false) {
            return $existing;
        }

        $pdo = Database::pdo();
        $uuid = Uuid::v4();
        $now = Database::now();
        $insert = $pdo->prepare(
            'INSERT INTO companies (uuid, user_id, name, created_at, updated_at) VALUES (?, ?, ?, ?, ?)'
        );
        $insert->execute([$uuid, $userId, $name, $now, $now]);
        return $this->findById((int) $pdo->lastInsertId());
    }

    public function findById(int $id): ?array
    {
        $stmt = Database::pdo()->prepare('SELECT * FROM companies WHERE id = ?');
        $stmt->execute([$id]);
        $row = $stmt->fetch();
        return $row === false ? null : $row;
    }

    public function findByUuidForUser(string $uuid, int $userId): ?array
    {
        $stmt = Database::pdo()->prepare(
            'SELECT * FROM companies WHERE uuid = ? AND user_id = ? AND deleted_at IS NULL'
        );
        $stmt->execute([$uuid, $userId]);
        $row = $stmt->fetch();
        return $row === false ? null : $row;
    }

    public function listForUser(int $userId, bool $recentOnly = false): array
    {
        $sql = 'SELECT c.*,
                    (SELECT COALESCE(SUM(i.amount), 0) FROM incomes i
                        WHERE i.company_id = c.id AND i.deleted_at IS NULL) AS total_amount,
                    (SELECT MIN(i.income_date) FROM incomes i
                        WHERE i.company_id = c.id AND i.deleted_at IS NULL) AS first_income_date,
                    (SELECT MAX(i.income_date) FROM incomes i
                        WHERE i.company_id = c.id AND i.deleted_at IS NULL) AS last_income_date
                FROM companies c
                WHERE c.user_id = ? AND c.deleted_at IS NULL
                ORDER BY c.updated_at DESC';
        if ($recentOnly) {
            $sql .= Database::driver() === 'sqlite' ? ' LIMIT 8' : ' LIMIT 8';
        }
        $stmt = Database::pdo()->prepare($sql);
        $stmt->execute([$userId]);
        return $stmt->fetchAll();
    }

    public function withStats(array $company): array
    {
        $stmt = Database::pdo()->prepare(
            'SELECT COALESCE(SUM(amount), 0) AS total_amount,
                    MIN(income_date) AS first_income_date,
                    MAX(income_date) AS last_income_date
             FROM incomes WHERE company_id = ? AND deleted_at IS NULL'
        );
        $stmt->execute([$company['id']]);
        $stats = $stmt->fetch();
        return array_merge($company, $stats);
    }

    public function update(int $id, array $fields): void
    {
        if ($fields === []) {
            return;
        }
        $fields['updated_at'] = Database::now();
        $sets = implode(', ', array_map(fn ($k) => "{$k} = ?", array_keys($fields)));
        $values = array_values($fields);
        $values[] = $id;
        $stmt = Database::pdo()->prepare("UPDATE companies SET {$sets} WHERE id = ?");
        $stmt->execute($values);
    }

    public function softDelete(int $id): void
    {
        $stmt = Database::pdo()->prepare('UPDATE companies SET deleted_at = ? WHERE id = ?');
        $stmt->execute([Database::now(), $id]);
    }
}
