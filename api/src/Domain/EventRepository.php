<?php

namespace Okanelife\Domain;

use Okanelife\Support\Database;
use Okanelife\Support\Uuid;

final class EventRepository
{
    public function create(int $userId, array $fields): array
    {
        $pdo = Database::pdo();
        $uuid = Uuid::v4();
        $stmt = $pdo->prepare(
            'INSERT INTO events (uuid, user_id, income_id, company_id, title, description, event_date, created_at)
             VALUES (?, ?, ?, ?, ?, ?, ?, ?)'
        );
        $stmt->execute([
            $uuid,
            $userId,
            $fields['income_id'] ?? null,
            $fields['company_id'] ?? null,
            $fields['title'],
            $fields['description'] ?? null,
            $fields['event_date'],
            Database::now(),
        ]);
        return $this->findById((int) $pdo->lastInsertId());
    }

    public function findById(int $id): ?array
    {
        $stmt = Database::pdo()->prepare('SELECT * FROM events WHERE id = ?');
        $stmt->execute([$id]);
        $row = $stmt->fetch();
        return $row === false ? null : $row;
    }

    public function findByUuidForUser(string $uuid, int $userId): ?array
    {
        $stmt = Database::pdo()->prepare(
            'SELECT * FROM events WHERE uuid = ? AND user_id = ? AND deleted_at IS NULL'
        );
        $stmt->execute([$uuid, $userId]);
        $row = $stmt->fetch();
        return $row === false ? null : $row;
    }

    public function listForUser(int $userId, ?int $yearFilter = null): array
    {
        $sql = 'SELECT * FROM events WHERE user_id = ? AND deleted_at IS NULL';
        $params = [$userId];
        if ($yearFilter !== null) {
            $sql .= ' AND event_date >= ? AND event_date < ?';
            $params[] = sprintf('%04d-01-01', $yearFilter);
            $params[] = sprintf('%04d-01-01', $yearFilter + 1);
        }
        $sql .= ' ORDER BY event_date DESC, id DESC';
        $stmt = Database::pdo()->prepare($sql);
        $stmt->execute($params);
        return $stmt->fetchAll();
    }

    public function update(int $id, array $fields): void
    {
        if ($fields === []) {
            return;
        }
        $sets = implode(', ', array_map(fn ($k) => "{$k} = ?", array_keys($fields)));
        $values = array_values($fields);
        $values[] = $id;
        $stmt = Database::pdo()->prepare("UPDATE events SET {$sets} WHERE id = ?");
        $stmt->execute($values);
    }

    public function softDelete(int $id): void
    {
        $stmt = Database::pdo()->prepare('UPDATE events SET deleted_at = ? WHERE id = ?');
        $stmt->execute([Database::now(), $id]);
    }
}
