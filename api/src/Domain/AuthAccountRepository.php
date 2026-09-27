<?php

namespace Okanelife\Domain;

use Okanelife\Support\Database;
use Okanelife\Support\Uuid;

final class AuthAccountRepository
{
    public function findByProviderAccountId(string $provider, string $providerAccountId): ?array
    {
        $stmt = Database::pdo()->prepare(
            'SELECT * FROM auth_accounts WHERE provider = ? AND provider_account_id = ?'
        );
        $stmt->execute([$provider, $providerAccountId]);
        $row = $stmt->fetch();
        return $row === false ? null : $row;
    }

    public function create(int $userId, string $provider, string $providerAccountId, ?string $email): array
    {
        $pdo = Database::pdo();
        $uuid = Uuid::v4();
        $stmt = $pdo->prepare(
            'INSERT INTO auth_accounts (uuid, user_id, provider, provider_account_id, email, created_at)
             VALUES (?, ?, ?, ?, ?, ?)'
        );
        $stmt->execute([$uuid, $userId, $provider, $providerAccountId, $email, Database::now()]);
        return ['id' => (int) $pdo->lastInsertId(), 'uuid' => $uuid];
    }

    public function listForUser(int $userId): array
    {
        $stmt = Database::pdo()->prepare(
            'SELECT * FROM auth_accounts WHERE user_id = ? ORDER BY created_at ASC'
        );
        $stmt->execute([$userId]);
        return $stmt->fetchAll();
    }

    public function countForUser(int $userId): int
    {
        $stmt = Database::pdo()->prepare('SELECT COUNT(*) FROM auth_accounts WHERE user_id = ?');
        $stmt->execute([$userId]);
        return (int) $stmt->fetchColumn();
    }

    public function findByUuidForUser(string $uuid, int $userId): ?array
    {
        $stmt = Database::pdo()->prepare(
            'SELECT * FROM auth_accounts WHERE uuid = ? AND user_id = ?'
        );
        $stmt->execute([$uuid, $userId]);
        $row = $stmt->fetch();
        return $row === false ? null : $row;
    }

    public function delete(int $id): void
    {
        $stmt = Database::pdo()->prepare('DELETE FROM auth_accounts WHERE id = ?');
        $stmt->execute([$id]);
    }
}
