<?php

namespace Okanelife\Domain;

use Okanelife\Support\Database;

/**
 * Auto-generated milestones (product.txt §15). Deliberately small and
 * quiet — this evaluates after a write and just records rows; the UI
 * decides how (un)obtrusively to surface them (docs/DESIGN.md §7).
 */
final class MilestoneService
{
    private const CUMULATIVE_THRESHOLDS = [10_000, 50_000, 100_000, 500_000, 1_000_000, 5_000_000, 10_000_000];

    public function __construct(
        private MilestoneRepository $milestones = new MilestoneRepository(),
        private StatsService $stats = new StatsService(),
    ) {
    }

    public function evaluateForUser(int $userId): void
    {
        $summary = $this->stats->summary($userId);

        if ($summary['income_count'] >= 1) {
            $this->milestones->record($userId, 'first_income', null);
        }
        if ($summary['income_count'] >= 100) {
            $this->milestones->record($userId, 'income_count', 100);
        }

        foreach (self::CUMULATIVE_THRESHOLDS as $threshold) {
            if ($summary['lifetime_total'] >= $threshold) {
                $this->milestones->record($userId, 'cumulative_total', $threshold);
            }
        }

        if ($summary['best_month_total'] > 0) {
            $this->milestones->record($userId, 'best_month', $summary['best_month_total']);
        }
        if ($summary['best_year_total'] > 0) {
            $this->milestones->record($userId, 'best_year', $summary['best_year_total']);
        }

        if ($this->hasTwelveConsecutiveMonths($userId)) {
            $this->milestones->record($userId, 'streak_12_months', null);
        }
    }

    private function hasTwelveConsecutiveMonths(int $userId): bool
    {
        $stmt = Database::pdo()->prepare(
            'SELECT DISTINCT SUBSTR(income_date,1,7) AS ym FROM incomes
             WHERE user_id = ? AND deleted_at IS NULL'
        );
        $stmt->execute([$userId]);
        $months = array_flip($stmt->fetchAll(\PDO::FETCH_COLUMN));

        $cursor = new \DateTimeImmutable('first day of this month');
        for ($i = 0; $i < 12; $i++) {
            if (!isset($months[$cursor->format('Y-m')])) {
                return false;
            }
            $cursor = $cursor->modify('-1 month');
        }
        return true;
    }
}
