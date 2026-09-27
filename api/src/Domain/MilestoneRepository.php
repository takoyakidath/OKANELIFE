<?php

namespace Okanelife\Domain;

use Okanelife\Support\Database;
use Okanelife\Support\Uuid;

final class MilestoneRepository
{
    public function exists(int $userId, string $type, ?int $value): bool
    {
        $stmt = Database::pdo()->prepare(
            'SELECT 1 FROM milestones WHERE user_id = ? AND type = ? AND value ' .
            ($value === null ? 'IS NULL' : '= ?')
        );
        $params = [$userId, $type];
        if ($value !== null) {
            $params[] = $value;
        }
        $stmt->execute($params);
        return $stmt->fetchColumn() !== false;
    }

    public function record(int $userId, string $type, ?int $value): void
    {
        if ($this->exists($userId, $type, $value)) {
            return;
        }
        $stmt = Database::pdo()->prepare(
            'INSERT INTO milestones (uuid, user_id, type, value, achieved_at, seen) VALUES (?, ?, ?, ?, ?, 0)'
        );
        $stmt->execute([Uuid::v4(), $userId, $type, $value, Database::now()]);
    }

    public function listForUser(int $userId): array
    {
        $stmt = Database::pdo()->prepare(
            'SELECT * FROM milestones WHERE user_id = ? ORDER BY achieved_at DESC'
        );
        $stmt->execute([$userId]);
        return $stmt->fetchAll();
    }
}
