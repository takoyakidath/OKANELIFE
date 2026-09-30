<?php

namespace Okanelife\Domain;

use Okanelife\Support\Database;

final class StatsService
{
    public function summary(int $userId): array
    {
        $pdo = Database::pdo();
        $now = new \DateTimeImmutable('now', new \DateTimeZone('UTC'));
        $thisMonth = $now->format('Y-m');
        $lastMonth = $now->modify('first day of last month')->format('Y-m');
        $thisYear = $now->format('Y');

        $lifetimeTotal = $this->sumWhere($userId, '1=1');
        $thisMonthTotal = $this->sumWhere($userId, "SUBSTR(income_date,1,7) = ?", [$thisMonth]);
        $lastMonthTotal = $this->sumWhere($userId, "SUBSTR(income_date,1,7) = ?", [$lastMonth]);
        $thisYearTotal = $this->sumWhere($userId, "SUBSTR(income_date,1,4) = ?", [$thisYear]);

        $bestMonthStmt = $pdo->prepare(
            "SELECT COALESCE(MAX(m.total), 0) FROM (
                SELECT SUM(amount) AS total FROM incomes
                WHERE user_id = ? AND deleted_at IS NULL AND amount IS NOT NULL
                GROUP BY SUBSTR(income_date,1,7)
             ) m"
        );
        $bestMonthStmt->execute([$userId]);
        $bestMonthTotal = (int) $bestMonthStmt->fetchColumn();

