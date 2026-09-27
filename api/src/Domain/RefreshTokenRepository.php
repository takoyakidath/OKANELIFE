<?php

namespace Okanelife\Domain;

use Okanelife\Support\Database;

final class RefreshTokenRepository
{
    public function issue(int $userId, int $ttlDays): string
    {
        $plainToken = bin2hex(random_bytes(32));
        $hash = hash('sha256', $plainToken);
        $expiresAt = gmdate('Y-m-d H:i:s', time() + $ttlDays * 86400);

        $stmt = Database::pdo()->prepare(
            'INSERT INTO refresh_tokens (user_id, token_hash, expires_at, created_at) VALUES (?, ?, ?, ?)'
        );
        $stmt->execute([$userId, $hash, $expiresAt, Database::now()]);

        return $plainToken;
    }

    public function findValidByPlainToken(string $plainToken): ?array
    {
        $hash = hash('sha256', $plainToken);
        $stmt = Database::pdo()->prepare(
            'SELECT * FROM refresh_tokens
             WHERE token_hash = ? AND revoked_at IS NULL AND expires_at > ?'
        );
        $stmt->execute([$hash, Database::now()]);
        $row = $stmt->fetch();
        return $row === false ? null : $row;
    }

    /** Looks up a token regardless of revoked/expired status, so callers can
     * tell "never existed" apart from "existed but was already used" — the
     * latter is a signal the token was stolen and replayed. */
    public function findByPlainTokenIncludingRevoked(string $plainToken): ?array
    {
        $hash = hash('sha256', $plainToken);
        $stmt = Database::pdo()->prepare('SELECT * FROM refresh_tokens WHERE token_hash = ?');
        $stmt->execute([$hash]);
        $row = $stmt->fetch();
        return $row === false ? null : $row;
    }

    public function revoke(int $id): void
    {
        $stmt = Database::pdo()->prepare('UPDATE refresh_tokens SET revoked_at = ? WHERE id = ?');
        $stmt->execute([Database::now(), $id]);
    }

    public function revokeAllForUser(int $userId): void
    {
        $stmt = Database::pdo()->prepare(
            'UPDATE refresh_tokens SET revoked_at = ? WHERE user_id = ? AND revoked_at IS NULL'
        );
        $stmt->execute([Database::now(), $userId]);
    }

    public function revokeByPlainToken(string $plainToken): void
    {
        $hash = hash('sha256', $plainToken);
        $stmt = Database::pdo()->prepare(
            'UPDATE refresh_tokens SET revoked_at = ? WHERE token_hash = ?'
        );
        $stmt->execute([Database::now(), $hash]);
    }
}
