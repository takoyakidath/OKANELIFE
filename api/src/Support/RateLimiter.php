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

        // One atomic upsert so concurrent requests can't race on the
        // INSERT (duplicate key -> 500). `count` is assigned before
        // `window_start` because MySQL evaluates assignments left to right.
        if (Database::driver() === 'sqlite') {
            $sql = 'INSERT INTO rate_limit_buckets (bucket_key, window_start, count) VALUES (?, ?, 1)'
                . ' ON CONFLICT(bucket_key) DO UPDATE SET'
                . ' count = CASE WHEN window_start = excluded.window_start THEN count + 1 ELSE 1 END,'
                . ' window_start = excluded.window_start';
        } else {
            $sql = 'INSERT INTO rate_limit_buckets (bucket_key, window_start, count) VALUES (?, ?, 1)'
                . ' ON DUPLICATE KEY UPDATE'
                . ' count = IF(window_start = VALUES(window_start), count + 1, 1),'
                . ' window_start = VALUES(window_start)';
        }
        $pdo->prepare($sql)->execute([$key, $windowStart]);

        $stmt = $pdo->prepare('SELECT count FROM rate_limit_buckets WHERE bucket_key = ?');
        $stmt->execute([$key]);
        return (int) $stmt->fetchColumn() <= $limit;
    }
}
