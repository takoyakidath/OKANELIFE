<?php

namespace Okanelife\Support;

/**
 * Applies migrations/*.sql in order, tracked in schema_migrations. Shared by
 * bin/migrate.php (CLI, over SSH) and public/migrate.php (HTTP, token-gated
 * — for Lolipop plans without SSH access to a PHP CLI).
 */
final class Migrator
{
    /** @return string[] filenames applied this run */
    public static function run(): array
    {
        $pdo = Database::pdo();

        $pdo->exec(
            'CREATE TABLE IF NOT EXISTS schema_migrations (
                filename VARCHAR(255) NOT NULL PRIMARY KEY,
                applied_at DATETIME NOT NULL
            )'
        );

        $applied = $pdo->query('SELECT filename FROM schema_migrations')
            ->fetchAll(\PDO::FETCH_COLUMN);

        $migrationsDir = __DIR__ . '/../../migrations';
        $files = glob($migrationsDir . '/*.sql');
        sort($files);

        $ranFiles = [];
        foreach ($files as $file) {
            $filename = basename($file);
            if (in_array($filename, $applied, true)) {
                continue;
            }

            $sql = file_get_contents($file);
            $statements = array_filter(array_map('trim', preg_split('/;\s*(\n|$)/', $sql)));

            $pdo->beginTransaction();
            try {
                foreach ($statements as $statement) {
                    $pdo->exec($statement);
                }
                $insert = $pdo->prepare(
                    'INSERT INTO schema_migrations (filename, applied_at) VALUES (?, ?)'
                );
                $insert->execute([$filename, Database::now()]);
                $pdo->commit();
                $ranFiles[] = $filename;
            } catch (\Throwable $e) {
                $pdo->rollBack();
                throw new \RuntimeException("Failed applying {$filename}: {$e->getMessage()}", 0, $e);
            }
        }

        return $ranFiles;
    }
}
