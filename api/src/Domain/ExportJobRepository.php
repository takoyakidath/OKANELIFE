<?php

namespace Okanelife\Domain;

use Okanelife\Support\Database;
use Okanelife\Support\Uuid;

final class ExportJobRepository
{
    public function create(int $userId, string $triggerReason = 'manual'): array
    {
        $pdo = Database::pdo();
        $uuid = Uuid::v4();
        $stmt = $pdo->prepare(
            'INSERT INTO export_jobs (uuid, user_id, status, trigger_reason, format_version, created_at)
             VALUES (?, ?, ?, ?, 1, ?)'
        );
        $stmt->execute([$uuid, $userId, 'pending', $triggerReason, Database::now()]);
        return $this->findById((int) $pdo->lastInsertId());
    }

    public function findById(int $id): ?array
    {
        $stmt = Database::pdo()->prepare('SELECT * FROM export_jobs WHERE id = ?');
        $stmt->execute([$id]);
        $row = $stmt->fetch();
        return $row === false ? null : $row;
    }

    public function findByUuidForUser(string $uuid, int $userId): ?array
    {
        $stmt = Database::pdo()->prepare('SELECT * FROM export_jobs WHERE uuid = ? AND user_id = ?');
        $stmt->execute([$uuid, $userId]);
        $row = $stmt->fetch();
        return $row === false ? null : $row;
    }

    public function listForUser(int $userId): array
    {
        $stmt = Database::pdo()->prepare(
            'SELECT * FROM export_jobs WHERE user_id = ? ORDER BY created_at DESC LIMIT 10'
        );
        $stmt->execute([$userId]);
        return $stmt->fetchAll();
    }

    public function listPending(): array
    {
        $stmt = Database::pdo()->query("SELECT * FROM export_jobs WHERE status = 'pending' ORDER BY created_at ASC");
        return $stmt->fetchAll();
    }

    public function markProcessing(int $id): void
    {
        $stmt = Database::pdo()->prepare("UPDATE export_jobs SET status = 'processing' WHERE id = ?");
        $stmt->execute([$id]);
    }

    public function markCompleted(int $id, string $filePath, string $downloadToken, string $expiresAt): void
    {
        $stmt = Database::pdo()->prepare(
            "UPDATE export_jobs
             SET status = 'completed', file_path = ?, download_token = ?, expires_at = ?, completed_at = ?
             WHERE id = ?"
        );
        $stmt->execute([$filePath, $downloadToken, $expiresAt, Database::now(), $id]);
    }

    public function markFailed(int $id, string $errorMessage): void
    {
        $stmt = Database::pdo()->prepare(
            "UPDATE export_jobs SET status = 'failed', error_message = ?, completed_at = ? WHERE id = ?"
        );
        $stmt->execute([$errorMessage, Database::now(), $id]);
    }
}
