<?php

use Okanelife\Domain\CompanyRepository;
use Okanelife\Domain\ExportJobRepository;
use Okanelife\Domain\ExportService;
use Okanelife\Domain\ImportService;
use Okanelife\Domain\IncomeRepository;

return [
    'Export produces a ZIP and import restores it for another user' => function () {
        $userA = test_create_user();
        $userAId = (int) $userA['id'];

        $company = (new CompanyRepository())->findOrCreateByName($userAId, 'サイゼリヤ');
        (new IncomeRepository())->create($userAId, [
            'amount' => 42000, 'amount_precision' => 'exact',
            'income_date' => '2026-09-15', 'date_precision' => 'day',
            'source_id' => null, 'company_id' => $company['id'], 'memo' => '9月分給与',
        ]);
        (new IncomeRepository())->create($userAId, [
            'amount' => null, 'amount_precision' => 'unknown',
            'income_date' => '2020-01-01', 'date_precision' => 'year',
            'source_id' => null, 'company_id' => null, 'memo' => null,
        ]);

        $jobRepo = new ExportJobRepository();
        $job = $jobRepo->create($userAId, 'manual');
        (new ExportService())->processJob($job);

        $completedJob = $jobRepo->findById((int) $job['id']);
        assert_equal('completed', $completedJob['status']);
        assert_true(is_file($completedJob['file_path']));

        try {
            $userB = test_create_user();
            $userBId = (int) $userB['id'];

            $preview = (new ImportService())->preview($userBId, $completedJob['file_path']);
            assert_equal(2, $preview['counts']['incomes']);
            assert_equal(1, $preview['counts']['companies']);
            assert_equal(0, $preview['duplicates']);

            (new ImportService())->apply($userBId, $preview['preview_token'], 'skip');

            $restored = (new IncomeRepository())->listForUser($userBId, []);
            assert_equal(2, count($restored['items']));

            $restoredCompany = (new CompanyRepository())->listForUser($userBId);
            assert_equal('サイゼリヤ', $restoredCompany[0]['name']);
        } finally {
            @unlink($completedJob['file_path']);
        }
    },

    'Re-importing the same export with "skip" does not duplicate rows' => function () {
        $userA = test_create_user();
        $userAId = (int) $userA['id'];
        (new IncomeRepository())->create($userAId, [
            'amount' => 1000, 'amount_precision' => 'exact',
            'income_date' => '2026-01-01', 'date_precision' => 'day',
            'source_id' => null, 'company_id' => null, 'memo' => null,
        ]);

        $jobRepo = new ExportJobRepository();
        $job = $jobRepo->create($userAId, 'manual');
        (new ExportService())->processJob($job);
        $completedJob = $jobRepo->findById((int) $job['id']);

        try {
            $userB = test_create_user();
            $userBId = (int) $userB['id'];
            $importService = new ImportService();

            $preview1 = $importService->preview($userBId, $completedJob['file_path']);
            $importService->apply($userBId, $preview1['preview_token'], 'skip');

            $preview2 = $importService->preview($userBId, $completedJob['file_path']);
            assert_equal(1, $preview2['duplicates']);
            $importService->apply($userBId, $preview2['preview_token'], 'skip');

            $restored = (new IncomeRepository())->listForUser($userBId, []);
            assert_equal(1, count($restored['items']));
        } finally {
            @unlink($completedJob['file_path']);
        }
    },
];
