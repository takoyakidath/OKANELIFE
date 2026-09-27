<?php

namespace Okanelife\Domain;

use Okanelife\Support\Database;
use Okanelife\Support\Uuid;

final class ImportException extends \RuntimeException
{
}

/**
 * Restores an OKANELIFE export ZIP. Split into preview() (no DB writes —
 * just counts/duplicates for the confirmation screen, product.txt §21)
 * and apply() (the actual restore, always preceded by an automatic backup
 * export of the user's current data).
 */
final class ImportService
{
    public function preview(int $userId, string $zipPath): array
    {
        $data = $this->readZip($zipPath);
        $manifest = $data['manifest.json'] ?? null;
        if (!is_array($manifest) || ($manifest['format'] ?? null) !== 'okanelife-export') {
            throw new ImportException('OKANELIFEのエクスポートファイルではありません');
        }

        $warnings = [];
        if ((int) $manifest['version'] !== ExportService::FORMAT_VERSION) {
            $warnings[] = "エクスポート形式のバージョン({$manifest['version']})が現在のバージョンと異なります。";
        }

        $incomes = $data['incomes.json']['items'] ?? [];
        $companies = $data['companies.json']['items'] ?? [];
        $events = $data['events.json']['items'] ?? [];

        $existingIncomeUuids = $this->existingUuids($userId, 'incomes');
        $duplicates = 0;
        foreach ($incomes as $income) {
            if (isset($existingIncomeUuids[$income['uuid']])) {
                $duplicates++;
            }
        }

        $token = bin2hex(random_bytes(24));
        $dir = self::previewDir();
        if (!is_dir($dir)) {
            mkdir($dir, 0770, true);
        }
        file_put_contents("{$dir}/{$token}.json", json_encode([
            'user_id' => $userId,
            'data' => $data,
        ], JSON_UNESCAPED_UNICODE | JSON_UNESCAPED_SLASHES));

        return [
            'preview_token' => $token,
            'counts' => [
                'incomes' => count($incomes),
                'companies' => count($companies),
                'events' => count($events),
            ],
            'duplicates' => $duplicates,
            'format_version' => (int) $manifest['version'],
            'warnings' => $warnings,
        ];
    }

    public function apply(int $userId, string $previewToken, string $policy): array
    {
        $path = self::previewDir() . "/{$previewToken}.json";
        if (!is_file($path)) {
            throw new ImportException('復元内容の有効期限が切れました。もう一度アップロードしてください。');
        }
        $stored = json_decode((string) file_get_contents($path), true);
        if (!is_array($stored) || (int) $stored['user_id'] !== $userId) {
            throw new ImportException('復元内容を確認できませんでした');
        }
        $data = $stored['data'];

        // Always back up current data before a potentially destructive
        // restore (product.txt §21).
        $backupJob = (new ExportJobRepository())->create($userId, 'pre_import_backup');
        (new ExportService())->processJob($backupJob);

        $pdo = Database::pdo();
        $pdo->beginTransaction();
        try {
            $companyIdByUuid = $this->importCompanies($userId, $data['companies.json']['items'] ?? [], $policy);
            $sourceIdByUuid = $this->importSources($userId, $data['income-sources.json']['items'] ?? [], $policy);
            $incomeIdByUuid = $this->importIncomes(
                $userId,
                $data['incomes.json']['items'] ?? [],
                $policy,
                $companyIdByUuid,
                $sourceIdByUuid
            );
            $this->importEvents($userId, $data['events.json']['items'] ?? [], $policy, $companyIdByUuid, $incomeIdByUuid);
            $pdo->commit();
        } catch (\Throwable $e) {
            $pdo->rollBack();
            throw new ImportException('復元中にエラーが発生しました: ' . $e->getMessage());
        }

        unlink($path);
        (new MilestoneService())->evaluateForUser($userId);

        return ['status' => 'completed'];
    }

    private function importCompanies(int $userId, array $items, string $policy): array
    {
        $map = [];
        foreach ($items as $item) {
            $existing = (new CompanyRepository())->findByUuidForUser($item['uuid'], $userId);
            if ($existing !== null) {
                if ($policy === 'overwrite') {
                    (new CompanyRepository())->update((int) $existing['id'], [
                        'name' => $item['name'],
                        'memo' => $item['memo'] ?? null,
                    ]);
                }
                $map[$item['uuid']] = (int) $existing['id'];
                continue;
            }
            $pdo = Database::pdo();
            $now = Database::now();
            $stmt = $pdo->prepare(
                'INSERT INTO companies (uuid, user_id, name, memo, created_at, updated_at) VALUES (?, ?, ?, ?, ?, ?)'
            );
            $stmt->execute([$item['uuid'], $userId, $item['name'], $item['memo'] ?? null, $now, $now]);
            $map[$item['uuid']] = (int) $pdo->lastInsertId();
        }
        return $map;
    }

