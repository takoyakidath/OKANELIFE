<?php

namespace Okanelife\Domain;

use Okanelife\Support\Database;

final class TimelineService
{
    private const PAGE_SIZE = 20;

    public function forUser(int $userId, ?string $cursor): array
    {
        $cursorDate = '9999-12-31';
        $cursorId = PHP_INT_MAX;
        if ($cursor !== null) {
            $decoded = base64_decode($cursor, true);
            if ($decoded !== false && str_contains($decoded, '|')) {
                [$cursorDate, $cursorIdStr] = explode('|', $decoded, 2);
                $cursorId = (int) $cursorIdStr;
            }
        }

        $incomes = $this->fetchIncomes($userId, $cursorDate, $cursorId);
        $events = $this->fetchEvents($userId, $cursorDate, $cursorId);

        $merged = array_merge($incomes, $events);
        usort($merged, function ($a, $b) {
            $dateCompare = strcmp($b['__date'], $a['__date']);
            return $dateCompare !== 0 ? $dateCompare : $b['id'] <=> $a['id'];
        });

        $hasMore = count($merged) > self::PAGE_SIZE;
        $page = array_slice($merged, 0, self::PAGE_SIZE);

        $nextCursor = null;
        if ($hasMore && $page !== []) {
            $last = end($page);
            $nextCursor = base64_encode("{$last['__date']}|{$last['id']}");
        }

        $items = array_map(function ($row) {
            unset($row['__date']);
            return $row;
        }, $page);

        return ['items' => $items, 'next_cursor' => $nextCursor];
    }

    private function fetchIncomes(int $userId, string $cursorDate, int $cursorId): array
    {
        $stmt = Database::pdo()->prepare(
            'SELECT i.*, s.uuid AS source_uuid, s.name AS source_name, s.category AS source_category,
                    s.is_system AS source_is_system,
                    c.uuid AS company_uuid, c.name AS company_name, c.memo AS company_memo
             FROM incomes i
             LEFT JOIN income_sources s ON s.id = i.source_id
             LEFT JOIN companies c ON c.id = i.company_id
             WHERE i.user_id = ? AND i.deleted_at IS NULL
               AND (i.income_date < ? OR (i.income_date = ? AND i.id < ?))
             ORDER BY i.income_date DESC, i.id DESC LIMIT ' . (self::PAGE_SIZE + 1)
        );
        $stmt->execute([$userId, $cursorDate, $cursorDate, $cursorId]);

        return array_map(function ($row) {
            return [
                '__date' => $row['income_date'],
                'kind' => 'income',
                'id' => (int) $row['id'],
                'uuid' => $row['uuid'],
                'amount' => $row['amount'] === null ? null : (int) $row['amount'],
                'amount_precision' => $row['amount_precision'],
                'currency' => $row['currency'],
                'income_date' => $row['income_date'],
                'date_precision' => $row['date_precision'],
                'memo' => $row['memo'],
                'created_at' => $row['created_at'],
                'source' => $row['source_uuid'] ? [
                    'uuid' => $row['source_uuid'],
                    'name' => $row['source_name'],
                    'category' => $row['source_category'],
                    'is_system' => (bool) $row['source_is_system'],
                ] : null,
                'company' => $row['company_uuid'] ? [
                    'uuid' => $row['company_uuid'],
                    'name' => $row['company_name'],
                    'memo' => $row['company_memo'],
                ] : null,
            ];
        }, $stmt->fetchAll());
    }

    private function fetchEvents(int $userId, string $cursorDate, int $cursorId): array
    {
        $stmt = Database::pdo()->prepare(
            'SELECT e.*, c.uuid AS company_uuid, c.name AS company_name,
                    inc.uuid AS income_uuid, inc.amount AS income_amount
             FROM events e
             LEFT JOIN companies c ON c.id = e.company_id
             LEFT JOIN incomes inc ON inc.id = e.income_id
             WHERE e.user_id = ? AND e.deleted_at IS NULL
               AND (e.event_date < ? OR (e.event_date = ? AND e.id < ?))
             ORDER BY e.event_date DESC, e.id DESC LIMIT ' . (self::PAGE_SIZE + 1)
        );
        $stmt->execute([$userId, $cursorDate, $cursorDate, $cursorId]);

        return array_map(fn ($row) => [
            '__date' => $row['event_date'],
            'kind' => 'event',
            'id' => (int) $row['id'],
            'uuid' => $row['uuid'],
            'title' => $row['title'],
            'description' => $row['description'],
            'event_date' => $row['event_date'],
            'income' => $row['income_uuid'] ? ['uuid' => $row['income_uuid'], 'amount' => $row['income_amount']] : null,
            'company' => $row['company_uuid'] ? ['uuid' => $row['company_uuid'], 'name' => $row['company_name']] : null,
        ], $stmt->fetchAll());
    }
}
