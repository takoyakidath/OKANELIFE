<?php

/**
 * HTTP migration trigger for Lolipop plans where SSH can't run the PHP
 * CLI. Open this URL in a browser (or curl it) after an FTP deploy that
 * adds new files under migrations/. Requires ?token=<MIGRATE_TOKEN>,
 * checked with a constant-time comparison against api/.env.
 *
 * Prefer `php bin/migrate.php` over SSH when it's available — this exists
 * only for plans without it.
 */

require __DIR__ . '/../bootstrap.php';

use Okanelife\Support\Env;
use Okanelife\Support\Migrator;

header('Content-Type: text/plain; charset=utf-8');

$expected = Env::get('MIGRATE_TOKEN', '');
$given = $_GET['token'] ?? '';

if ($expected === '' || !hash_equals($expected, (string) $given)) {
    http_response_code(403);
    echo "forbidden\n";
    exit;
}

try {
    $ran = Migrator::run();
} catch (\RuntimeException $e) {
    error_log('migrate: ' . $e->getMessage());
    http_response_code(500);
    echo "Migration failed. Check the server error log for details.\n";
    exit;
}

foreach ($ran as $filename) {
    echo "Applied {$filename}\n";
}
echo $ran ? "Migrations complete.\n" : "Already up to date.\n";