        $bestYearStmt = $pdo->prepare(
            "SELECT COALESCE(MAX(y.total), 0) FROM (
                SELECT SUM(amount) AS total FROM incomes
                WHERE user_id = ? AND deleted_at IS NULL AND amount IS NOT NULL
                GROUP BY SUBSTR(income_date,1,4)
             ) y"
        );
        $bestYearStmt->execute([$userId]);
        $bestYearTotal = (int) $bestYearStmt->fetchColumn();

        $countStmt = $pdo->prepare(
            'SELECT COUNT(*), SUM(CASE WHEN amount IS NULL THEN 1 ELSE 0 END), MIN(income_date)
             FROM incomes WHERE user_id = ? AND deleted_at IS NULL'
        );
        $countStmt->execute([$userId]);
        [$incomeCount, $unknownCount, $firstDate] = $countStmt->fetch(\PDO::FETCH_NUM);

        return [
            'lifetime_total' => $lifetimeTotal,
            'this_month_total' => $thisMonthTotal,
            'this_year_total' => $thisYearTotal,
            'last_month_total' => $lastMonthTotal,
            'best_month_total' => $bestMonthTotal,
            'best_year_total' => $bestYearTotal,
            'income_count' => (int) $incomeCount,
            'unknown_amount_count' => (int) $unknownCount,
            'first_income_date' => $firstDate,
        ];
    }

    public function monthly(int $userId, int $year): array
    {
        $stmt = Database::pdo()->prepare(
            "SELECT SUBSTR(income_date,6,2) AS month, SUM(amount) AS total, COUNT(*) AS count
             FROM incomes
             WHERE user_id = ? AND deleted_at IS NULL AND amount IS NOT NULL AND SUBSTR(income_date,1,4) = ?
             GROUP BY month"
        );
        $stmt->execute([$userId, (string) $year]);
        $byMonth = [];
        foreach ($stmt->fetchAll() as $row) {
            $byMonth[(int) $row['month']] = (int) $row['total'];
        }

        $result = [];
        for ($m = 1; $m <= 12; $m++) {
            $result[] = ['year' => $year, 'month' => $m, 'total' => $byMonth[$m] ?? 0];
        }
        return $result;
    }

    public function yearly(int $userId): array
    {
        $stmt = Database::pdo()->prepare(
            "SELECT SUBSTR(income_date,1,4) AS year, SUM(amount) AS total, COUNT(*) AS count
             FROM incomes
             WHERE user_id = ? AND deleted_at IS NULL AND amount IS NOT NULL
             GROUP BY year ORDER BY year ASC"
        );
        $stmt->execute([$userId]);
        return array_map(fn ($row) => [
            'year' => (int) $row['year'],
            'total' => (int) $row['total'],
            'count' => (int) $row['count'],
        ], $stmt->fetchAll());
    }

    public function bySource(int $userId): array
    {
        $stmt = Database::pdo()->prepare(
            "SELECT COALESCE(s.name, '未設定') AS label, s.category AS category_key,
                    SUM(i.amount) AS total
             FROM incomes i
             LEFT JOIN income_sources s ON s.id = i.source_id
             WHERE i.user_id = ? AND i.deleted_at IS NULL AND i.amount IS NOT NULL
             GROUP BY s.id
             ORDER BY total DESC"
        );
        $stmt->execute([$userId]);
        return array_map(fn ($row) => [
            'key' => $row['category_key'] ?? 'unassigned',
            'label' => $row['label'],
            'total' => (int) $row['total'],
        ], $stmt->fetchAll());
    }

    public function byCompany(int $userId): array
    {
        $stmt = Database::pdo()->prepare(
            "SELECT c.uuid AS `key`, c.name AS label, SUM(i.amount) AS total
             FROM incomes i
             JOIN companies c ON c.id = i.company_id
             WHERE i.user_id = ? AND i.deleted_at IS NULL AND i.amount IS NOT NULL
             GROUP BY c.id
             ORDER BY total DESC"
        );
        $stmt->execute([$userId]);
        return array_map(fn ($row) => [
            'key' => $row['key'],
            'label' => $row['label'],
            'total' => (int) $row['total'],
        ], $stmt->fetchAll());
    }

    public function byAge(int $userId, string $birthDate): array
    {
        $stmt = Database::pdo()->prepare(
            'SELECT income_date, amount FROM incomes
             WHERE user_id = ? AND deleted_at IS NULL AND amount IS NOT NULL'
        );
        $stmt->execute([$userId]);

        $birth = new \DateTimeImmutable($birthDate);
        $totals = [];
        foreach ($stmt->fetchAll() as $row) {
            $incomeDate = new \DateTimeImmutable($row['income_date']);
            $age = $incomeDate->diff($birth)->y;
            if ($incomeDate < $birth) {
                continue;
            }
            $totals[$age] = ($totals[$age] ?? 0) + (int) $row['amount'];
        }
        ksort($totals);
        return array_map(fn ($age, $total) => ['age' => $age, 'total' => $total], array_keys($totals), $totals);
    }

    public function simulation(int $userId): array
    {
        $now = new \DateTimeImmutable('now', new \DateTimeZone('UTC'));
        $twelveMonthsAgo = $now->modify('-12 months')->format('Y-m-d');
        $pace = $this->sumWhere($userId, 'income_date >= ?', [$twelveMonthsAgo]);

        $projections = [];
        foreach ([1, 3, 5, 10] as $years) {
            $projections[] = ['years' => $years, 'total' => $pace * $years];
        }

        return ['current_annual_pace' => $pace, 'projections' => $projections];
    }

    public function compareYears(int $userId, int $yearA, int $yearB): array
    {
        return [
            'a' => ['year' => $yearA, 'monthly' => $this->monthly($userId, $yearA)],
            'b' => ['year' => $yearB, 'monthly' => $this->monthly($userId, $yearB)],
        ];
    }

    private function sumWhere(int $userId, string $condition, array $extraParams = []): int
    {
        $stmt = Database::pdo()->prepare(
            "SELECT COALESCE(SUM(amount), 0) FROM incomes
             WHERE user_id = ? AND deleted_at IS NULL AND amount IS NOT NULL AND ({$condition})"
        );
        $stmt->execute([$userId, ...$extraParams]);
        return (int) $stmt->fetchColumn();
    }
}
