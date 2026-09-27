<?php

/**
 * Dependency-free test runner (no PHPUnit/Composer — see docs/DESIGN.md
 * §9). Each *Test.php file in this directory returns an array of
 * [name => callable] cases. Run with: php tests/run.php
 */

require __DIR__ . '/../bootstrap.php';
require __DIR__ . '/support.php';

use Okanelife\Support\Database;
use Okanelife\Support\Env;

Env::set('JWT_SECRET', 'test-secret-key-not-for-production');
Env::set('GOOGLE_CLIENT_ID', 'test-client-id');
Env::set('DB_DRIVER', 'sqlite');

function fresh_test_database(): void
{
    $pdo = new PDO('sqlite::memory:');
    $pdo->setAttribute(PDO::ATTR_ERRMODE, PDO::ERRMODE_EXCEPTION);
    $pdo->exec('PRAGMA foreign_keys = ON');
    $schema = file_get_contents(__DIR__ . '/schema.sqlite.sql');
    foreach (array_filter(array_map('trim', explode(";\n", $schema))) as $statement) {
        if (trim($statement) !== '') {
            $pdo->exec($statement);
        }
    }
    Database::setPdo($pdo, 'sqlite');
}

$files = glob(__DIR__ . '/*Test.php');
sort($files);

$total = 0;
$failures = 0;

foreach ($files as $file) {
    $cases = require $file;
    if (!is_array($cases)) {
        continue;
    }
    foreach ($cases as $name => $case) {
        $total++;
        fresh_test_database();
        try {
            $case();
            echo "  ok  - {$name}\n";
        } catch (\Throwable $e) {
            $failures++;
            echo "FAIL  - {$name}\n";
            echo "        {$e->getMessage()}\n";
            echo "        {$e->getFile()}:{$e->getLine()}\n";
        }
    }
}

echo "\n{$total} tests, " . ($total - $failures) . " passed, {$failures} failed.\n";
exit($failures > 0 ? 1 : 0);
