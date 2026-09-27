<?php

require __DIR__ . '/../bootstrap.php';

use Okanelife\Support\Database;

$pdo = Database::pdo();

$pdo->exec(
    'CREATE TABLE IF NOT EXISTS schema_migrations (
        filename VARCHAR(255) NOT NULL PRIMARY KEY,
        applied_at DATETIME NOT NULL
    )'
);

$applied = $pdo->query('SELECT filename FROM schema_migrations')
    ->fetchAll(PDO::FETCH_COLUMN);

$migrationsDir = __DIR__ . '/../migrations';
$files = glob($migrationsDir . '/*.sql');
sort($files);

$ranAny = false;
foreach ($files as $file) {
    $filename = basename($file);
    if (in_array($filename, $applied, true)) {
        continue;
    }

    $sql = file_get_contents($file);
    $statements = array_filter(array_map('trim', preg_split('/;\s*(\n|$)/', $sql)));

    echo "Applying {$filename}...\n";
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
        $ranAny = true;
    } catch (\Throwable $e) {
        $pdo->rollBack();
        fwrite(STDERR, "Failed applying {$filename}: {$e->getMessage()}\n");
        exit(1);
    }
}

echo $ranAny ? "Migrations complete.\n" : "Already up to date.\n";
