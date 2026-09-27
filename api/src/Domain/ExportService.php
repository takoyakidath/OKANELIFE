<?php

namespace Okanelife\Domain;

use Okanelife\Support\Database;

/**
 * Builds the "take all your data with you" export ZIP (product.txt §19-20).
 * Deliberately DB-schema-independent: every file is versioned on its own
 * (see docs/DESIGN.md §6) so a future schema change doesn't invalidate old
 * exports, and relations are written by UUID, never by internal row id.
 */
final class ExportService
{
    public const FORMAT_VERSION = 1;
    private const DOWNLOAD_TTL_HOURS = 24;

    public function __construct(
        private ExportJobRepository $jobs = new ExportJobRepository(),
    ) {
    }

    public function processPendingJobs(): int
    {
        $processed = 0;
        foreach ($this->jobs->listPending() as $job) {
            $this->processJob($job);
            $processed++;
        }
        return $processed;
    }

    public function processJob(array $job): void
    {
        $this->jobs->markProcessing((int) $job['id']);
        try {
            $storageDir = self::storageDir();
            if (!is_dir($storageDir)) {
                mkdir($storageDir, 0770, true);
            }

            $zipPath = "{$storageDir}/{$job['uuid']}.zip";
            $this->buildZip((int) $job['user_id'], $zipPath);

            $downloadToken = bin2hex(random_bytes(32));
            $expiresAt = gmdate('Y-m-d H:i:s', time() + self::DOWNLOAD_TTL_HOURS * 3600);
            $this->jobs->markCompleted((int) $job['id'], $zipPath, $downloadToken, $expiresAt);
        } catch (\Throwable $e) {
            $this->jobs->markFailed((int) $job['id'], $e->getMessage());
        }
    }

    private function buildZip(int $userId, string $zipPath): void
    {
        $tmpDir = sys_get_temp_dir() . '/okanelife_export_' . bin2hex(random_bytes(8));
        mkdir($tmpDir, 0770, true);

        $user = (new UserRepository())->findById($userId);
        $incomes = $this->allIncomes($userId);
        $companies = $this->allCompanies($userId);
        $sources = (new IncomeSourceRepository())->listForUser($userId);
        $events = (new EventRepository())->listForUser($userId);
        $milestones = (new MilestoneRepository())->listForUser($userId);

        $manifest = [
            'format' => 'okanelife-export',
            'version' => self::FORMAT_VERSION,
            'created_at' => gmdate('c'),
            'app_version' => '1.0.0',
            'counts' => [
                'incomes' => count($incomes),
                'companies' => count($companies),
                'income_sources' => count($sources),
                'events' => count($events),
                'milestones' => count($milestones),
            ],
        ];

        file_put_contents("{$tmpDir}/manifest.json", self::json($manifest));
        file_put_contents("{$tmpDir}/README.txt", self::readmeText());
        file_put_contents("{$tmpDir}/profile.json", self::json([
            'schema_version' => 1,
            'uuid' => $user['uuid'],
            'name' => $user['name'],
            'email' => $user['email'],
            'birth_date' => $user['birth_date'],
        ]));
        file_put_contents("{$tmpDir}/incomes.json", self::json(['schema_version' => 1, 'items' => $incomes]));
        file_put_contents("{$tmpDir}/incomes.csv", $this->incomesToCsv($incomes));
        file_put_contents("{$tmpDir}/companies.json", self::json(['schema_version' => 1, 'items' => $companies]));
        file_put_contents("{$tmpDir}/income-sources.json", self::json([
            'schema_version' => 1,
            'items' => array_map(fn ($s) => [
                'uuid' => $s['uuid'],
                'name' => $s['name'],
                'category' => $s['category'],
                'is_system' => (bool) $s['is_system'],
            ], $sources),
        ]));
        file_put_contents("{$tmpDir}/events.json", self::json([
            'schema_version' => 1,
            'items' => array_map(fn ($e) => [
                'uuid' => $e['uuid'],
                'title' => $e['title'],
                'description' => $e['description'],
                'event_date' => $e['event_date'],
                'income_uuid' => $e['income_id'] ? ((new IncomeRepository())->findById((int) $e['income_id'])['uuid'] ?? null) : null,
                'company_uuid' => $e['company_id'] ? ((new CompanyRepository())->findById((int) $e['company_id'])['uuid'] ?? null) : null,
            ], $events),
        ]));
        file_put_contents("{$tmpDir}/milestones.json", self::json([
            'schema_version' => 1,
            'items' => array_map(fn ($m) => [
                'type' => $m['type'],
                'value' => $m['value'],
                'achieved_at' => $m['achieved_at'],
            ], $milestones),
        ]));
        file_put_contents("{$tmpDir}/settings.json", self::json([
            'schema_version' => 1,
            'onboarding_completed_at' => $user['onboarding_completed_at'],
            'history_start_choice' => $user['history_start_choice'],
        ]));

        $zip = new \ZipArchive();
        $zip->open($zipPath, \ZipArchive::CREATE | \ZipArchive::OVERWRITE);
        foreach (scandir($tmpDir) as $file) {
            if ($file === '.' || $file === '..') {
                continue;
            }
            $zip->addFile("{$tmpDir}/{$file}", $file);
        }
        $zip->close();

        foreach (scandir($tmpDir) as $file) {
            if ($file !== '.' && $file !== '..') {
                unlink("{$tmpDir}/{$file}");
            }
        }
        rmdir($tmpDir);
    }

