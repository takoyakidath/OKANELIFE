<?php

use Okanelife\Domain\CompanyRepository;
use Okanelife\Domain\IncomeRepository;
use Okanelife\Domain\IncomeSourceRepository;
use Okanelife\Domain\MilestoneRepository;
use Okanelife\Domain\MilestoneService;
use Okanelife\Domain\StatsService;

return [
    'IncomeSourceRepository lists the seeded system categories' => function () {
        $user = test_create_user();
        $sources = (new IncomeSourceRepository())->listForUser((int) $user['id']);
        assert_equal(8, count($sources));
        assert_true((bool) $sources[0]['is_system']);
    },

    'IncomeRepository creates an income and links a company by name' => function () {
        $user = test_create_user();
        $company = (new CompanyRepository())->findOrCreateByName((int) $user['id'], 'サイゼリヤ');
        $sourceId = (new IncomeSourceRepository())->defaultSystemSourceId();

        $income = (new IncomeRepository())->create((int) $user['id'], [
            'amount' => 42000,
            'amount_precision' => 'exact',
            'income_date' => '2026-09-15',
            'date_precision' => 'day',
            'source_id' => $sourceId,
            'company_id' => $company['id'],
            'memo' => '9月分給与',
        ]);

        assert_equal(42000, (int) $income['amount']);
        $found = (new IncomeRepository())->findByUuidForUser($income['uuid'], (int) $user['id']);
        assert_equal($income['uuid'], $found['uuid']);
    },

    'StatsService aggregates monthly, yearly and lifetime totals' => function () {
        $user = test_create_user();
        $userId = (int) $user['id'];
        $repo = new IncomeRepository();
        foreach ([
            ['2025-01-10', 10000],
            ['2025-06-10', 20000],
            ['2026-09-10', 42000],
        ] as [$date, $amount]) {
            $repo->create($userId, [
                'amount' => $amount, 'amount_precision' => 'exact',
                'income_date' => $date, 'date_precision' => 'day',
                'source_id' => null, 'company_id' => null, 'memo' => null,
            ]);
        }
        // An "unknown" amount record must not distort totals.
        $repo->create($userId, [
            'amount' => null, 'amount_precision' => 'unknown',
            'income_date' => '2026-01-01', 'date_precision' => 'year',
            'source_id' => null, 'company_id' => null, 'memo' => null,
        ]);

        $stats = new StatsService();
        $summary = $stats->summary($userId);
        assert_equal(72000, $summary['lifetime_total']);
        assert_equal(1, $summary['unknown_amount_count']);
        assert_equal(4, $summary['income_count']);

        $yearly = $stats->yearly($userId);
        $byYear = array_column($yearly, 'total', 'year');
        assert_equal(30000, $byYear[2025]);
        assert_equal(42000, $byYear[2026]);

        $monthly2026 = $stats->monthly($userId, 2026);
        $septemberTotal = array_values(array_filter($monthly2026, fn ($m) => $m['month'] === 9))[0]['total'];
        assert_equal(42000, $septemberTotal);
    },

    'StatsService::byCompany groups totals per company and keys them by uuid' => function () {
        $user = test_create_user();
        $userId = (int) $user['id'];
        $company = (new CompanyRepository())->findOrCreateByName($userId, 'サイゼリヤ');
        $repo = new IncomeRepository();
        foreach ([10000, 20000] as $amount) {
            $repo->create($userId, [
                'amount' => $amount, 'amount_precision' => 'exact',
                'income_date' => '2026-09-10', 'date_precision' => 'day',
                'source_id' => null, 'company_id' => $company['id'], 'memo' => null,
            ]);
        }

        $byCompany = (new StatsService())->byCompany($userId);
        assert_equal(1, count($byCompany));
        assert_equal($company['uuid'], $byCompany[0]['key']);
        assert_equal('サイゼリヤ', $byCompany[0]['label']);
        assert_equal(30000, $byCompany[0]['total']);
    },

    'IncomeRepository cursor pagination does not repeat or skip rows' => function () {
        $user = test_create_user();
        $userId = (int) $user['id'];
        $repo = new IncomeRepository();
        for ($i = 1; $i <= 5; $i++) {
            $repo->create($userId, [
                'amount' => $i * 1000, 'amount_precision' => 'exact',
                'income_date' => sprintf('2026-01-%02d', $i), 'date_precision' => 'day',
                'source_id' => null, 'company_id' => null, 'memo' => null,
            ]);
        }

        $page1 = $repo->listForUser($userId, ['limit' => 2]);
        assert_equal(2, count($page1['items']));
        assert_true($page1['next_cursor'] !== null);

        $page2 = $repo->listForUser($userId, ['limit' => 2], $page1['next_cursor']);
        assert_equal(2, count($page2['items']));

        $page1Uuids = array_column($page1['items'], 'uuid');
        $page2Uuids = array_column($page2['items'], 'uuid');
        assert_equal([], array_intersect($page1Uuids, $page2Uuids));
    },

    'MilestoneService records first income and cumulative thresholds' => function () {
        $user = test_create_user();
        $userId = (int) $user['id'];
        (new IncomeRepository())->create($userId, [
            'amount' => 60000, 'amount_precision' => 'exact',
            'income_date' => '2026-01-01', 'date_precision' => 'day',
            'source_id' => null, 'company_id' => null, 'memo' => null,
        ]);

        (new MilestoneService())->evaluateForUser($userId);

        $milestones = (new MilestoneRepository())->listForUser($userId);
        $types = array_column($milestones, 'type');
        assert_true(in_array('first_income', $types, true));

        $cumulativeValues = array_column(
            array_filter($milestones, fn ($m) => $m['type'] === 'cumulative_total'),
            'value'
        );
        sort($cumulativeValues);
        assert_equal([10000, 50000], array_map('intval', $cumulativeValues));
    },
];
