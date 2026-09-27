<?php

namespace Okanelife\Support;

/**
 * DB-backed fixed-window rate limiter. Lolipop shared hosting cannot
 * assume Redis/Memcached is available, so this trades perfect accuracy
 * under heavy concurrency for zero extra infrastructure — acceptable at
 * the scale of a personal finance log (see docs/DESIGN.md §5).
 */
final class RateLimiter
{
    public static function allow(string $key, int $limit, int $windowSeconds): bool
    {
        $pdo = Database::pdo();
        $windowStart = intdiv(time(), $windowSeconds) * $windowSeconds;

        $stmt = $pdo->prepare('SELECT count, window_start FROM rate_limit_buckets WHERE bucket_key = ?');
        $stmt->execute([$key]);
        $row = $stmt->fetch();

        if ($row === false) {
            $insert = $pdo->prepare(
                'INSERT INTO rate_limit_buckets (bucket_key, window_start, count) VALUES (?, ?, 1)'
            );
            $insert->execute([$key, $windowStart]);
            return true;
        }

        if ((int) $row['window_start'] !== $windowStart) {
            $update = $pdo->prepare(
                'UPDATE rate_limit_buckets SET window_start = ?, count = 1 WHERE bucket_key = ?'
            );
            $update->execute([$windowStart, $key]);
            return true;
        }

        if ((int) $row['count'] >= $limit) {
            return false;
        }

        $update = $pdo->prepare('UPDATE rate_limit_buckets SET count = count + 1 WHERE bucket_key = ?');
        $update->execute([$key]);
        return true;
    }
}
