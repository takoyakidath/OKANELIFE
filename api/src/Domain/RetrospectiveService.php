<?php

namespace Okanelife\Domain;

use Okanelife\Support\Database;

final class RetrospectiveService
{
    public function __construct(
        private StatsService $stats = new StatsService(),
        private UserRepository $users = new UserRepository(),
    ) {
    }

    public function forYear(int $userId, int $year): array
    {
        $monthly = $this->stats->monthly($userId, $year);
        $total = array_sum(array_column($monthly, 'total'));

        $bestMonth = null;
        foreach ($monthly as $point) {
            if ($bestMonth === null || $point['total'] > $bestMonth['total']) {
                $bestMonth = $point;
            }
        }
        $bestMonth = $bestMonth !== null && $bestMonth['total'] > 0
            ? ['month' => $bestMonth['month'], 'total' => $bestMonth['total']]
            : null;

        $topSources = $this->topForYear($userId, $year, 'source');
        $topCompanies = $this->topForYear($userId, $year, 'company');

        $events = (new EventRepository())->listForUser($userId, $year);
        $notableEvents = array_map(fn ($e) => $this->formatEvent($e), array_slice($events, 0, 8));

        $user = $this->users->findById($userId);
        $age = null;
        if (!empty($user['birth_date'])) {
            $birth = new \DateTimeImmutable($user['birth_date']);
            $reference = new \DateTimeImmutable("{$year}-12-31");
            $age = $reference->diff($birth)->y;
        }

        return [
            'year' => $year,
            'total' => $total,
            'best_month' => $bestMonth,
            'top_sources' => $topSources,
            'top_companies' => $topCompanies,
            'monthly' => $monthly,
            'notable_events' => $notableEvents,
            'age' => $age,
        ];
    }

    private function topForYear(int $userId, int $year, string $dimension): array
    {
        $joinCol = $dimension === 'source' ? 'source_id' : 'company_id';
        $table = $dimension === 'source' ? 'income_sources' : 'companies';
        $labelExpr = $dimension === 'source' ? 's.name' : 'c.name';
        $keyExpr = $dimension === 'source' ? 's.category' : 'c.uuid';

        $stmt = Database::pdo()->prepare(
            "SELECT {$keyExpr} AS `key`, {$labelExpr} AS label, SUM(i.amount) AS total
             FROM incomes i
             JOIN {$table} " . ($dimension === 'source' ? 's' : 'c') . " ON " .
                ($dimension === 'source' ? 's.id' : 'c.id') . " = i.{$joinCol}
             WHERE i.user_id = ? AND i.deleted_at IS NULL AND i.amount IS NOT NULL
                AND SUBSTR(i.income_date,1,4) = ?
             GROUP BY {$keyExpr}, {$labelExpr}
             ORDER BY total DESC LIMIT 5"
        );
        $stmt->execute([$userId, (string) $year]);
        return array_map(fn ($row) => [
            'key' => $row['key'],
            'label' => $row['label'],
            'total' => (int) $row['total'],
        ], $stmt->fetchAll());
    }

    private function formatEvent(array $event): array
    {
        $income = null;
        if (!empty($event['income_id'])) {
            $incomeRow = (new IncomeRepository())->findById((int) $event['income_id']);
            if ($incomeRow !== null) {
                $income = ['uuid' => $incomeRow['uuid'], 'amount' => $incomeRow['amount']];
            }
        }
        $company = null;
        if (!empty($event['company_id'])) {
            $companyRow = (new CompanyRepository())->findById((int) $event['company_id']);
            if ($companyRow !== null) {
                $company = ['uuid' => $companyRow['uuid'], 'name' => $companyRow['name']];
            }
        }
        return [
            'uuid' => $event['uuid'],
            'title' => $event['title'],
            'description' => $event['description'],
            'event_date' => $event['event_date'],
            'income' => $income,
            'company' => $company,
        ];
    }
}
