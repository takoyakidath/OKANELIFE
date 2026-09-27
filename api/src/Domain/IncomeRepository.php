<?php

namespace Okanelife\Domain;

use Okanelife\Support\Database;
use Okanelife\Support\Uuid;

final class IncomeRepository
{
    private const PAGE_SIZE = 30;

    public function create(int $userId, array $fields): array
    {
        $pdo = Database::pdo();
        $uuid = Uuid::v4();
        $now = Database::now();
        $stmt = $pdo->prepare(
            'INSERT INTO incomes
                (uuid, user_id, amount, amount_precision, currency, income_date, date_precision,
                 source_id, company_id, memo, created_at, updated_at)
             VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)'
        );
        $stmt->execute([
            $uuid,
            $userId,
            $fields['amount'],
            $fields['amount_precision'],
            $fields['currency'] ?? 'JPY',
            $fields['income_date'],
            $fields['date_precision'],
            $fields['source_id'],
            $fields['company_id'],
            $fields['memo'],
            $now,
            $now,
        ]);
        return $this->findById((int) $pdo->lastInsertId());
    }

    public function findById(int $id): ?array
    {
        $stmt = Database::pdo()->prepare('SELECT * FROM incomes WHERE id = ?');
        $stmt->execute([$id]);
        $row = $stmt->fetch();
        return $row === false ? null : $row;
    }

    public function findByUuidForUser(string $uuid, int $userId): ?array
    {
        $stmt = Database::pdo()->prepare(
            'SELECT * FROM incomes WHERE uuid = ? AND user_id = ? AND deleted_at IS NULL'
        );
        $stmt->execute([$uuid, $userId]);
        $row = $stmt->fetch();
        return $row === false ? null : $row;
    }

    /** @return array{items:array,next_cursor:?string} */
    public function listForUser(int $userId, array $filters = [], ?string $cursor = null): array
    {
        $conditions = ['user_id = ?', 'deleted_at IS NULL'];
        $params = [$userId];

        if (!empty($filters['company_id'])) {
            $conditions[] = 'company_id = ?';
            $params[] = $filters['company_id'];
        }
        if (!empty($filters['source_id'])) {
            $conditions[] = 'source_id = ?';
            $params[] = $filters['source_id'];
        }
        if (!empty($filters['year'])) {
            $conditions[] = "income_date >= ? AND income_date < ?";
            $params[] = sprintf('%04d-01-01', $filters['year']);
            $params[] = sprintf('%04d-01-01', $filters['year'] + 1);
        }

        if ($cursor !== null) {
            [$cursorDate, $cursorId] = self::decodeCursor($cursor);
            $conditions[] = '(income_date < ? OR (income_date = ? AND id < ?))';
            $params[] = $cursorDate;
            $params[] = $cursorDate;
            $params[] = $cursorId;
        }

        $limit = (int) ($filters['limit'] ?? self::PAGE_SIZE);
        $where = implode(' AND ', $conditions);
        $stmt = Database::pdo()->prepare(
            "SELECT * FROM incomes WHERE {$where} ORDER BY income_date DESC, id DESC LIMIT " . ($limit + 1)
        );
        $stmt->execute($params);
        $rows = $stmt->fetchAll();

        $hasMore = count($rows) > $limit;
        $rows = array_slice($rows, 0, $limit);
        $nextCursor = $hasMore && $rows !== []
            ? self::encodeCursor(end($rows)['income_date'], (int) end($rows)['id'])
            : null;

        return ['items' => $rows, 'next_cursor' => $nextCursor];
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
        $stmt = Database::pdo()->prepare("UPDATE incomes SET {$sets} WHERE id = ?");
        $stmt->execute($values);
    }

    public function softDelete(int $id): void
    {
        $stmt = Database::pdo()->prepare('UPDATE incomes SET deleted_at = ? WHERE id = ?');
        $stmt->execute([Database::now(), $id]);
    }

    private static function encodeCursor(string $date, int $id): string
    {
        return base64_encode("{$date}|{$id}");
    }

    /** @return array{0:string,1:int} */
    private static function decodeCursor(string $cursor): array
    {
        $decoded = base64_decode($cursor, true);
        if ($decoded === false || !str_contains($decoded, '|')) {
            throw new \InvalidArgumentException('invalid cursor');
        }
        [$date, $id] = explode('|', $decoded, 2);
        return [$date, (int) $id];
    }
}
