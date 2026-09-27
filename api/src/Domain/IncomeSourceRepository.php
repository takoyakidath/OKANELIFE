<?php

namespace Okanelife\Domain;

use Okanelife\Support\Database;
use Okanelife\Support\Uuid;

final class IncomeSourceRepository
{
    private const CATEGORIES = [
        'salary', 'part_time', 'side_business', 'freelance',
        'sale', 'allowance', 'investment', 'other',
    ];

    public static function categories(): array
    {
        return self::CATEGORIES;
    }

    public function listForUser(int $userId): array
    {
        $stmt = Database::pdo()->prepare(
            'SELECT * FROM income_sources WHERE user_id IS NULL OR user_id = ? ORDER BY is_system DESC, id ASC'
        );
        $stmt->execute([$userId]);
        return $stmt->fetchAll();
    }

    public function findByUuidForUser(string $uuid, int $userId): ?array
    {
        $stmt = Database::pdo()->prepare(
            'SELECT * FROM income_sources WHERE uuid = ? AND (user_id IS NULL OR user_id = ?)'
        );
        $stmt->execute([$uuid, $userId]);
        $row = $stmt->fetch();
        return $row === false ? null : $row;
    }

    public function findById(int $id): ?array
    {
        $stmt = Database::pdo()->prepare('SELECT * FROM income_sources WHERE id = ?');
        $stmt->execute([$id]);
        $row = $stmt->fetch();
        return $row === false ? null : $row;
    }

    public function defaultSystemSourceId(): ?int
    {
        $stmt = Database::pdo()->prepare(
            "SELECT id FROM income_sources WHERE is_system = 1 AND category = 'other' LIMIT 1"
        );
        $stmt->execute();
        $id = $stmt->fetchColumn();
        return $id === false ? null : (int) $id;
    }

    public function create(int $userId, string $name, string $category): array
    {
        $pdo = Database::pdo();
        $uuid = Uuid::v4();
        $stmt = $pdo->prepare(
            'INSERT INTO income_sources (uuid, user_id, name, category, is_system, created_at)
             VALUES (?, ?, ?, ?, 0, ?)'
        );
        $stmt->execute([$uuid, $userId, $name, $category, Database::now()]);
        return $this->findById((int) $pdo->lastInsertId());
    }
}
