<?php

namespace Okanelife\Domain;

use Okanelife\Support\Database;
use Okanelife\Support\Uuid;

final class UserRepository
{
    public function create(?string $name, ?string $email): array
    {
        $pdo = Database::pdo();
        $uuid = Uuid::v4();
        $now = Database::now();
        $stmt = $pdo->prepare(
            'INSERT INTO users (uuid, name, email, created_at, updated_at) VALUES (?, ?, ?, ?, ?)'
        );
        $stmt->execute([$uuid, $name, $email, $now, $now]);
        return $this->findById((int) $pdo->lastInsertId());
    }

    public function findById(int $id): ?array
    {
        $stmt = Database::pdo()->prepare('SELECT * FROM users WHERE id = ? AND deleted_at IS NULL');
        $stmt->execute([$id]);
        $row = $stmt->fetch();
        return $row === false ? null : $row;
    }

    public function findByUuid(string $uuid): ?array
    {
        $stmt = Database::pdo()->prepare('SELECT * FROM users WHERE uuid = ? AND deleted_at IS NULL');
        $stmt->execute([$uuid]);
        $row = $stmt->fetch();
        return $row === false ? null : $row;
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
        $stmt = Database::pdo()->prepare("UPDATE users SET {$sets} WHERE id = ?");
        $stmt->execute($values);
    }

    public function softDelete(int $id): void
    {
        $stmt = Database::pdo()->prepare('UPDATE users SET deleted_at = ? WHERE id = ?');
        $stmt->execute([Database::now(), $id]);
    }
}