    private function importSources(int $userId, array $items, string $policy): array
    {
        $map = [];
        foreach ($items as $item) {
            if (!empty($item['is_system'])) {
                $stmt = Database::pdo()->prepare(
                    'SELECT id FROM income_sources WHERE is_system = 1 AND category = ? LIMIT 1'
                );
                $stmt->execute([$item['category']]);
                $id = $stmt->fetchColumn();
                if ($id !== false) {
                    $map[$item['uuid']] = (int) $id;
                }
                continue;
            }
            $existing = (new IncomeSourceRepository())->findByUuidForUser($item['uuid'], $userId);
            if ($existing !== null) {
                $map[$item['uuid']] = (int) $existing['id'];
                continue;
            }
            $pdo = Database::pdo();
            $stmt = $pdo->prepare(
                'INSERT INTO income_sources (uuid, user_id, name, category, is_system, created_at)
                 VALUES (?, ?, ?, ?, 0, ?)'
            );
            $stmt->execute([$item['uuid'], $userId, $item['name'], $item['category'], Database::now()]);
            $map[$item['uuid']] = (int) $pdo->lastInsertId();
        }
        return $map;
    }

    private function importIncomes(int $userId, array $items, string $policy, array $companyMap, array $sourceMap): array
    {
        $map = [];
        foreach ($items as $item) {
            $existing = (new IncomeRepository())->findByUuidForUser($item['uuid'], $userId);
            $companyId = isset($item['company_uuid']) ? ($companyMap[$item['company_uuid']] ?? null) : null;
            $sourceId = isset($item['source_uuid']) ? ($sourceMap[$item['source_uuid']] ?? null) : null;

            if ($existing !== null) {
                if ($policy === 'overwrite') {
                    (new IncomeRepository())->update((int) $existing['id'], [
                        'amount' => $item['amount'],
                        'amount_precision' => $item['amount_precision'],
                        'income_date' => $item['income_date'],
                        'date_precision' => $item['date_precision'],
                        'source_id' => $sourceId,
                        'company_id' => $companyId,
                        'memo' => $item['memo'] ?? null,
                    ]);
                }
                $map[$item['uuid']] = (int) $existing['id'];
                continue;
            }

            $pdo = Database::pdo();
            $now = Database::now();
            $stmt = $pdo->prepare(
                'INSERT INTO incomes
                    (uuid, user_id, amount, amount_precision, currency, income_date, date_precision,
                     source_id, company_id, memo, created_at, updated_at)
                 VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)'
            );
            $stmt->execute([
                $item['uuid'], $userId, $item['amount'], $item['amount_precision'],
                $item['currency'] ?? 'JPY', $item['income_date'], $item['date_precision'],
                $sourceId, $companyId, $item['memo'] ?? null, $now, $now,
            ]);
            $map[$item['uuid']] = (int) $pdo->lastInsertId();
        }
        return $map;
    }

    private function importEvents(int $userId, array $items, string $policy, array $companyMap, array $incomeMap): void
    {
        foreach ($items as $item) {
            $existing = (new EventRepository())->findByUuidForUser($item['uuid'], $userId);
            $companyId = isset($item['company_uuid']) ? ($companyMap[$item['company_uuid']] ?? null) : null;
            $incomeId = isset($item['income_uuid']) ? ($incomeMap[$item['income_uuid']] ?? null) : null;

            if ($existing !== null) {
                if ($policy === 'overwrite') {
                    (new EventRepository())->update((int) $existing['id'], [
                        'title' => $item['title'],
                        'description' => $item['description'] ?? null,
                        'event_date' => $item['event_date'],
                        'company_id' => $companyId,
                        'income_id' => $incomeId,
                    ]);
                }
                continue;
            }

            $stmt = Database::pdo()->prepare(
                'INSERT INTO events (uuid, user_id, income_id, company_id, title, description, event_date, created_at)
                 VALUES (?, ?, ?, ?, ?, ?, ?, ?)'
            );
            $stmt->execute([
                $item['uuid'], $userId, $incomeId, $companyId,
                $item['title'], $item['description'] ?? null, $item['event_date'], Database::now(),
            ]);
        }
    }

    private function existingUuids(int $userId, string $table): array
    {
        $stmt = Database::pdo()->prepare("SELECT uuid FROM {$table} WHERE user_id = ?");
        $stmt->execute([$userId]);
        return array_flip($stmt->fetchAll(\PDO::FETCH_COLUMN));
    }

    private function readZip(string $zipPath): array
    {
        $zip = new \ZipArchive();
        if ($zip->open($zipPath) !== true) {
            throw new ImportException('ZIPファイルを開けませんでした');
        }

        $result = [];
        foreach (['manifest.json', 'profile.json', 'incomes.json', 'companies.json', 'income-sources.json', 'events.json', 'milestones.json', 'settings.json'] as $name) {
            $content = $zip->getFromName($name);
            if ($content !== false) {
                $decoded = json_decode($content, true);
                if (is_array($decoded)) {
                    $result[$name] = $decoded;
                }
            }
        }
        $zip->close();
        return $result;
    }

    public static function previewDir(): string
    {
        return dirname(__DIR__, 2) . '/storage/imports';
    }
}