    private function allIncomes(int $userId): array
    {
        $stmt = Database::pdo()->prepare(
            'SELECT i.*, s.uuid AS source_uuid, c.uuid AS company_uuid
             FROM incomes i
             LEFT JOIN income_sources s ON s.id = i.source_id
             LEFT JOIN companies c ON c.id = i.company_id
             WHERE i.user_id = ? AND i.deleted_at IS NULL
             ORDER BY i.income_date ASC, i.id ASC'
        );
        $stmt->execute([$userId]);
        return array_map(fn ($row) => [
            'uuid' => $row['uuid'],
            'amount' => $row['amount'] === null ? null : (int) $row['amount'],
            'amount_precision' => $row['amount_precision'],
            'currency' => $row['currency'],
            'income_date' => $row['income_date'],
            'date_precision' => $row['date_precision'],
            'source_uuid' => $row['source_uuid'],
            'company_uuid' => $row['company_uuid'],
            'memo' => $row['memo'],
            'created_at' => $row['created_at'],
        ], $stmt->fetchAll());
    }

    private function allCompanies(int $userId): array
    {
        $stmt = Database::pdo()->prepare(
            'SELECT * FROM companies WHERE user_id = ? AND deleted_at IS NULL ORDER BY id ASC'
        );
        $stmt->execute([$userId]);
        return array_map(fn ($row) => [
            'uuid' => $row['uuid'],
            'name' => $row['name'],
            'memo' => $row['memo'],
        ], $stmt->fetchAll());
    }

    private function incomesToCsv(array $incomes): string
    {
        $lines = ['income_date,amount,amount_precision,date_precision,memo'];
        foreach ($incomes as $income) {
            $lines[] = implode(',', [
                $income['income_date'],
                $income['amount'] ?? '',
                $income['amount_precision'],
                $income['date_precision'],
                '"' . str_replace('"', '""', (string) ($income['memo'] ?? '')) . '"',
            ]);
        }
        return implode("\n", $lines) . "\n";
    }

    private static function json(array $data): string
    {
        return json_encode($data, JSON_PRETTY_PRINT | JSON_UNESCAPED_UNICODE | JSON_UNESCAPED_SLASHES);
    }

    private static function readmeText(): string
    {
        return <<<TEXT
        OKANELIFE データエクスポート

        このZIPには、あなたがOKANELIFEに記録したすべてのデータが含まれています。
        OKANELIFEのサービスが将来利用できなくなった場合でも、このデータはあなた自身のものです。

        manifest.json      : このエクスポート全体のバージョン情報
        profile.json        : プロフィール
        incomes.json/.csv   : 収入の記録（金額・日付は精度情報付き）
        companies.json       : 会社・組織
        income-sources.json : 収入源
        events.json          : 人生のできごと
        milestones.json      : 達成したマイルストーン
        settings.json         : その他の設定

        各JSONファイルには schema_version が含まれます。将来ファイル形式が変わっても、
        バージョンを見ることでどのように読み込むべきか判断できます。

        OAuthのアクセストークンやパスワードなど、秘密情報は含まれていません。
        TEXT;
    }

    public static function storageDir(): string
    {
        return dirname(__DIR__, 2) . '/storage/exports';
    }
}
